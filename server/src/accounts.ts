// Accounts — durable identity for one cohort (A2.6).
//
// WHAT AN ACCOUNT IS, AND WHAT IT DELIBERATELY IS NOT. An account is PURE
// INDIRECTION: one bearer key pointing at one run token. Nothing is rebound
// when a run is claimed, and nothing about the run moves. The anonymous token
// A1 minted is promoted from CREDENTIAL to SEAT ID and keeps every storage key
// it already owns (`run:`, `studies:`, `missions:`, `projects:`, `proposals:`,
// `report:`, `voice:`, `offerYear:`, and the `civToken:` reverse map). It has
// to: `onBecome` derives `civ-p-${token.slice(0, 12)}`, so the civilization's
// identity is a FUNCTION of the seat id, and rebinding a claimed run to a new
// id would orphan the civ that run is about. Rotate the ACCOUNT KEY; never the
// seat id.
//
// THE TABLE LIVES INSIDE THE COHORT'S OWN DURABLE OBJECT, which is what makes
// "one seat per account" a UNIQUE INDEX rather than a convention: there is one
// DO per cohort, so the scope of the uniqueness claim is exactly the scope of
// the table. A second cohort would need an external registry, and that is not
// built here (a2.6 risk 2).
//
// STORAGE, NOT MIGRATION. The `Cohort` class is already SQLite-backed
// (wrangler.jsonc `migrations[1]`), so `ctx.storage.sql` is available today,
// typed, with no config change. These tables are created at runtime with
// CREATE TABLE IF NOT EXISTS, which is not a Durable Object migration and does
// not touch the migration list — CLAUDE.md's Cloudflare-10211 preview warning
// is about adding a DO CLASS and has nothing to say about a table.
//
// THE KEY IS STORED IN PLAINTEXT, and that is a decision rather than an
// oversight. Hashing would defend against an attacker who has already taken
// the Durable Object, which is a threat model in which the run records are
// gone anyway; plaintext buys `showAccountKey`, and re-display is the ONLY
// safety net a v1 with no recovery has. If recovery ever lands, switch to
// sha256 and drop the re-display in the same change.
//
// NOTHING HERE EVER LOGS. Not the key, not the run token, not a prefix of
// either. The functions below return rows and the callers answer in error
// CODES; there is no string in this module that carries a secret and no reason
// to add one.

/**
 * Crockford base32, the alphabet as published: the ten digits and the
 * consonant-ish letters, with I, L, O and U removed. I/L/O go because they
 * read as 1/1/0 on a phone screen (`normalizeAccountKey` maps them back rather
 * than rejecting them, which is the whole reason to use this alphabet), and U
 * goes because it turns a random string into an accidental obscenity often
 * enough to be worth the bit.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Symbols in a key. 20 × 5 bits = 100 bits of entropy. */
export const ACCOUNT_KEY_SYMBOLS = 20;

/** Symbols per hyphen-separated group in the display form. */
const DISPLAY_GROUP = 5;

/**
 * The schema, as three separate statements because `exec` runs one.
 *
 * There is NO `civ_id` column, on purpose. The only path from an account to a
 * civilization is account_key -> run_token -> `run:${run_token}`.civId, and
 * keeping it the only path is what makes "an account can never leak across
 * civilizations" structural rather than careful: a second column would be a
 * second answer, and two answers drift. It also lets a run be claimed
 * mid-ceremony, before any civ exists to record.
 *
 * There is no `claimed_tokens` table either. "Is this seat already claimed?"
 * is a SELECT by run_token, which the unique index answers in one probe.
 */
const DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
     account_id  TEXT PRIMARY KEY,
     account_key TEXT NOT NULL,
     run_token   TEXT NOT NULL,
     created_ms  INTEGER NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS accounts_key ON accounts(account_key)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS accounts_run_token ON accounts(run_token)`,
];

/**
 * One row, exactly as the table holds it. A type alias rather than an
 * interface because `SqlStorage.exec<T>` constrains T to
 * `Record<string, SqlStorageValue>`, and only an alias gets the implicit index
 * signature that satisfies it.
 *
 * `account_id` is internal and NEVER reaches the wire: the client learns
 * `account: boolean` and, on exactly one message, the key itself.
 */
export type AccountRow = {
  readonly account_id: string;
  readonly account_key: string;
  readonly run_token: string;
  readonly created_ms: number;
};

const SELECT_COLUMNS = "account_id, account_key, run_token, created_ms";

/**
 * Create the tables if they are not there. `exec` is SYNCHRONOUS, which is why
 * the caller can guard this with a plain boolean flag and never race: there is
 * no await between the test and the creation.
 */
export function ensureAccountSchema(sql: SqlStorage): void {
  for (const statement of DDL) sql.exec(statement);
}

/**
 * A fresh key: 20 Crockford symbols, 100 bits, uniform.
 *
 * `b % 32` is EXACTLY uniform here and not approximately so, because 256 is a
 * whole multiple of 32 — the usual modulo bias does not exist at this
 * alphabet size, so there is no rejection loop and nothing to get wrong.
 */
export function mintAccountKey(): string {
  const bytes = new Uint8Array(ACCOUNT_KEY_SYMBOLS);
  crypto.getRandomValues(bytes);
  let key = "";
  for (const b of bytes) key += CROCKFORD.charAt(b % CROCKFORD.length);
  return key;
}

/**
 * A typed key from a human. Uppercases, folds the three read-alike letters
 * (O -> 0, I -> 1, L -> 1), drops everything the alphabet does not contain —
 * so the display hyphens, spaces, and a stray tab all pass through harmlessly
 * — and then requires EXACTLY 20 symbols. Returns null otherwise.
 *
 * Dropping rather than rejecting unknown characters is the friendly reading of
 * "typed it with the hyphens in", and it costs nothing: a key that normalizes
 * to the wrong 20 symbols simply misses the unique index, which is the same
 * answer as a key that was never valid. Callers report both as `bad-account`.
 */
export function normalizeAccountKey(raw: string): string | null {
  let out = "";
  for (const ch of raw.toUpperCase()) {
    const folded = ch === "O" ? "0" : ch === "I" || ch === "L" ? "1" : ch;
    if (!CROCKFORD.includes(folded)) continue;
    out += folded;
    // Bail the moment it cannot be a key: a caller's parse bound already caps
    // the input, and this caps the work regardless of what that bound becomes.
    if (out.length > ACCOUNT_KEY_SYMBOLS) return null;
  }
  return out.length === ACCOUNT_KEY_SYMBOLS ? out : null;
}

/**
 * The display form: four groups of five, hyphen-separated. The canonical
 * grouping lives here so the key sheet and the key itself cannot disagree
 * about where the breaks go. The WIRE always carries the bare 20 symbols;
 * this is for a human copying it onto paper.
 */
export function formatAccountKey(key: string): string {
  const groups: string[] = [];
  for (let i = 0; i < key.length; i += DISPLAY_GROUP) {
    groups.push(key.slice(i, i + DISPLAY_GROUP));
  }
  return groups.join("-");
}

/**
 * Sign-in's whole comparison. It is an INDEX PROBE and not a JS string
 * compare in a handler, which is the point: there is no place in this server
 * where a submitted key is walked against a stored one.
 */
export function findAccountByKey(sql: SqlStorage, key: string): AccountRow | null {
  const rows = sql
    .exec<AccountRow>(`SELECT ${SELECT_COLUMNS} FROM accounts WHERE account_key = ?`, key)
    .toArray();
  return rows[0] ?? null;
}

/** "Is this seat claimed, and by which account?" — one probe on the second
 *  unique index. The `hello` path uses it to refuse a claimed token, and
 *  `showAccountKey` uses it to find the key a signed-in seat may re-read. */
export function findAccountByRunToken(sql: SqlStorage, runToken: string): AccountRow | null {
  const rows = sql
    .exec<AccountRow>(`SELECT ${SELECT_COLUMNS} FROM accounts WHERE run_token = ?`, runToken)
    .toArray();
  return rows[0] ?? null;
}

/**
 * Mint a key and bind it to this seat. Returns the row, or null when the
 * INSERT hit a unique index — which the caller answers with `already-claimed`.
 *
 * THE FAILURE IS THE POINT. Two connections on one seat can both pass the
 * "already claimed?" SELECT and arrive here; the index is what decides, and
 * the loser is told the truth rather than being handed a second key to the
 * same run. (A collision on `accounts_key` instead of `accounts_run_token`
 * would land in the same branch. At 100 bits that is not a case anybody will
 * ever see, and the answer it produces — "this is already claimed, ask for the
 * key" — is harmless if they somehow do.)
 */
export function createAccount(
  sql: SqlStorage,
  runToken: string,
  nowMs: number,
): AccountRow | null {
  const row: AccountRow = {
    account_id: crypto.randomUUID(),
    account_key: mintAccountKey(),
    run_token: runToken,
    created_ms: nowMs,
  };
  try {
    sql.exec(
      `INSERT INTO accounts (account_id, account_key, run_token, created_ms) VALUES (?, ?, ?, ?)`,
      row.account_id,
      row.account_key,
      row.run_token,
      row.created_ms,
    );
  } catch {
    // Deliberately blind: the only constraint on this table is uniqueness, so
    // the only thing an INSERT can fail for is the race above. Nothing about
    // the error is inspected and nothing about it is logged, because the row
    // that failed carries a secret.
    return null;
  }
  return row;
}

/** What a limiter is willing to spend. `windowMax`/`windowMs` together add an
 *  object-wide rolling window on top of the per-connection budget; omit both
 *  for a per-connection budget alone. */
export interface AttemptLimits {
  readonly perConn: number;
  readonly windowMax?: number;
  readonly windowMs?: number;
}

/**
 * The rate limits, in memory, per Durable Object instance.
 *
 * IN MEMORY IS THE DECISION. These reset when the object restarts, and at 100
 * bits of key that is fine: the limiter exists to make guessing pointless
 * rather than to make it impossible, and an attacker who can force restarts
 * still faces a search space that no amount of restarting shortens. Persisting
 * a counter would buy a rounding error's worth of security and cost a storage
 * write on every wrong key, which is exactly the wrong shape.
 *
 * There is NO artificial delay anywhere. A failed sign-in answers immediately;
 * slowing it down would teach the guesser nothing and would only ever punish
 * the person who mistyped their own key.
 */
export class AttemptLimiter {
  private readonly perConn = new Map<string, number>();
  /** Timestamps of object-wide attempts, oldest first. */
  private readonly window: number[] = [];

  constructor(private readonly limits: AttemptLimits) {}

  /** True when this connection's own budget is spent — the caller closes it. */
  connSpent(connId: string): boolean {
    return (this.perConn.get(connId) ?? 0) >= this.limits.perConn;
  }

  /** True when this attempt may not be made at all: either this connection is
   *  spent, or the whole object's rolling window is. */
  exhausted(connId: string, nowMs: number = Date.now()): boolean {
    if (this.connSpent(connId)) return true;
    const { windowMax, windowMs } = this.limits;
    if (windowMax === undefined || windowMs === undefined) return false;
    this.prune(nowMs, windowMs);
    return this.window.length >= windowMax;
  }

  /** Charge one attempt to this connection and to the object-wide window. */
  record(connId: string, nowMs: number = Date.now()): void {
    this.perConn.set(connId, (this.perConn.get(connId) ?? 0) + 1);
    const { windowMs } = this.limits;
    if (windowMs === undefined) return;
    this.prune(nowMs, windowMs);
    this.window.push(nowMs);
  }

  /** A closed socket's budget is not worth remembering; forgetting it is also
   *  what keeps the map from growing for the life of the object. Note that
   *  this does NOT unwind the object-wide window: reconnecting is free, and
   *  guessing in a loop of fresh connections still burns the shared budget. */
  forget(connId: string): void {
    this.perConn.delete(connId);
  }

  private prune(nowMs: number, windowMs: number): void {
    const cutoff = nowMs - windowMs;
    while (this.window.length > 0 && (this.window[0] ?? 0) <= cutoff) this.window.shift();
  }
}

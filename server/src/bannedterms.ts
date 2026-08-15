// GENERATED FILE — do not edit by hand.
//
// Source: docs/prose-style.md §6 (one block per source: banks, vinge, robinson, schroeder)
// plus §8's comms register. Regenerate with `npm run sync:banned`; verify with
// `npm run audit:banned`, which CI runs beside typecheck.
//
// The runtime projection of a doc-level grep: stylegate.ts is the only
// consumer, and it is the one place a generated line meets §6 before a
// player does. Every rule is compiled CASE-SENSITIVELY unless its `flags`
// say otherwise — §6 is written as grep input and several of its rules turn
// on case (\bMind\b is a ship-AI class noun; lowercase mind is core Holos
// vocabulary).

export interface BannedRule {
  /** Regex source, verbatim from the guide. */
  readonly source: string;
  /** Regex flags. Empty means case-sensitive, which is §6's own reading. */
  readonly flags: string;
  /** Where the rule comes from, and any innocent sense the guide allows. */
  readonly note: string;
}

export const BANNED_RULES: readonly BannedRule[] = [
  { source: "\\bthe Culture\\b", flags: "", note: "banks" },
  { source: "\\bSublim(e|ed|ing)\\b", flags: "", note: "banks" },
  { source: "\\bOrbital\\b", flags: "", note: "banks — the megastructure sense; lowercase orbit/orbital period OK" },
  { source: "\\bGSV\\b|\\bGCU\\b|\\bROU\\b|\\bGOU\\b|\\bLSV\\b|\\bMSV\\b", flags: "", note: "banks" },
  { source: "\\bSpecial Circumstances\\b", flags: "", note: "banks" },
  { source: "\\bContact\\b", flags: "", note: "banks — the org sense; the game's contact/first-contact mechanic OK" },
  { source: "\\bgland(s|ing)?\\b", flags: "", note: "banks — the drug-gland verb sense" },
  { source: "\\bdrone\\b", flags: "", note: "banks — the sapient-machine class sense" },
  { source: "\\bMind\\b", flags: "", note: "banks — capital-M ship-AI class noun; lowercase mind is core Holos vocabulary" },
  { source: "\\bknife missile\\b", flags: "", note: "banks" },
  { source: "\\beffector\\b", flags: "", note: "banks" },
  { source: "\\bdisplacer\\b", flags: "", note: "banks" },
  { source: "\\blazy gun\\b", flags: "", note: "banks" },
  { source: "\\bIdiran\\b|\\bAffront\\b|\\bChelgrian\\b|\\bHomomda\\b", flags: "", note: "banks" },
  { source: "Dra.?Azon", flags: "", note: "banks" },
  { source: "Schar'?s World", flags: "", note: "banks" },
  { source: "Vavatch", flags: "", note: "banks" },
  { source: "\\bChanger\\b", flags: "", note: "banks — the shapeshifter species sense; ordinary change/changer OK" },
  { source: "\\bCulture ship\\b", flags: "", note: "banks" },
  { source: "Horza", flags: "", note: "banks" },
  { source: "Balveda", flags: "", note: "banks" },
  { source: "Clear Air Turbulence", flags: "", note: "banks" },
  { source: "\\bAzad\\b", flags: "", note: "banks — the Banks game-empire; no ordinary-English collision expected" },
  { source: "Azadian", flags: "", note: "banks" },
  { source: "Gurgeh", flags: "", note: "banks" },
  { source: "Flere.?Imsaho|Mawhrin.?Skel", flags: "", note: "banks" },
  { source: "Zakalwe", flags: "", note: "banks" },
  { source: "\\bSma\\b", flags: "", note: "banks — Use of Weapons character name" },
  { source: "Skaffen.?Amtiskaw", flags: "", note: "banks" },
  { source: "\\bChairmaker\\b|Staberinde", flags: "", note: "banks" },
  { source: "\\bExcession\\b", flags: "", note: "banks — the title coinage itself" },
  { source: "Outside Context Problem", flags: "", note: "banks" },
  { source: "Interesting Times Gang", flags: "", note: "banks" },
  { source: "Sleeper Service|Grey Area", flags: "", note: "banks — Excession ship names; ordinary \"grey area\" idiom needs case-sensitive review" },
  { source: "War in Heaven", flags: "", note: "banks — the Surface Detail coinage" },
  { source: "Lededje|Veppers|Demeisen", flags: "", note: "banks" },
  { source: "Falling Outside The Normal", flags: "", note: "banks" },
  { source: "Qeng Ho", flags: "", note: "vinge" },
  { source: "\\bFocus(ed|ing)?\\b", flags: "", note: "vinge — the mind-slavery sense; ordinary focus/focused OK" },
  { source: "\\bziphead(s)?\\b", flags: "", note: "vinge" },
  { source: "\\bEmergent(s)?\\b", flags: "", note: "vinge — the faction sense; lowercase emergent adjective OK" },
  { source: "\\bOnOff\\b", flags: "", note: "vinge" },
  { source: "\\blocalizer(s)?\\b", flags: "", note: "vinge" },
  { source: "\\bmindrot\\b", flags: "", note: "vinge" },
  { source: "Pham Nuwen|\\bPham\\b", flags: "", note: "vinge" },
  { source: "Sura Vinh", flags: "", note: "vinge" },
  { source: "Ezr Vinh", flags: "", note: "vinge" },
  { source: "Tomas Nau", flags: "", note: "vinge" },
  { source: "Ritser Brughel", flags: "", note: "vinge" },
  { source: "Anne Reynolt", flags: "", note: "vinge" },
  { source: "Trixia Bonsol", flags: "", note: "vinge" },
  { source: "Sherkaner|Underhill", flags: "", note: "vinge" },
  { source: "Arachna", flags: "", note: "vinge" },
  { source: "Brisgo Gap", flags: "", note: "vinge" },
  { source: "Namqem", flags: "", note: "vinge" },
  { source: "\\bthe Deepness\\b", flags: "", note: "vinge — the title coinage as an in-world name; see N-4" },
  { source: "programmer.?archaeolog", flags: "", note: "vinge" },
  { source: "Zones? of Thought", flags: "", note: "vinge" },
  { source: "Slow Zone", flags: "", note: "vinge" },
  { source: "Aurora", flags: "", note: "robinson — the destination-world name; ordinary aurora (borealis/australis) OK — case-sensitive, human-cleared" },
  { source: "Devi", flags: "", note: "robinson" },
  { source: "Freya", flags: "", note: "robinson" },
  { source: "Badim", flags: "", note: "robinson" },
  { source: "Euan", flags: "", note: "robinson" },
  { source: "Jochi", flags: "", note: "robinson" },
  { source: "\\block.?step\\b", flags: "", note: "schroeder — the title coinage as an in-world name; the netcode sense (deterministic simulation) is innocent in code commentary" },
  { source: "cicada.?bed", flags: "", note: "schroeder" },
  { source: "\\bdenner(s)?\\b", flags: "", note: "schroeder" },
  { source: "McGonigal", flags: "", note: "schroeder" },
  { source: "Toby Wyatt", flags: "", note: "schroeder" },
  { source: "\\bEvayne\\b", flags: "", note: "schroeder" },
  { source: "\\bCorva\\b", flags: "", note: "schroeder" },
  { source: "\\bThisbe\\b", flags: "", note: "schroeder — the world; Ovid's Thisbe stays legal" },
  { source: "\\bLowdown\\b", flags: "", note: "schroeder — the world sense; lowercase \"the lowdown\" idiom OK" },
  { source: "\\bjubilee\\b", flags: "", note: "schroeder — as the in-world name of the aligned-calendar event; plain English jubilee OK" },
  { source: "Emperor of Time", flags: "", note: "schroeder" },
  { source: "\\bletter(s)?\\b", flags: "i", note: "comms register, prose-style.md §8" },
  { source: "\\bcorrespondence\\b", flags: "i", note: "comms register, prose-style.md §8" },
];

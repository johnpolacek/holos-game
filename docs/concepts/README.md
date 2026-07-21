# Concept art — the board

*Curated concept mockups for art-direction. These are **reference, not
shipped assets** — nothing here is loaded by the game. Production assets
(the real sprites, fonts, textures, and the star catalog the Pixi client
renders) live under `client/`, never here.*

> Generated from [../ui-image-brief.md](../ui-image-brief.md); judged
> against [../ui-design.md](../ui-design.md).

---

## What goes here

- **Only decisions.** Commit the renders you've *adopted* or are actively
  weighing — not every generation and not the rejects. Generator PNGs are
  ~1–2 MB each and git keeps every version forever, so the exploration
  firehose belongs outside the repo (a drive / Figma / Notion board); a
  handful of blessed frames belong here.
- **Naming:** `GG-NN-screen-name.png` — `GG` groups by act (`00` = style &
  components, `01` = Act 1, `02` = the pivot / Act 2, `03` = Act 3), `NN`
  orders within the group and maps to the screen in ui-image-brief.md's act
  sections. (The style tile is the lone group-00 asset, `00-style-tile.png`.)
  Grouping mirrors the brief's own act split, so each image sits next to the
  prompt that made it.
- **The status table below is the decision log** — *which* render we
  picked and *why*, including the fidelity notes from the design review.
  Keep it current; it is the point of this folder.

## Status

| Screen | File | Status | Notes |
|---|---|---|---|
| Style tile | `00-style-tile.png` | **Adopted** — sref anchor | Best realization of the brief; palette/type dead-on; the two choice cards read as stay-dark vs act, with the *act* card ember (spending visibility) — color doing meaning. Use as the `--sref` for the rest of the set. |
| Session zero — world reveal | `01-01-world-reveal.png` | **Adopted** — in repo | Tidally-locked terminator world rendered correctly — the grounding pillar as an image. Caveat (logged in ui-design.md): session-zero fields must be generated from the cradle's real profile, not placeholder numbers (the mock's "1.37 AU" contradicts a red-dwarf tidal lock), and should lead with fingerprint facts (gravity, the fixed sun) over orbital elements. This mock is a *layout* target, not a data source. |
| Act 1 — beat, decision moment | `01-02-decision-moment.png` | **Adopted** — in repo | The beat frame's decision movement (brief screen 2): garden cards cool, the intervention card ember. Feeds M1.2. |
| Act 1 — the roll | `01-03-the-roll.png` | **Adopted** — in repo | The roll movement (brief screen 3) — the Act-1-only signature interaction. Feeds M1.2. |
| First sky / contact | *(not in repo)* | **Superseded** — reference only | Beautiful but off-model: a K-type star drawn as a spiral galaxy (breaks the grounding pillar + "no galaxies-as-stars"), a 2D diagram rather than the 3D Model, missing light-age/belief epistemics, and v1-illegal choices ("Strengthen Defenses"; hail-vs-broadcast collapsed into "Send a Greeting"). Kept as a lesson, not a candidate. |
| Session zero — inheritance | *(pending add)* | **Adopted** | Keeping the original render — layout, succession feeling, and charters all land (the strongest emotional hit of the set; it beats the inherited-vs-owned risk). Its dial labels (Ritual/Tide/Memory…) are **placeholder text**; the real UI renders the pinned in-world set from data — **Reach·Depth, Voice·Silence, Garden·Forge, Monolith·Chorus, Memory·Renewal** (act2-design.md § In-world labels) — and archetypes stay canonical (Herald ✓; the render's Keeper/Gardener → Monument/Shepherd). Add as `03-00-inheritance.png`. |
| Act 3 — Sky + source card | *(pending add)* | **Adopted — one build note** | Screen 7. Nails the emptiness (the Teeming Dark thesis), the age chip, belief+confidence (DARK NODE · 71%), the sharpening thumbnail — and avoids the galaxy trap. Build fix: the light-history scrubber runs symmetrically into the future (−300…+300 Y), but a source card shows *received* light, which is past-only — anchor "now" at the right edge (or, if it's the Model's global time-scrub, render the future half as extrapolation with growing fuzz, not an equal ruler; act3-map.md § Time, scrubbable — the map is the past). Add as `03-01-sky-source-card.png`. |
| Act 3 — the Model pull-back | *(generate next)* | **Wanted now — A1** | ui-image-brief.md screen 13. The 3D sky wow moment; A1's core. The echo shell (screen 14, the poster) is worth generating early too since it defines the Model's look, though it's technically A3. |
| Act 3 — contact, expansion, sleep | — | Wanted soon (A2–A5) | Screens 8–12 (choice ceremony, letters, Ledger, sleep, wake). Generate as those slices approach. |
| The pivot · Act 2 | — | Phase B — wait | Screens 4–6, plus the world-reveal variants across contrasting cradle types, belong to the origin path (Phase B). The three adopted Act 1 renders above stay adopted; their build slice just moved later. |

## Adding an image

```sh
# name it {group}-{seq}-name, then log it in the table above
cp <render>.png docs/concepts/01-04-world-reveal-oceanworld.png
git add docs/concepts/01-04-world-reveal-oceanworld.png
```

Then update the table's **File** and **Status**, and add one line on why it
won (or what's still wrong). An image without a table row is noise; a row
without a rationale is just a filename.

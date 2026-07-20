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
- **Naming:** `NN-screen-name.png`, where `NN` is the screen number in
  ui-image-brief.md (`00` = style tile, `01` = world reveal, …). This
  keeps each image next to the prompt that made it.
- **The status table below is the decision log** — *which* render we
  picked and *why*, including the fidelity notes from the design review.
  Keep it current; it is the point of this folder.

## Status

| # | Screen | File | Status | Notes |
|---|---|---|---|---|
| 00 | Style tile | `00-style-tile.png` | **Adopted** — sref anchor | Best realization of the brief; palette/type dead-on; the two choice cards read as stay-dark vs act, with the *act* card ember (spending visibility) — color doing meaning. Use as the `--sref` for the rest of the set. |
| 01 | Session zero — world reveal | *(pending add)* | **Adopted (image not yet in repo)** | Tidally-locked terminator world rendered correctly — the grounding pillar as an image. Caveat logged in ui-design.md: session-zero data fields must be generated from the cradle's real profile, not placeholder numbers (the mock's "1.37 AU" contradicts a red-dwarf tidal lock), and should lead with fingerprint facts (gravity, the fixed sun) over orbital elements. |
| 02 | First sky / contact | *(not kept)* | **Superseded — reference only** | Beautiful but off-model: a K-type star drawn as a spiral galaxy (breaks the grounding pillar + "no galaxies-as-stars"), a 2D diagram rather than the 3D Model, missing light-age/belief epistemics, and v1-illegal choices ("Strengthen Defenses"; hail-vs-broadcast collapsed into "Send a Greeting"). Kept as a lesson, not a candidate. |
| 03–15 | remaining screens | — | Not yet generated | See ui-image-brief.md prompts 2–15 (the Model pull-back, the light-echo shell, letters in flight, etc.). |

## Adding an image

```sh
# name it by its screen number, then log it in the table above
cp <render>.png docs/concepts/01-world-reveal.png
git add docs/concepts/01-world-reveal.png
```

Then update the row's **File** and **Status**, and add one line on why it
won (or what's still wrong). An image without a table row is noise; a row
without a rationale is just a filename.

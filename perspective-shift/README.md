# Perspective Shift

A meditative 3D puzzle game of impossible geometry. Turn a floating isometric
structure until paths that cannot possibly connect line up — and then walk
across them.

There is no timer, no death and no fail state. Getting stuck just means you
have not found the angle yet.

---

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Types only |
| `npm run test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |

**Deep links.** `?level=ch3-4` opens a specific level; `?daily=1` opens today's
generated puzzle. Handy for sharing a puzzle and for driving the game in tests.

---

## The central idea

Everything rests on one decision: **visual geometry and the walkable graph are
completely separate.**

- **Blocks** (`Block`) are decoration. They cast shadows and sell the illusion.
  Gameplay never reads them.
- **Nodes** (`WalkNode`) are explicit walkable points, each with a position and
  an `up` normal.
- **Edges** (`Edge`) are the mechanic. An edge may be gated on rotation, on a
  switch flag, or on a moving platform's cycle position.

Because the graph is explicit data rather than something derived from geometry,
every mechanic in the game is expressible without new engine code:

| Mechanic | How it is expressed |
|---|---|
| The core illusion | `kind: 'aligned'` + `requiresYaw` — walkable only at that angle |
| Gravity flip | A node whose `up` points down, or sideways. Nothing else changes |
| Moving platforms | A `group` with motion; nodes tagged with it ride along |
| Timed connections | `requiresPhase` — a window in the group's cycle |
| Switches | `requiresFlag` / `requiresFlagOff` |
| Second rotation axis | `requiresPitch`, on levels that set `allowPitch` |

The connection rule is therefore a **pure function** of
`(level, yaw, pitch, flags, phases)`. That purity is what makes the solvability
checker and the daily-puzzle verifier possible.

### Two notions of rotation

Rotation is tracked twice, on purpose:

- **Continuous** (`visualYaw`) drives the 3D transform. It lives in a mutable
  controller updated inside `useFrame`, so spinning the world never triggers a
  React render.
- **Snapped** (a multiple of 15°) is the only angle gameplay ever sees.

Gameplay reads the snapped angle so runtime behaviour is *identical* to what
the solver proved. The continuous angle is used only for rendering and for the
"bridge forming" shimmer as you approach an alignment. Movement is accepted
only once rotation has settled, so the character never walks a bridge whose
geometry is still mid-swing.

### The character lives in structure-local space

The orb is a child of the rotating structure group. Turning the world carries
it along, so no movement maths ever accounts for rotation — the same reason
Monument Valley's geometry reads correctly. The camera is **orthographic** and
never moves during play; perspective foreshortening would break the illusion
outright, since an Escher join only reads when parallel lines stay parallel.

---

## Layout

```
src/
  components/      World, Structure, Bridge, Character, Portal, Switch,
                   NodeTargets, GhostPath, DustMotes, hud/
  systems/         connections, pathfinding, solvability, levelLoader,
                   rotation, groups, runtime, bounds, hint, generator,
                   audio, photo, input
  data/            palettes, skins, levels, modules/kit, chapters/1..5
  store/           useGameStore, useProgressStore, useSettingsStore, useUiStore
  types/           the domain model
tests/             connections, pathfinding, solvability, levelLoader,
                   rotation, geometry, levels, generator, game
```

**What lives where, and why.** The store holds only *discrete* state — which
node the character stands on, switch flags, rotation count, level status —
because those change rarely and should re-render the UI. Rotation angles and
platform phases change every frame and live in `WorldRuntime`, a plain mutable
object that `useFrame` advances while mutating three.js transforms in place.
Holding those in React state would re-render the whole scene sixty times a
second.

---

## Authoring levels

Levels are composed from reusable modules rather than hand-placed block by
block (`data/modules/kit.ts`). A module emits its decoration, its walkable
nodes and the edges chaining them in one call, so an author only writes the
interesting part — which ends connect, and at what angle.

```ts
const b = new LevelBuilder('ch1-1', 1, 1, 'First Light');
const near = b.walkway('a', [0, 0, 0], 'x+', 4);
const far  = b.walkway('c', [8, 0, 0], 'x+', 4, { tone: 'raised' });
b.pillar([0, -1, 0], 3).pillar([3, -1, 0], 3);

b.alignedLink(near[3], far[0], 90);   // the illusion
b.start(near[0]).exit(far[3]);
b.hint('Drag anywhere to turn the world. Watch the gap.');
```

Available modules: `walkway`, `staircase`, `pad`, `ring`, `underside` (ceiling
walking), `wallway` (wall walking), `pillar`, `arch`, `crystals`. Links:
`link`, `alignedLink`, `flagLink`, `phaseLink`, `alignedFlagLink`.

Add a chapter by writing `data/chapters/chapterN.ts` and adding one entry to
`LEVELS_BY_CHAPTER` and one palette to `data/palettes.ts`.

### Invariants the validator enforces

`validateLevel` is strict on purpose: a broken level *looks* fine and is
quietly impossible, which is the hardest bug to find by playing. It rejects

- dangling node references, duplicate ids, self-loops
- an `aligned` edge with no angle, or a `fixed` edge that has one
- a rotation no snap position can reach, or a tilt beyond the ±60° limit
- a tolerance wide enough to span two adjacent snap positions
- a flag no switch drives, or a phase window with no group
- an edge joining a moving assembly to something that does not move with it
  without a phase window
- an edge joining **two independently moving assemblies**, which a single phase
  window cannot describe

---

## Testing

290 tests. The interesting ones are not the unit tests:

- **`solvability.test.ts`** — the checker itself, including that it reports
  *truncation* rather than silently claiming "unsolvable".
- **`levels.test.ts`** — every one of the 30 shipped levels is structurally
  valid and provably finishable, plus the difficulty curve (Chapter 1 is
  rotation only, tilt appears no earlier than Chapter 4).
- **`geometry.test.ts`** — the gap the solver cannot see. It reasons about the
  *graph*, so it happily certifies a level where a platform's dock opens while
  the platform is somewhere else entirely: provably solvable, visibly broken.
  This checks that ungated edges join tiles within stepping distance and that
  phase-gated docks really are adjacent during the window they claim.
- **`game.test.ts`** — all 30 levels driven to completion through the real
  store: rotations settle, moves are accepted, switches fire on arrival,
  platforms get boarded, levels report themselves complete.
- **`generator.test.ts`** — every daily puzzle for a full year is valid,
  solvable, non-trivial and distinct.

### How the solver works

`solve()` searches `(standing node × switch flags × yaw × pitch)`. Four
modelling choices keep it exact and fast:

1. **A rotation is one action, not one snap step.** A flick to 90° costs the
   same as a flick to 15°. Counting intermediate snaps would report a
   four-alignment level as "30 rotations", which is not what anyone means.
2. **Only angles that change something are considered.** Two snap positions
   satisfying the same set of angle requirements are interchangeable, so one
   representative of each is kept. This is exact, not an approximation, and
   shrinks the space from 24 (or 576) rotation states to a handful.
3. **Walking and flipping switches are free**, so a layered search over
   rotation count yields the true minimum.
4. **Platform phase is optimistic, not enumerated.** A cycling platform
   eventually presents every phase and there is no timer, so the player can
   wait. A phase-gated edge is treated as traversable — but only when its group
   is actually moving. A group frozen by an unset flag cannot be waited out,
   and that is modelled honestly.

Star thresholds come from the solver, never from authored numbers, so editing
a level can never leave a stale rating behind.

---

## Features

- 30 handcrafted levels across 5 chapters, each with its own palette, ambient
  key and mechanic
- Star rating on fewest rotations, scored against the proven optimum
- A **daily puzzle**, seeded by date, verified solvable before it is served,
  with a streak counter
- A **hint system** that answers "what next?" from wherever you actually are —
  it draws the span that would exist at the suggested rotation as a ghost path.
  Off by setting, and it only offers itself after two minutes stuck
- **Photo mode**: hides the HUD, captures the canvas, shares or saves
- Cosmetic orb skins and trails unlocked by finishing chapters
- Procedural audio (Tone.js): evolving pads per chapter, rotation whoosh,
  connection chime, completion arpeggio. Nothing is created until a real
  pointer gesture unlocks the audio context
- Reduced-motion support, seeded from the OS preference on first run

## Notable choices

**Palettes are built around value separation, not hue.** An orthographic,
flat-shaded scene has no perspective cues, so the only thing distinguishing a
top face from a side face is how light each one is. Each palette runs a
deliberate ladder (`shadow → base → raised → glow`) with `sky` clearly off it.
Keeping tones close together — the obvious reading of "soft pastel" — collapses
the monument into one flat silhouette and the illusion stops reading.

**Bloom sits above the structures.** Its threshold is high enough that only the
emissive materials (bridges, portal, orb, crystals, all rendered with
`toneMapped: false`) pass it. Lower, and the pastel structures bloom into a
white blob.

**Fog is measured from the camera, not the level.** The orthographic camera
sits at `[d, d, d]`, so its distance to the structure is `d·√3`. Deriving fog
from the level's own size puts every level past the fog's far plane.

**Flick velocity is clamped.** Pointer velocity is delta over inter-event time,
and that time can be near zero, producing tens of thousands of degrees per
second. Clamped to two turns per second and smoothed across samples.

## Not included

Backend or cloud save (progress is `localStorage`), leaderboards, deep mobile
touch tuning, localisation.

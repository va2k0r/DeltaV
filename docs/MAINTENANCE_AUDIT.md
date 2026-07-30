# Maintenance Audit

Date: 2026-07-15  
Target: DeltaV 0.1.0-alpha.1

## Outcome

This pass deliberately keeps gameplay, camera behavior, and art direction intact. It focuses on
release contradictions, a measured renderer bottleneck, verification debt, and a repeatable
portable build.

Current default override (2026-07-16): Procedural Balanced is the player-facing default and is
also inherited by the tutorial. The canonical v10 map remains available as the fixed reference
preset.

## Corrected

- The original audit changed the default to canonical v10; the 2026-07-16 product decision above
  supersedes that selection without changing the canonical economy contract.
- A regression test fixes the canonical economy contract at 18 nodes: Earth/Moon protected;
  Jupiter/Saturn/Uranus/Neptune produce tritium; Mercury/Mars/Titan/Pluto-Charon are shipyards.
- The canonical two-player start now uses six nodes that actually exist in v10 and assigns each
  side one tritium node, one shipyard, and one barren staging node. Stale strategic-map start IDs
  no longer create invisible occupancies or startup warnings.
- The 768-star background no longer creates hundreds of independently animated `Sprite`
  objects. Three GPU point batches preserve depth layers, parallax, pulse, color, and afterglow.
- A renderer material-uniform access now crosses the Three.js `userData` boundary through an
  explicit unknown record instead of an unsafe `any` assignment.
- Vite emits stable Three.js and Zod vendor chunks, improving browser caching and making the main
  application chunk easier to reason about.
- Repository docs no longer claim that implemented v10 systems such as contested nodes, Evade,
  AI, and victory/defeat are absent.
- The renderer uses `THREE.Timer`; the deprecated `THREE.Clock` warning no longer pollutes clean
  browser startup diagnostics.

## Runtime Evidence

The same full-system browser view on a 120 Hz display changed from roughly 411 draw calls and
8,001 renderer objects to roughly 356 draw calls and 7,236 objects. Renderer presentation CPU
time fell from about 2.55 ms to 1.99 ms in the comparable idle view. The display refresh cap
prevents an honest idle claim of “+10 FPS”; the useful result is 55 fewer draw calls, 765 fewer
objects, and about 0.56 ms less CPU presentation work per frame. Busy scenes have more headroom
instead of spending it on the static starfield.

These figures are development diagnostics, not a cross-device benchmark. Future performance
work should keep reporting frame time and GPU/CPU counters rather than deriving an FPS promise
from one machine.

### 120 Hz browser pass (2026-07-29)

The deployed GitHub Pages build was measured first, then the candidate production artifact was
built with `VITE_PUBLIC_BASE=/DeltaV/` and served at the same `/DeltaV/` path. On the 120 Hz test
display, a busy AI autorun sample from the deployed build fell as low as 92.8 rolling FPS and
recorded 60 intervals over 20 ms. The candidate build held 119.38–119.96 rolling FPS at
8.34–8.38 ms per frame in the same browser during continuous 3D AI turns. In the post-warm-up
12-second window it recorded one interval over 20 ms, none over 30 ms, and a 24.6 ms maximum.
A separate 15-second user-mode sample recorded 119.66 FPS with no interval over 20 ms.

With diagnostics enabled, the stable minimal-quality sample averaged 5.21 ms renderer CPU,
1.61 ms GPU, and 2.54 ms scene-render time. The remaining headroom comes from enabling the
adaptive governor for normal browser gameplay, reacting inside the 8.33 ms 120 Hz budget,
avoiding continuous transfer-geometry rebuilds in reduced/minimal modes, splitting BURN and FIRE
rebuild peaks across adjacent frames, and capping detailed body, label, and missile-impact work
at quality-appropriate cadences. Disabled beat synchronization also avoids redundant per-frame
DOM style mutations.

These are controlled measurements, not a universal 120 FPS guarantee. Browser VSync cannot
present 120 FPS on a 60 Hz display, and hardware, power mode, background throttling, viewport,
device pixel ratio, and screen capture can change the result. Screen capture was kept outside
the reported pacing windows because taking a screenshot itself stalls presentation.

## Logic Audit

Automated tests and four 40-turn AI diagnostic simulations preserve deterministic state and core
invariants: no negative dV, invalid ship references, duplicate same-faction stacks, illegal
missile targets, or action-count violations were observed. Planning did not mutate the input
state and the diagnostics did not reveal turn-order bias.

One experimental-map issue remains intentionally unfixed: the two-player procedural audit can
report an individual early-collapse warning without failing the global map gate because that
hard gate is currently enforced for three-player generation. This now applies to the default map
path by explicit product decision and should still be resolved as a balance-policy decision before
the procedural audit is considered fully release-grade.

## Maintainability Risks

- `src/renderers/cinematic3d/index.ts`, `src/core/simulation/gameState.ts`, and `src/ui/index.ts`
  are very large modules. Splitting them mechanically during a release pass would add risk, so
  they remain intact. New work should extract bounded subsystems only when a feature is already
  being touched, starting with starfield/post-processing, turn phases, and debug tooling.
- Browser smoke checks are currently manual. A later milestone should add a small automated
  startup and WebGL-error smoke test without moving gameplay assertions into the renderer.
- The portable alpha requires a system Node.js runtime. A signed, bundled native shell should be
  a separate packaging milestone with an explicit support and security decision.

## Guardrails For Future Work

1. Keep core turn rules headless and deterministic.
2. Add a focused regression test before changing a phase boundary or canonical content role.
3. Measure renderer changes with frame time, draw calls, objects, and visual inspection.
4. Prefer batch/instancing changes that preserve materials and camera behavior.
5. Run `npm run verify` before packaging and use `npm run release:portable` for reproducible
   alpha artifacts.

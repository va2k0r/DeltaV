# DeltaV / AV Technical Architecture v5

## 1. Architecture principle

The core simulation must run headlessly.

Rendering, camera, audio and UI are consumers of deterministic game state, not owners of logic.

## 2. Suggested stack

For web-first prototype:

- TypeScript
- Vite
- Vitest
- Zod
- React optional
- Three.js or React Three Fiber for spatial presentation
- Canvas/SVG/DOM overlays for labels/pills if appropriate

## 3. Folder model

Suggested structure:

```text
src/core/
  state/
  rules/
  orders/
  economy/
  combat/
  transfers/
  missiles/

src/content/
  schemas/
  loader/

src/sim/
  orbitalPlane/
  turnResolution/

src/viewmodels/
  mapSnapshot.ts
  uiAnchors.ts
  trajectoryPreview.ts

src/renderers/spatial/
  SpaceMap.ts
  camera.ts
  semanticZoom.ts
  bodyRenderer.ts
  orbitRailRenderer.ts
  shipRenderer.ts
  nodeRenderer.ts
  trajectoryRenderer.ts

src/renderers/debug2d/
  DebugMap2D.ts

src/ui/map/
  TrajectoryPill.ts
  NodeTooltip.ts
  TritiumReserveChart.ts
```

## 4. Core types

All gameplay positions use `Vec2`.

```ts
type Vec2 = { x: number; y: number }
```

Presentation mapping can derive `Vec3`:

```ts
Vec2(x, y) -> Vec3(x, 0, y)
```

No game rule should require `Vec3`.

## 5. Data-driven content

Body/node data must come from external JSON and be validated with Zod.

Invalid content fails loudly.

Content should include:

- body id/name/kind
- parent body
- orbit radius
- orbit period in turns
- initial angle
- visual class
- node definitions
- node type
- node contestability
- protected flags

## 6. Node model

A node should not be modeled as “the planet”.

A node is an operational orbit attached to a body.

Suggested fields:

```ts
type NodeType = 'tritium' | 'shipyard' | 'protectedTransit' | 'specialUtility'

type NodeData = {
  id: string
  bodyId: string
  type: NodeType
  contestable: boolean
  controllable: boolean
  producesTritium: boolean
  allowsShipyard: boolean
  protectedNoWar: boolean
  orbitRadiusLocal: number
  orbitPeriodTurns?: number
}
```

Earth and Moon nodes must have:

```ts
contestable: false
controllable: false
producesTritium: false
allowsShipyard: false
protectedNoWar: true
```

## 7. Camera

Camera is presentation/UI state only.

It must not alter core state.

Implement:

- right drag pan
- wheel zoom to cursor
- fit system
- focus selected
- zoom bounds
- optional semantic zoom parameters

Do not implement orbit camera in Milestone 1.

## 8. UI anchors

Map objects expose anchors in world space.

The renderer projects anchors to screen space.

Trajectory pills, labels and tooltips attach to anchors or trajectory sample points.

Do not hardcode UI positions to a single camera angle.

## 9. Semantic zoom implementation

Semantic zoom is presentation-only.

It can alter apparent scale and rendered positions relative to focus, but not core positions.

Hit testing must still resolve against canonical objects.

If visual warping complicates hit testing, keep an explicit mapping layer.

## 10. Ship orbit animation

Ship glimmer motion during planning is presentation state derived from game state and clock.

It may be used to choreograph departures.

It must not alter transfer cost, legality, duration or outcome.

## 11. Determinism

Core turn resolution must be deterministic for tests.

Presentation animation may be non-gameplay continuous, but it cannot affect rule outcomes.

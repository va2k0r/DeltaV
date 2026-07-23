# Changelog v5

## Purpose

v5 realigns the package after major map, camera, node and visual grammar decisions made after v3.

## Major corrections

### 1. Current canon added

Added `00_CURRENT_CANON.md` as the first source of truth.

### 2. Earth and Moon corrected

Earth and Moon are now protected transit nodes.

They cannot be owned, contested, attacked, nuked, extracted from or used as shipyards.

### 3. Mercury marked unresolved

Mercury is no longer treated as a dead barren node.

Its final role requires map simulations.

### 4. Node definition clarified

A node is an operational orbit around a body.

The body is context. The node is the decision.

### 5. Visual grammar updated

Added:

- high-resolution minimalism, not retro/pixel
- Carrier Command 2 as light/mood reference only
- ship glimmers resolving into micro-light clusters
- ship micro-behaviors
- ship occlusion behind bodies
- ship rails remain visible
- planetary orbit rails as faint structural information

### 6. Contested nodes clarified

Contested nodes are shown by crossed faction-colored rails.

The node itself remains neutral.

Only contested nodes show micro nuclear-like flashes.

### 7. Transfer UI clarified

Transfer cost/time is shown as a pill attached to the trajectory:

```text
T+2
Δv -12
```

Out of range:

```text
OUT OF RANGE
Δv 31 / 24
```

No duplicate cost on target node by default.

### 8. Missile UI clarified

Missiles use countdown pill:

```text
T-2
```

### 9. Future systems simplified

Removed generic future orbit scrubbing.

Removed player-managed transfer windows.

Future information is actionable only.

### 10. Roadmap updated

Milestones now separate map foundation, nodes/ship presence, transfers, reserve chart, contested nodes and missiles.

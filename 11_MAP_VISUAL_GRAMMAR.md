# Map Visual Grammar v6

This document defines the player-facing map language.

## 1. Core grammar

```text
The body is context.
The node is the decision.
The orbit is information.
The ship is a glimmer.
```

AV's map must communicate through geometry, motion, light and sparse numbers, not through heavy icons.

## 2. Bodies

Bodies are planets and moons.

They are not command objects. They provide scale, parent hierarchy and visual identity.

### Tritium-associated bodies

Tritium-associated bodies should be distinguishable by slow animated gas/fluid surface motion where appropriate.

This is not a color code. It is a material/behavior code.

Rules:

- surface motion is slow and restrained
- no noisy procedural texture
- no lava-lamp look
- no cartoon turbulence
- shadows remain hard
- the body remains a near-perfect sphere

### Shipyard-associated bodies

Shipyard-associated bodies should be distinguishable by tiny luminous grid structures on the surface.

Rules:

- sparse high-resolution grid clusters
- different placement per body
- cold light
- not city lights
- not dense civilization texture
- not decorative noise
- should feel like industrial scars or embedded infrastructure

### Protected transit bodies

Earth and Moon are protected transit bodies/nodes and visual exceptions. They are more realistic and textured than the abstract hard-lit bodies beyond the Moon.

They must stay neutral and must not show war, production or contested effects. Transfers into Earth/Moon protected space display `WEAPONS OFFLINE`.

## 3. Nodes

A node is an operational orbit around a body.

Node type is communicated through minimal behavior:

- tritium node: production flow
- shipyard node: segmented build/completion ring
- protected transit node: neutral routing only
- special utility node: unresolved, do not invent without simulations

## 4. Tritium production

Tritium production is shown as a stream of luminous dots moving from the body toward the orbiting ship.

It should feel like an orbital radar sweep or pulse train.

Rules:

- dots are small, cold, high-resolution
- dots travel in trains, not continuous beams
- the flow connects body and ship
- it makes distance visible
- no resource numbers flying out
- no mobile-game collection visual

## 5. Shipyard production

Shipyard production is shown by an orbital progress ring closing in thin luminous segments.

Rules:

- segmented ring is separate from faction rail
- the ring fills in clean spicchi/arcs
- it is not a UI progress bar floating outside the map
- when complete, the produced ship stabilizes as a glimmer on the orbit
- optional support: surface grid lights activate subtly during production

Formula:

```text
Tritium = flow.
Shipyard = completion.
```

## 6. Ships

Ships are tiny high-resolution light systems.

They are not detailed hero models in the strategic map.

At far zoom:

- one glimmer

At closer zoom:

- primary engine light
- a few secondary lights
- possible side jets
- minimal trail

Optional micro-behaviors:

- engine sputtering
- attitude tilt and correction
- tiny lateral jets
- light flicker
- short trails

These are presentation-only.

## 7. Ship orbits

Ship orbit rails are always or generally visible because they are primary strategic information.

Rules:

- rails use faction colors
- rails remain readable ovals from the player's view
- rails do not disappear when the ship goes behind the planet
- rails may have slightly dimmer rear/depth sections, but must remain continuous enough to read

The ship glimmer may be occluded by the body.

The orbit rail is the information. The ship is the physical glimmer.

## 8. Contested nodes

A contested node is shown through conflict geometry, not through ownership color.

Rules:

- node remains neutral
- two faction-colored ship rails cross around the same node/body
- contested rails are slightly thicker or more opaque than normal
- ships may orbit with different visual periods
- cold white micro flashes occur only on contested nodes
- persistent contested attrition pill appears near node:

```text
-4 dV   -4 dV
```

Each value uses the corresponding faction color.

The crossed rails show contestation. The flashes show that the contestation is alive. The pill shows the ongoing cost.

## 9. Contested action rules

Contested is not only a visual state; it limits legal actions.

A ship in contested cannot:

- Evade
- Fire at external targets

It is already combat-committed.

A contested ship can only:

- stay contested and pay contested dV
- leave by paying contested dV plus transfer dV

Contested dV is paid before any other action.

Formula:

```text
Contested does not block you. It bleeds you.
```

## 10. Transfers

Transfers are node-to-node.

The acting faction/player transfer preview uses a colored transfer line and attached pill:

```text
T+2
Δv -12
```

Protected transit transfer to Earth/Moon adds:

```text
WEAPONS OFFLINE
```

If not enough dV:

```text
OUT OF RANGE
Δv 31 / 24
```

The pill is attached to the trajectory, not duplicated on the target node.

## 11. Missiles and Evade

Missiles use countdown pills attached to their path:

```text
T-3
```

The pill uses the target faction color.

Multiple ships may fire missiles at the same target. One Evade action by the target cancels all missiles currently targeting that ship.

```text
T+ = planned arrival.
T- = incoming threat.
Evade = clears all inbound missiles for that target.
```

## 12. Reserve chart

The map includes a compact tritium reserve chart.

Historical line: neutral.

Projected final segment:

- green if reserve would increase
- red if reserve would decrease
- neutral if unchanged

The chart shows total turn consequence, not individual move cost.

## 13. Avoid

Avoid:

- icons doing the work of geometry
- node type colors
- retro pixel/chunky graphics
- thick UI overlays
- big tooltips as primary feedback
- generic future scrub
- transfer windows
- planet click commands
- ships becoming large detailed models in normal map view

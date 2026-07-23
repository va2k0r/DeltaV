# DeltaV / AV Visual Language Bible v5

## 1. High-resolution minimalism

AV is not retro.

AV is not pixel-art inspired.

AV uses:

- thin lines
- precise glow
- clean geometry
- sparse light points
- harsh black shadows
- restrained color
- almost no visual noise

Carrier Command 2 is a reference for operational lighting and mood, not for pixel graphics.

## 2. Black void

The void dominates.

Stars are rare.

Rules:

- very few stars
- subtle cold glow per visible star
- no dense starfield
- no Milky Way
- no colorful nebulae
- no fantasy space background

Stars should make the void feel emptier, not fuller.

## 3. Bodies

Planets and moons are not photoreal terrain balls.

They are clean, nearly ideal spheres.

Rules:

- minimal surface detail
- large simple shapes only if needed
- no procedural texture noise as main look
- no realistic atmospheric softness in v1
- hard terminator
- near-black shadow side
- crisp moon shadows
- zero or near-zero diffuse bounce

The goal is not realism. The goal is stark spatial clarity and cosmic severity.

## 4. Scale

Planets and moons may scale expressively under semantic zoom.

Ships do not.

```text
Planet scale is expressive.
Ship scale is restrained.
```

## 5. Ships

Ships are tiny operational light systems.

They may share the same model/silhouette.

At map scale they are primarily:

- glimmer
- engine point
- secondary micro-lights
- short trail
- faction rail association

Do not invest in procedural ship model variety for early prototypes.

Variation comes from micro-behavior.

## 6. Ship micro-behaviors

Allowed visual flair:

- engine sputtering
- tiny side jets
- subtle attitude tilt
- correction burns
- light flicker
- damaged instability
- short directional trail

These must be subtle, high-resolution, cold and minimal.

They must not make ships heroic or visually large.

## 7. Orbit rails

Orbit rails are information.

Planetary rails:

- neutral
- faint
- structural
- always ghosted at relevant zoom

Ship rails:

- faction-colored
- more prominent
- generally always visible
- readable ovals
- strategic signal

Transfer trajectories:

- projected/calculated
- distinct from rails
- carry transfer pill

Missile trajectories:

- threat/counter
- carry countdown pill

## 8. Color

Color must be semantic.

Use color for:

- faction rails
- transfer validity state
- reserve chart projection
- missile/threat state if needed

Do not use color as decorative planetary wallpaper.

Do not use type colors that conflict with faction colors.

Reference composition, 2026-06-20:

- default tactical camera reads as a zoomed-out zenithal planetarium table
- keep the command log in the upper-right composition lane, with important map labels avoiding it
- palette target is near-black blue void, cold dust, faint thin orbit rails, and restrained semantic faction light
- red is reserved for FIRE, missile threat, and warnings; avoid faction colors that sit too close to red
- BURN preview uses the origin faction color; FIRE preview remains threat red
- BURN and FIRE trajectories must remain readable from zenith and from oblique/edge-on camera angles

## 9. Contested effects

Contested nodes use:

- crossed faction-colored rails
- slightly increased rail opacity/thickness
- neutral node center
- cold white micro flashes

Micro flashes are not fireworks.

They represent live orbital conflict.

No smoke.

No orange fireball.

No big explosion.

No contested effect around Earth/Moon.

## 10. UI style on map

The map UI is high-resolution and thin.

Use:

- small pills
- subtle translucent backgrounds
- tiny labels
- hard readable type
- minimal borders
- clear hierarchy

Avoid:

- big panels over the map
- duplicated numbers
- arcade color spam
- thick outlines
- retro monitor pixel look

## 11. Key visual phrases

```text
The world stays simple. Meaning lives in light.
```

```text
The body may hide the ship. It must not hide the information.
```

```text
Faction lives in the orbit. Contestation lives in the crossing.
```

## v5 addendum: map light/material grammar

AV is not retro and not pixel-inspired. It takes from Carrier Command 2 the idea that light communicates operational identity, not the chunky/pixel throwback look.

### Body category signatures

Tritium-associated bodies may use slow animated gas/fluid surface behavior. The distinction is material motion, not color.

Shipyard-associated bodies may use sparse tiny luminous surface grid structures. These should feel like industrial scars or embedded infrastructure, not cities or decorative lights.

### Production grammar

Tritium production is shown as radar-like streams of small luminous dots flowing from the body to the ship on the node.

Shipyard production is shown as a segmented orbital progress ring closing in thin spicchi. The progress ring is separate from the faction/control rail.

```text
Tritium flows.
Shipyards close.
```

### Ship grammar

Ships are tiny light systems. They may share the same basic silhouette or be represented mainly as light clusters.

At closer zoom, one glimmer may resolve into engine light plus a few smaller functional lights. Visual variety comes from light placement, engine sputtering, side jets, tilt/correction, flicker and trails, not procedural ship models.

### Contested grammar

Contested nodes use crossed faction-colored rails, micro white conflict flashes, and a persistent small attrition pill:

```text
-4 dV   -4 dV
```

Each value uses its corresponding faction color. The node itself stays neutral.

# Changelog v5

## Purpose

v5 canonicalizes the latest map grammar decisions made after v4.

## Major additions

### 1. Body category signatures

Tritium-associated bodies may use slow animated gas/fluid surface patterns.

Shipyard-associated bodies may use sparse tiny luminous surface grid structures.

This distinguishes node categories through material behavior and infrastructure marks, not type color.

### 2. Production grammar

Tritium production is shown as radar-like streams of small luminous dots flowing from the body to the orbiting ship.

Shipyard production is shown as a segmented orbital progress ring closing in thin spicchi.

Formula:

```text
Tritium flows.
Shipyards close.
```

### 3. Ship presentation clarified

Ships are tiny high-resolution light systems. They may be largely identical and differentiated through lights, engine sputtering, side jets, tilt/correction, flicker and trails.

### 4. Transfer semantics clarified

Transfers are strictly node-to-node. Ship orbital phase has visual consequences only.

Transfer line and transfer pill use the acting player/faction color.

Valid transfer:

```text
T+2
Δv -12
```

Invalid due to insufficient dV:

```text
OUT OF RANGE
Δv 31 / 24
```

### 5. Missile semantics clarified

Missile countdown pills use the target faction color.

```text
T-3
```

### 6. Contested node attrition pill added

Contested nodes have a persistent pill:

```text
-4 dV   -4 dV
```

Each value uses the corresponding faction color.

### 7. New map grammar file

Added:

```text
11_MAP_VISUAL_GRAMMAR.md
```

This file gives Codex a compact, current reference for the map's visual language.

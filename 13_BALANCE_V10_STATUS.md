# DeltaV Balance v10 Status

## Baseline fixed values

```text
Tritium node Work: +2 dV
Shipyard production: 1 ship every 4 Work turns
Starting dV: 10
Evade: 2 + active missile solutions
Contested upkeep: 2
Missile min travel: 2 turns
Ship local min travel: 1 turn
```

## Current map hypothesis

The v10 map uses planets and moons only:

```text
Earth, Moon
Mercury, Venus, Mars, Deimos
Jupiter, Callisto
Saturn, Titan, Iapetus
Uranus, Oberon
Neptune, Triton
Pluto/Charon, Nix, Hydra
```

## Main balance questions

1. Is 18 active nodes enough, or does the map need the 20-node variant with Io and Titania?
2. Is Saturn/Titan too strong as the only hybrid tritium+shipyard system?
3. Should Titan use 4 WORK or 5 WORK?
4. Does the hard setup with no starting tritium create better openings or excessive fuel starvation?
5. Does Jupiter gravity +3 make Jupiter appropriately rich-but-dangerous?
6. Does Pluto/Charon need easier or harder access to Neptune/Triton?

## First patch order if problems appear

If Saturn is too strong:

```text
Titan shipyard = 5 WORK
Saturn ↔ Titan = minimum 2 turns
```

If the map is too sparse:

```text
Add Io as hazardous barren
Add Titania as shipyard or barren
```

If outer player is too safe:

```text
Improve Iapetus/Oberon/Triton bridge windows
Make Neptune/Triton easier to contest from Uranus/Saturn windows
```

If inner player lacks fuel too often:

```text
Improve Deimos ↔ Callisto/Jupiter windows
Lower Jupiter exit gravity from +3 to +2 only if necessary
```

# Balancing

Milestone 1.1 includes map-pacing values only. It does not implement economy, ships,
combat, ownership, victory, or defeat balance.

Future balance numbers must live in external validated data, not hardcoded rule modules.

## Orbital Pacing

Orbital periods are gameplay-tuned, not realistic. Real orbital ratios are intentionally
rejected because they are bad for the pacing of a readable 40-turn strategy match.

The current vanilla planet periods are selected to create changing strategic alignments
without making the map feel chaotic:

- Mercury: 24 turns
- Venus: 30 turns
- Earth: 35 turns
- Mars: 40 turns
- Jupiter: 47 turns
- Saturn: 56 turns
- Uranus: 68 turns
- Neptune: 81 turns
- Pluto/Charon: 108 turns

All active moons currently use a 14-turn orbital period. This keeps moons faster than
planets while preventing them from looking like spinning toys.

Moon orbit radii are exaggerated in displayed strategic scale so local moon systems, node
rings, and labels remain readable. These values are presentation/gameplay readability
abstractions, not astronomy.

Tunable areas include:

- starting tritium
- tritium production
- shipyard production time
- movement cost parameters
- missile timing
- evasion cost parameters
- elimination thresholds
- scenario presets

Do not treat placeholder numbers as final balance.

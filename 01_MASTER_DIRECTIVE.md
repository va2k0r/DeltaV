# DeltaV / AV Master Directive v5

## Primary instruction

You are working on DeltaV / AV, a deterministic hard-sci-fi orbital strategy game.

Your job is to implement only the requested milestone, with a durable architecture and strict scope control.

Do not expand the game beyond the current milestone.

## Product definition

AV is a near-future hard-sci-fi orbital strategy game about corporate powers fighting beyond the Moon for tritium, mobility, infrastructure and orbital position.

The player is not a pilot and not an aerospace engineer.

The player is an operations commander authorizing commitments in a hostile orbital system.

Core statements:

```text
Tritium is delta-v.
Delta-v is life.
Nodes produce, ships control.
The orbit is information.
Victory is mobility denial.
```

## Design philosophy

AV distills beautiful but hostile hard-sci-fi games into essential playable decisions.

### From Children of a Dead Earth

Keep:

- hard-sci-fi consequences
- orbital warfare
- distance
- technical brutality
- irreversible commitments

Remove:

- projectile overload
- engineering excess
- battle spectacle
- tamarraggine
- player-hostile complexity

### From Carrier Command 2

Keep:

- operational tension
- remote command
- systems thinking
- cold electronic operations mood
- lights as functional identity

Remove:

- micromanagement fatigue
- UI punishment
- retro pixel/chunky look
- naval-military literalism

Carrier Command 2 is a reference for operational light language and music mood, not for retro visual style.

### From Kerbal Space Program

Keep:

- orbital intuition
- delta-v as meaningful constraint
- the satisfaction of understanding a burn

Remove:

- toy-like tone
- manual piloting as core gameplay
- goofy sandbox looseness

## Player fantasy

The player should feel like they are operating a cold orbital observation and command system.

They should not feel like:

- a heroic pilot
- a free-flying camera
- an engineer debugging a simulation
- an RTS player dragging a battlefield
- a spectator of spectacular space battles

The key feeling:

```text
A small glimmer moves in black space.
A commitment is authorized.
The future changes.
There may be no way back.
```

## Scope discipline

Prefer one rule over three.

Prefer one camera over camera modes.

Prefer a visible orbit rail over a tooltip.

Prefer micro-behavior over asset variation.

Prefer node-to-node commitments over simulated transfer windows.

If a feature is interesting but not actionable, remove it.

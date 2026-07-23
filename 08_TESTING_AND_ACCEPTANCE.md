# DeltaV / AV Testing and Acceptance v5

## General principle

Every gameplay rule must be testable without renderer, camera or browser.

## Milestone 1 acceptance

A passing Milestone 1 build must:

- load body/node data from JSON
- validate data with Zod
- fail loudly on invalid data
- compute deterministic positions by turn
- maintain canonical 2D gameplay positions
- show a spatial map, not a flat player-facing 2D board
- use one camera
- support right-drag pan
- support wheel zoom to cursor
- support bounded zoom
- show sparse glowing stars
- show hard-lit bodies
- show faint planetary orbit rails
- clearly separate renderer from simulation
- expose world-space UI anchor structure
- keep Earth/Moon protected transit rules in data

Must not:

- add orbit camera
- add free camera
- make planets/lunes command objects
- assign Earth/Moon to factions
- add contested visuals around Earth/Moon
- implement transfer windows
- implement generic future orbit scrubbing

## Core tests

Required:

- schema accepts valid body/node data
- schema rejects invalid body/node data
- deterministic body position for same turn/data
- positions change predictably by turn
- Earth node flags: protected, non-contestable, non-controllable, no production
- Moon node flags: protected, non-contestable, non-controllable, no production
- Mercury is marked open/special/unresolved if included, not silently barren final

## Camera tests where practical

- world-to-screen/screen-to-world round trip tolerance
- zoom-to-cursor preserves target world point where practical
- zoom bounds clamp correctly
- right-drag modifies camera center/pan, not core state

## Map interaction tests where practical

- planets are not command-selected
- nodes are selectable
- trajectory pill data comes from transfer preview view model
- transfer cost is not duplicated on target node by default

## Transfer tests for later milestone

- transfer cost independent of ship visual phase
- transfer duration independent of ship visual phase
- transfer legality independent of ship visual phase
- transfer order is node-to-node

## Visual QA checklist

Manual review should answer yes to:

- Does the void dominate?
- Are there very few stars?
- Do planet shadows feel hard and severe?
- Does the camera feel operational, not toy-like?
- Are orbit rails readable without clutter?
- Are ships tiny?
- Is the map high-res/minimal, not retro/chunky?

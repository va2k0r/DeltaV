# Security

Milestone 0 has no mod loader, network gameplay, persistence, or package distribution.

Future constraints:

- validate all external JSON content with Zod before use
- do not execute arbitrary mod code
- do not use `eval`
- keep browser APIs out of the core simulation
- keep save and replay formats deterministic and versioned
- record content hashes once content loading exists

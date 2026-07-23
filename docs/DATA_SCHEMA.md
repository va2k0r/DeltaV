# Data Schema

Milestone 0 includes Zod as the runtime validation dependency and a small scaffold manifest
schema used by tests.

No gameplay data schema is implemented yet.

Future JSON content must fail loudly on invalid data and should include clear errors for
unknown body IDs, invalid node types, invalid balance values, and invalid scenario references.

Planned validated content areas:

- bodies and operational nodes
- factions
- balance parameters
- scenarios
- UI text
- asset manifests
- future mod metadata

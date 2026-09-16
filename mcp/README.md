# TheoSphere MCP Core

This directory is the control-plane boundary for TheoSphere's provider-agnostic multi-agent engineering system.

## V1 principles

- MCP is the control plane, not merely a filesystem tool collection.
- Agents are interchangeable providers behind the same contracts.
- Tasks have explicit lifecycle states and ownership.
- Implementation and verification are separated.
- Mutations require explicit permissions and are auditable.
- Locks prevent conflicting concurrent work.
- Database and production operations are denied by default.
- Existing TheoSphere QA and CI remain authoritative application quality gates.

## Planned modules

```text
mcp/
├── server/        # MCP transport/context and tool registration
├── tools/         # project, task, agent, audit, QA, database, production
├── state/         # task, agent, lock and audit stores
├── schemas/       # stable domain contracts
├── security/      # permissions and execution boundaries
└── tests/         # MCP contract and lifecycle tests
```

V1 starts with the domain contracts and state model. Runtime transport and persistence are introduced only after those contracts are tested.

# ADR-001 — TheoSphere MCP Core v1

**Status:** Proposed for implementation
**Date:** 2026-09-16

## Context

TheoSphere already has CI/CD, automated QA, agent/audit artifacts and an existing Claude filesystem MCP integration. The current integration provides project filesystem access but does not constitute a control plane for multi-agent engineering.

The platform needs a provider-agnostic MCP Core that coordinates agents without coupling the architecture to Claude, Gemini, GPT or any single IDE.

## Decision

Build the TheoSphere MCP Core incrementally in a dedicated `mcp/` boundary. V1 will establish the control-plane primitives before adding autonomous orchestration:

1. Task Engine
2. Agent Registry
3. File/task locking
4. Append-only audit events
5. Permission model with default deny
6. Verification gate requiring an independent verifier
7. Contract tests for the complete lifecycle

The existing filesystem MCP remains infrastructure access and is not promoted to orchestration authority.

## Target lifecycle

`CREATED → PLANNED → LOCKED → IN_PROGRESS → IMPLEMENTED → TESTING → AUDITING → VERIFIED`

Failures transition to `FAILED → REWORK → TESTING`.

A task cannot become `VERIFIED` unless implementation, tests and independent verification requirements are satisfied.

## Agent separation

The implementation agent and verification agent must be distinct for changes requiring verification. If no independent verifier is available for a critical change, the task remains pending human review rather than self-verifying.

## Security principles

- Default deny for permissions.
- JWT identity remains the source of user identity inside TheoSphere application APIs.
- MCP agent identity is separate from end-user identity.
- Database access is read-only by default.
- Production and deployment operations require explicit permissions.
- Secrets are never persisted in task, memory or audit payloads.
- Every mutating operation emits an audit event.

## Scope of V1

V1 does **not** attempt to implement every repository, database, production and QA tool. It establishes stable domain contracts and state stores so those tools can be added without changing the control model.

## Consequences

This keeps the stable application isolated from the new control plane, makes agent behavior auditable, prevents conflicting edits, and permits Claude, Gemini, GPT and future specialist agents to participate through the same protocol.

The next ADR should define the MCP transport/runtime and persistence strategy after the V1 domain contracts have been validated.

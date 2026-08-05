# V1 Implementation Decisions: Second Memory

- Product: Second Memory
- Date: 2026-08-04
- Status: Draft
- Owner: Solo Builder (PO/Architect/Developer)

## 1. Purpose

This document records concrete MVP implementation decisions that sit below the logical architecture.

## 2. Scope

In scope:

1. Runtime frameworks and service stack for V1.
2. Monorepo tooling and task orchestration choices.
3. Worker messaging technology for async jobs.
4. MVP infrastructure runtime assumptions.

Out of scope:

1. Long-term replacement plans beyond explicit revisit triggers.

## 3. Confirmed MVP Decisions

1. Repository Architecture
- Decision: Use a monorepo with pnpm workspaces and Turborepo.
- Rationale: Keep clients and services aligned with shared contracts and coordinated builds.
- Consequences: Requires clear package boundaries and cache-aware task definitions.
- Detailed layout and ownership boundaries are documented in v1-monorepo-structure.md.
- Revisit trigger: Team scaling or independent deployment requirements that justify repo split.

2. Web Client
- Decision: Use Next.js for the web client.
- Rationale: Strong full-stack web ergonomics, routing model, and mature ecosystem for rapid iteration.
- Consequences: Web app conventions and deployment pipeline align to Next.js runtime expectations.
- Revisit trigger: Major mismatch with product UX/performance requirements.

3. Mobile Client
- Decision: Use Expo for the mobile client.
- Rationale: Fast development loop and pragmatic React Native workflow for MVP delivery.
- Consequences: Mobile roadmap should account for Expo-managed workflow constraints.
- Revisit trigger: Native-module or platform constraints that exceed Expo fit.

4. Memory Service
- Decision: Use NestJS for the Memory Service.
- Rationale: Structured module architecture, testability, and TypeScript-first ergonomics for service development.
- Consequences: Service boundaries and shared typing strategy should follow NestJS modular conventions.
- Revisit trigger: Throughput/latency or team constraints that require a different service runtime.

5. Worker Messaging
- Decision: Use Redis + BullMQ for MVP worker messaging and job orchestration.
- Rationale: Simple and proven queueing setup for background embedding jobs.
- Consequences: Queue durability and operations depend on Redis availability and persistence settings.
- Revisit trigger: Reliability, throughput, or multi-region needs beyond BullMQ/Redis operational envelope.

6. Data and Runtime for MVP
- Decision: Run Redis and PostgreSQL in Docker for MVP environments.
- Rationale: Reproducible setup and low-friction environment bootstrapping.
- Consequences: Backups, persistence, and recovery procedures must be explicitly documented if used beyond local dev.
- Revisit trigger: SLA, uptime, or operational burden indicating migration to managed services.

7. MVP Environment Scope
- Decision: Dockerized Redis/PostgreSQL applies to local development, staging, and initial production pilot.
- Rationale: Maintain a consistent runtime footprint during early iteration and validation.
- Consequences: Pilot readiness requires explicit persistence, backup, and recovery controls.
- Revisit trigger: Production scale or compliance requirements exceeding Dockerized stateful service operations.

8. Authentication and Identity Mapping
- Decision: Use Firebase Authentication for V1 identity, and map Firebase uid to internal USER records through USER.firebase_uid.
- Rationale: Fast, managed authentication across web and mobile while preserving internal UUID-based relational integrity.
- Consequences: Public APIs must validate Firebase ID tokens and resolve internal tenant/user context before service access.
- Revisit trigger: Multi-provider federation requirements that exceed a single uid mapping strategy.

## 4. Compatibility Notes with V1 Architecture

1. Logical architecture remains unchanged; these decisions only bind implementation choices.
2. Queue/worker boxes in the system diagram map to Redis + BullMQ in MVP.
3. Deployment assumptions in the architecture doc should reference Dockerized Redis/PostgreSQL for MVP.

## 5. Open Implementation Questions

1. When to migrate Redis/PostgreSQL from Dockerized runtime to managed services.
2. Monorepo package naming and ownership boundaries for shared contracts.
3. Turborepo pipeline shape for lint/test/build/deploy tasks.

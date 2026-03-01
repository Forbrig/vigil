# Implementation Plan: Procedural 3D Avatar Idle Presence

**Branch**: `001-procedural-avatar-idle` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md#L1)
**Input**: Feature specification from `/specs/001-procedural-avatar-idle/spec.md`

## Summary

Deliver a small, embeddable browser application (React + SCSS) using Vite and `@react-three/fiber`
to render a 3D humanoid avatar whose idle behavior is generated entirely in-browser by a
procedural `Behavior Generator`. The system prioritizes: minimal dependency footprint, easy model
swapping, measurable performance goals (>=30 fps on desktop) and a low-resource mode for mobile.

Implementation will be a frontend-only SPA library-style component that can be mounted into host
pages; no backend services or animation assets are required.

## Technical Context

**Language/Version**: JavaScript (ES2022) with Vite (Node.js 18+ recommended)  
**Primary Dependencies**: `react` (18), `react-dom`, `vite`, `sass` (SCSS), `three`, `@react-three/fiber`, `simplex-noise` (or lightweight noise impl)  
**Storage**: N/A (persistence optional; spec FR-008a pending clarification)  
**Testing**: `vitest` + `@testing-library/react` for unit tests; `playwright` for visual/integration checks (smoke tests)  
**Target Platform**: Modern desktop & mobile browsers (Chromium, WebKit)  
**Project Type**: Frontend library / SPA component  
**Performance Goals**: Maintain >=30 fps on desktop-class devices under normal-quality settings; low-resource mode to reduce renderer CPU/GPU work by >=30%  
**Constraints**: Procedural only (no imported animation assets), minimal dependencies, model swappable via a simple adapter interface  
**Scale/Scope**: Single embeddable component, small codebase (~1-5k LOC), focused on client-side runtime behavior

## Constitution Check

Separation of Concerns: PASS — proposed layers: `renderer` (react-three), `behavior` (procedural engine), `adapter` (model swap), `runtime` (visibility, perf mode). Any cross-layer access must use the adapter API and be justified in PR notes.

Testability: PASS (unit tests for behavior generator RNG/sequence logic; integration tests for render+behavior smoke tests using Playwright; deterministic seed option for test runs).

Interfaces & Contracts: PASS — public embedding API documented in `/contracts/avatar-api.md`; breaking changes require migration plan.

Tooling & Gates: PASS — include `prettier`/`eslint` (or minimal linters) and `vitest` in CI; CI must run formatting, lint, and tests before merge.

Link to design notes / PoC: `/specs/001-procedural-avatar-idle/research.md` (this plan's Phase 0 output)

## Project Structure

Documentation and artifacts will live under `specs/001-procedural-avatar-idle/`.

Source layout (frontend-only library):

```text
frontend/
├── package.json
├── src/
│   ├── index.jsx            # public entry / mounting wrapper
│   ├── App.jsx              # demo harness
│   ├── components/
│   │   ├── AvatarCanvas.jsx # react-three/fiber canvas + runtime glue
│   │   └── Controls.jsx
│   ├── behavior/
│   │   └── generator.js     # procedural motion primitives + sequencer
│   ├── adapters/
│   │   └── gltfAdapter.js   # model adapter example (swappable)
│   └── styles/
│       └── main.scss
└── tests/
    ├── unit/
    └── integration/
```

**Structure Decision**: Single frontend package under `frontend/` to keep the feature self-contained and easy to import or publish; tests colocated under `frontend/tests`.

## Complexity Tracking

No constitution violations identified. If a later need arises to add a small server for telemetry or persistence, we will justify the added project and provide migration steps.

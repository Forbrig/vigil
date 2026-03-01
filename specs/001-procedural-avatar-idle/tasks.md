# Tasks: Procedural 3D Avatar Idle Presence

**Feature Branch**: `001-procedural-avatar-idle`

## Phase 1: Setup (Project Initialization)

- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize `package.json` with dependencies (`react`, `vite`, `three`, etc.)
- [x] T003 Configure Vite for React and SCSS
- [x] T004 Set up ESLint and Prettier for code formatting
- [x] T005 Add `vitest` and `@testing-library/react` for unit testing
- [x] T006 Add `playwright` for integration testing

## Phase 2: Foundational Tasks (Blocking Prerequisites)

- [x] T007 Create `AvatarCanvas.jsx` in `src/components/` for rendering the 3D avatar
- [x] T008 Implement `generator.js` in `src/behavior/` for procedural motion
- [x] T009 Create `gltfAdapter.js` in `src/adapters/` for model swapping
- [x] T010 Add `main.scss` in `src/styles/` for styling

## Phase 3: User Story 1 - Ambient Presence on Page (Priority: P1)

- [x] T011 [US1] Implement idle behavior in `generator.js`
- [x] T012 [US1] Integrate `generator.js` with `AvatarCanvas.jsx`
- [x] T013 [US1] Add visibility handling in `AvatarCanvas.jsx`
- [x] T014 [US1] Write unit tests for `generator.js`
- [x] T015 [US1] Write integration tests for `AvatarCanvas.jsx`

## Phase 4: User Story 3 - Developer Control & Observability (Priority: P3)

- [ ] T020 [US3] Add developer configuration options to `AvatarCanvas.jsx`
- [ ] T021 [US3] Implement telemetry hooks in `generator.js`
- [ ] T022 [US3] Write unit tests for telemetry hooks
- [ ] T023 [US3] Write integration tests for developer controls

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T024 Add documentation for embedding API
- [ ] T025 Optimize performance for production builds
- [ ] T026 Conduct final accessibility audit
- [ ] T027 Conduct final cross-browser testing

## Dependencies

- User Story 1 → User Story 2 → User Story 3

## Parallel Execution Opportunities

- Phase 1 tasks can be parallelized
- Unit and integration tests for each user story can be parallelized

## Implementation Strategy

- Deliver MVP with User Story 1
- Incrementally add User Stories 2 and 3
- Ensure independent testability at each phase

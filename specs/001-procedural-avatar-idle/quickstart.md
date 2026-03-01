++# Quickstart — Development

Prerequisites: Node.js 18+ and npm/yarn.

1. Create project scaffold (from repo root):

```bash
cd frontend
npm create vite@latest . --template react
npm install
```

2. Install runtime dependencies:

```bash
npm install three @react-three/fiber simplex-noise sass
npm install -D vitest @testing-library/react playwright eslint prettier
```

3. Start dev server

```bash
npm run dev
```

4. Run unit tests

```bash
npm run test
```

Embedding notes

- The exported component is `AvatarWidget` which accepts `config` and `onEvent` callbacks. See `/contracts/avatar-api.md` for the public contract.
- To swap models, implement the adapter interface in `/src/adapters` and pass `modelAdapter` to `AvatarWidget` props.

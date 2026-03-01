++# Avatar Embedding Contract

API: `AvatarWidget(config: AvatarConfig): AvatarHandle`

AvatarConfig

- `container` (HTMLElement) — optional; DOM node to mount into. If omitted, caller must render React root.
- `intensity` ("subtle" | "normal" | "animated") default: `normal`
- `seed` (number | undefined) — deterministic seed for test runs
- `lowResource` (boolean) — start in low-resource mode
- `onEvent` ((event: AvatarEvent) => void) — optional event callback

AvatarHandle

- `setIntensity(level)` → Promise<void>
- `setLowResource(flag)` → Promise<void>
- `setSeed(n)` → Promise<void>
- `dispose()` → Promise<void> (cleanup resources)

Events

- `behavior:start`, `behavior:stop`, `performance:sample`, `error`

Example usage

```js
const handle = AvatarWidget({ intensity: 'subtle', seed: 42, onEvent: e => console.log(e) });
// later
handle.setIntensity('animated');
```

Versioning

- Changes to this contract are breaking and must include migration guidance and version bump.

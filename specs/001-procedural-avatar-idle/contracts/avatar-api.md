# Avatar Embedding Contract

API: `AvatarWidget(config: AvatarConfig): AvatarHandle`

AvatarConfig

- `container` (HTMLElement) — optional; DOM node to mount into. If omitted, caller must render React root.
- `intensity` ("subtle" | "normal" | "animated") default: `normal`
- `seed` (number | undefined) — deterministic seed for test runs
- `lowResource` (boolean) — start in low-resource mode
- `skin` (string) — skin preset id (e.g. `vigil`, `graphite`, `ivory`, `hazard`)
- `scenario` (string) — visual environment preset id (background today, scene assets later)
- `onEvent` ((event: AvatarEvent) => void) — optional event callback

AvatarHandle

- `setIntensity(level)` → `Promise&lt;void&gt;`
- `setLowResource(flag)` → `Promise&lt;void&gt;`
- `setSeed(n)` → `Promise&lt;void&gt;`
- `setSkin(idOrConfig)` → `Promise&lt;boolean&gt;`
- `getAvailableSkins()` → `Promise&lt;Array&lt;{ id: string, label: string }&gt;&gt;`
- `setScenario(id)` → `Promise&lt;boolean&gt;`
- `getAvailableScenarios()` → `Promise&lt;Array&lt;{ id: string, label: string }&gt;&gt;`
- `dispose()` → `Promise&lt;void&gt;` (cleanup resources)

Events

- `behavior:start`, `behavior:stop`, `performance:sample`, `error`

Example usage

```js
const handle = AvatarWidget({
  intensity: 'subtle',
  seed: 42,
  skin: 'graphite',
  scenario: 'room',
  onEvent: (e) => console.log(e),
});
// later
handle.setIntensity('animated');
handle.setSkin('hazard');
handle.setScenario('street');
```

Versioning

- Changes to this contract are breaking and must include migration guidance and version bump.

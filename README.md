# vigil

Procedural humanoid avatar focused on supervisory presence: watchfulness, non-repetitive motion, and patrol in/out behavior.

## Run

```bash
npm install
npm run dev
```

## Customization

### Model Skin

The avatar supports built-in skin presets and can be switched at runtime from the UI or API.

Built-in presets:

- `vigil`
- `graphite`
- `ivory`
- `hazard`

Runtime API (via `AvatarCanvas` ref):

```js
await avatarRef.current.setSkin('graphite');
const skins = await avatarRef.current.getAvailableSkins();
```

### Scene Scenarios

Scenarios control only visual environment look (background today, scene assets later). They do not change animation behavior.

Built-in scenario presets:

- `room`
- `street`
- `prison`

Runtime API:

```js
await avatarRef.current.setScenario('street');
const scenarios = await avatarRef.current.getAvailableScenarios();
```

Animation behavior is controlled independently by intensity, macro-state buttons, and random mode.

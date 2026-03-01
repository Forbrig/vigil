# Avatar Resources & Testing Guide

## 🚀 Quick Start

The updated app now includes **model selection**! You can:

1. **Use Presets** - Select from built-in models (default: Rigged Figure humanoid)
2. **Load Custom URLs** - Paste any GLB/GLTF URL
3. **Test Animation** - Adjust intensity levels in real-time

---

## 📦 Presets Available

| Model                   | Description            | Use Case                       |
| ----------------------- | ---------------------- | ------------------------------ |
| **🟩 Mock (Green Box)** | Simple placeholder     | Testing without loading models |
| **🎭 Damaged Helmet**   | Metallic 3D model      | Testing rigged models          |
| **🤖 Simple Robot**     | Low-poly character     | Performance testing            |
| **📦 Animated Box**     | Morphing cube          | Testing animations             |
| **👤 Rigged Figure**    | Full humanoid skeleton | **Recommended for testing**    |

---

## 🎭 Free Avatar Resources

### High-Quality Rigged Humanoids

1. **Khronos glTF Sample Models**
   - Best: https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0
   - Free & open source humanoid models with skinning

2. **Sketchfab** (Filter by license)
   - https://sketchfab.com
   - Search: "humanoid rigged glb" with CC licenses
   - Download as GLB for direct use

3. **Mixamo by Adobe**
   - https://www.mixamo.com/
   - Free rigged characters with animations
   - Download as FBX, convert to GLTF with Babylon.js converter

4. **Ready Player Me**
   - https://readyplayer.me/avatar-creator
   - Generate custom avatars
   - Download GLB format directly

5. **TurboSquid Free** (Filtered)
   - https://www.turbosquid.com/Search/3D-Models/free
   - Search "humanoid rigged glb"

6. **CGTrader Free**
   - https://www.cgtrader.com/free-3d-models
   - Filter: "rigged", "humanoid", "FBX" → convert to GLTF

### Archive Collections

- **Quaternius**: https://quaternius.com/ - Low-poly humanoids (free)
- **OpenGameArt**: https://opengameart.org/ - Community models
- **3D Model Haven**: https://3d.sketchfab.com/ - Various models

---

## 🔧 How to Convert Models to GLTF/GLB

If you find a model in another format (FBX, OBJ, etc.):

### Online Conversion

1. **Babylon.js Sandbox**: https://sandbox.babylonjs.com/
   - Drag & drop upload
   - Export as GLB
   - Very reliable

2. **Three.js Editor**: https://threejs.org/editor/
   - Drag & drop, export as GLB

### Local Conversion (Node.js)

```bash
# Install converter
npm install -g gltf-transform

# Convert FBX to GLTF
gltf-transform import model.fbx model.gltf
gltf-transform export model.gltf model.glb
```

---

## 📍 How to Test in the App

### Test Presets

1. Run `npm run dev`
2. Open http://localhost:5173
3. Use the **Avatar Model** dropdown
4. Adjust animation intensity with buttons

### Test Custom URLs

1. Click **"Load Custom URL"** button
2. Paste your GLB/GLTF URL
3. Click back outside the input to load
4. Watch browser console for loading errors

### Recommended Test Models

**Copy these URLs into "Load Custom URL":**

```
# Adobe Fused Location Cube (simple)
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb

# AnimatedMorphCube (has morphing)
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb

# RiggedFigure (humanoid with skeleton)
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/RiggedFigure/glTF-Binary/RiggedFigure.glb

# Rigged Simple (simpler skeleton)
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/RiggedSimple/glTF-Binary/RiggedSimple.glb
```

---

## 🐛 Troubleshooting

### Model not loading?

- Check browser console (F12) for errors
- Verify URL is publicly accessible
- Ensure it's GLB or GLTF format
- Check CORS (same-origin or CORS-enabled URL)

### Model loads but no animation?

- This is expected! The behavior generator applies pose transforms
- Not all models have bones in the naming convention we search for
- Open console to see telemetry: `[Avatar Event]` logs

### Animation looks wrong?

- The generator searches for common bone names (head, spine, etc.)
- Your model might have different bone names
- Try adjusting animation intensity levels
- Check the generator's `_findBone()` method in code

---

## 🎨 Next Steps for Full Integration

To fully rig animations to your model:

1. **Identify bone names**: Export model, view hierarchy
2. **Update bone mapping** in `src/adapters/gltfAdapter.js` `applyPose()` method
3. **Create animation tests** with specific bone transforms
4. **Consider motion capture**: For realistic human animation

---

## 💡 Tips

- **Performance**: Low-poly models (< 10k triangles) animate smoothly
- **Testing**: Start with Rigged Figure, then try others
- **Custom avatars**: Ready Player Me avatars work great!
- **Animation improvement**: A "humanoid" bone naming standard (Armature.Hips, etc.) makes bone mapping easier

---

**Happy avatar testing! 👤✨**

import React, { useRef, useState } from 'react';
import AvatarCanvas from './components/AvatarCanvas';
import { GLTFAdapter, MockAdapter } from './adapters/gltfAdapter';
import './styles/main.scss';

// Free 3D humanoid avatar model URLs
const AVATAR_MODELS = {
  mock: {
    name: '🟩 Mock (Green Box)',
    url: null,
    adapter: 'mock',
  },
  'damaged-helmet': {
    name: '🎭 Damaged Helmet',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    adapter: 'gltf',
  },
  'robot': {
    name: '🤖 Simple Robot',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SimpleMeshes/glTF-Binary/SimpleMeshes.glb',
    adapter: 'gltf',
  },
  'box-animated': {
    name: '📦 Animated Box',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb',
    adapter: 'gltf',
  },
  'rigged-figure': {
    name: '👤 Rigged Figure (Recommended)',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/RiggedFigure/glTF-Binary/RiggedFigure.glb',
    adapter: 'gltf',
  },
};

const App = () => {
  const avatarRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState('rigged-figure');
  const [customUrl, setCustomUrl] = useState('');
  const [config, setConfig] = useState({
    intensity: 'normal',
    seed: Math.floor(Math.random() * 10000),
    lowResource: false,
  });
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  // Determine which model to use
  const modelConfig = useCustomUrl 
    ? { name: 'Custom URL', url: customUrl, adapter: 'gltf' }
    : AVATAR_MODELS[selectedModel];

  const adapter = modelConfig.adapter === 'mock' 
    ? new MockAdapter()
    : new GLTFAdapter();

  const handleEvent = (event) => {
    console.log('[Avatar Event]', event);
  };

  const handleReady = () => {
    console.log('Avatar is ready!');
  };

  const handleIntensityChange = async (level) => {
    setConfig((prev) => ({ ...prev, intensity: level }));
    await avatarRef.current?.setIntensity?.(level);
  };

  const handleToggleLowResource = async () => {
    setConfig((prev) => ({ ...prev, lowResource: !prev.lowResource }));
    await avatarRef.current?.setLowResource?.(!config.lowResource);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f0f0',
        }}
      >
        <AvatarCanvas
          ref={avatarRef}
          config={{
            ...config,
            modelUrl: modelConfig.url,
          }}
          adapter={adapter}
          onEvent={handleEvent}
          onReady={handleReady}
        />
      </div>

      <div
        style={{
          padding: '20px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          maxHeight: '200px',
          overflowY: 'auto',
          flexDirection: 'column',
        }}
      >
        {/* Model Selection */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', minWidth: '100px' }}>Avatar Model:</label>
          {!useCustomUrl ? (
            <>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {Object.entries(AVATAR_MODELS).map(([key, model]) => (
                  <option key={key} value={key}>
                    {model.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setUseCustomUrl(true)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Load Custom URL
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Paste GLB/GLTF URL here..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  flex: 1,
                  minWidth: '300px',
                  fontSize: '12px',
                }}
              />
              <button
                onClick={() => setUseCustomUrl(false)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Back to Presets
              </button>
            </>
          )}
        </div>

        {/* Animation Controls */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold' }}>Animation Intensity:</label>
          <button
            onClick={() => handleIntensityChange('subtle')}
            style={{
              padding: '8px 16px',
              backgroundColor: config.intensity === 'subtle' ? '#0066cc' : '#e0e0e0',
              color: config.intensity === 'subtle' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Subtle
          </button>
          <button
            onClick={() => handleIntensityChange('normal')}
            style={{
              padding: '8px 16px',
              backgroundColor: config.intensity === 'normal' ? '#0066cc' : '#e0e0e0',
              color: config.intensity === 'normal' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Normal
          </button>
          <button
            onClick={() => handleIntensityChange('animated')}
            style={{
              padding: '8px 16px',
              backgroundColor: config.intensity === 'animated' ? '#0066cc' : '#e0e0e0',
              color: config.intensity === 'animated' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Animated
          </button>
        </div>

        {/* Other Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleToggleLowResource}
            style={{
              padding: '8px 16px',
              backgroundColor: config.lowResource ? '#0066cc' : '#e0e0e0',
              color: config.lowResource ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {config.lowResource ? '✓ Low Resource Mode' : 'Low Resource Mode'}
          </button>
          <span style={{ fontSize: '12px', color: '#666' }}>
            Seed: {config.seed}
          </span>
          <button
            onClick={() => setConfig((prev) => ({ ...prev, seed: Math.floor(Math.random() * 10000) }))}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Randomize Seed
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          💡 Current: {modelConfig.name}
        </div>
      </div>
    </div>
  );
};

export default App;
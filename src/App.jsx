import React, { useRef, useState, useMemo } from 'react';
import AvatarCanvas from './components/AvatarCanvas';
import { SkeletonAdapter } from './adapters/gltfAdapter';
import './styles/main.scss';

const App = () => {
  const avatarRef = useRef(null);
  const [config, setConfig] = useState({
    intensity: 'normal',
    seed: Math.floor(Math.random() * 10000),
    lowResource: false,
  });

  // Create adapter
  const adapter = useMemo(() => new SkeletonAdapter(), []);

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
          config={config}
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
        <h2 style={{ margin: 0, fontSize: '18px' }}>Procedural Skeleton Animation</h2>

        {/* Animation Controls */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
          <span style={{ fontSize: '12px', color: '#666' }}>Seed: {config.seed}</span>
          <button
            onClick={() =>
              setConfig((prev) => ({ ...prev, seed: Math.floor(Math.random() * 10000) }))
            }
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
          💡 Using fixed humanoid skeleton with procedural animation
        </div>
      </div>
    </div>
  );
};

export default App;

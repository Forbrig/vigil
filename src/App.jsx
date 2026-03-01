import React, { useRef, useState } from 'react';
import AvatarCanvas from './components/AvatarCanvas';
import './styles/main.scss';

const App = () => {
  const avatarRef = useRef(null);
  const [config, setConfig] = useState({
    intensity: 'normal',
    seed: Math.floor(Math.random() * 10000),
    lowResource: false,
  });

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
        }}
      >
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
        <button
          onClick={handleToggleLowResource}
          style={{
            padding: '8px 16px',
            backgroundColor: config.lowResource ? '#ff6b6b' : '#e0e0e0',
            color: config.lowResource ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {config.lowResource ? 'Low Resource Mode (ON)' : 'Low Resource Mode (OFF)'}
        </button>
      </div>
    </div>
  );
};

export default App;
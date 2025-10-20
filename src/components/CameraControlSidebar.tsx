import { useState, useEffect, CSSProperties } from 'react';

// Camera Control Sidebar Component
const CameraControlSidebar = ({ camera, onClose, onUpdate, darkMode }) => {
  const [activeTab, setActiveTab] = useState('detection');
  const [config, setConfig] = useState({
    activeModels: camera?.active_models || [],
    features: camera?.features || {
      detection: true,
      tracking: false,
      speed: false,
      counting: false
    },
    trackingConfig: {
      max_disappeared: 30,
      max_distance: 100,
      enable_speed: true
    },
    calibration: {
      isCalibrated: camera?.is_calibrated || false,
      pixelsPerMeter: camera?.pixels_per_meter || null,
      mode: camera?.calibration_mode || null
    }
  });

  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [referenceDistance, setReferenceDistance] = useState('');

  // Available models from backend
  const availableModels = [
    { id: 'ppe_detection', name: 'PPE Detection', color: '#2196f3' },
    { id: 'face_detection', name: 'Face Mask Detection', color: '#ff0000' },
    { id: 'fire_detection', name: 'Fire Detection', color: '#ff9800' },
    { id: 'weapon_detection', name: 'Weapon Detection', color: '#f44336' },
    { id: 'general_detection', name: 'General Detection', color: '#9c27b0' }
  ];

  // Handle model toggle
  const toggleModel = (modelId) => {
    setConfig(prev => ({
      ...prev,
      activeModels: prev.activeModels.includes(modelId)
        ? prev.activeModels.filter(id => id !== modelId)
        : [...prev.activeModels, modelId]
    }));
  };

  // Handle feature toggle
  const toggleFeature = (feature) => {
    setConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  // Start calibration
  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationPoints([]);
  };

  // Add calibration point
  const addCalibrationPoint = (pixelX, pixelY, realX, realY) => {
    setCalibrationPoints(prev => [
      ...prev,
      { pixel_x: pixelX, pixel_y: pixelY, real_x: realX, real_y: realY }
    ]);
  };

  // Submit calibration
  const submitCalibration = async () => {
    if (calibrationPoints.length < 2) {
      alert('Need at least 2 points for calibration');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/cameras/${camera.id}/calibrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'reference_object',
          points: calibrationPoints,
          reference_width_meters: parseFloat(referenceDistance)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          calibration: {
            isCalibrated: true,
            pixelsPerMeter: data.pixels_per_meter,
            mode: data.calibration_mode
          }
        }));
        setIsCalibrating(false);
        alert('Calibration successful!');
      }
    } catch (error) {
      console.error('Calibration error:', error);
      alert('Calibration failed');
    }
  };

  // Apply changes
  const applyChanges = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/cameras/${camera.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: config.features,
          active_models: config.activeModels
        })
      });

      if (response.ok) {
        const updatedCamera = await response.json();
        onUpdate(updatedCamera);
        alert('Configuration updated successfully!');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update configuration');
    }
  };

  const sidebarStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    height: '100vh',
    background: darkMode ? '#1e1e1e' : '#ffffff',
    borderLeft: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease-out',
  };

  const headerStyle = {
    padding: '20px',
    borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
    background: darkMode ? '#252525' : '#f5f5f5',
  };

  const tabStyle = (active) => ({
    padding: '12px 20px',
    border: 'none',
    background: active ? (darkMode ? '#333' : '#e0e0e0') : 'transparent',
    color: darkMode ? '#fff' : '#000',
    cursor: 'pointer',
    borderBottom: active ? '2px solid #4caf50' : 'none',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'all 0.2s',
  });

  const contentStyle: CSSProperties = {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
  };

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    background: '#4caf50',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background 0.2s',
  };

  const modelCardStyle = (isActive, color) => ({
    padding: '12px',
    marginBottom: '12px',
    border: `2px solid ${isActive ? color : (darkMode ? '#333' : '#e0e0e0')}`,
    borderRadius: '8px',
    background: isActive ? `${color}10` : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const switchStyle = (checked): CSSProperties => ({
    position: 'relative',
    width: '48px',
    height: '24px',
    background: checked ? '#4caf50' : (darkMode ? '#555' : '#ccc'),
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  });

  const switchKnobStyle = (checked) : CSSProperties => ({
    position: 'absolute',
    top: '2px',
    left: checked ? '26px' : '2px',
    width: '20px',
    height: '20px',
    background: 'white',
    borderRadius: '50%',
    transition: 'left 0.2s',
  });

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        button:hover { opacity: 0.9; }
      `}</style>

      <div style={sidebarStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: darkMode ? '#fff' : '#000' }}>
              Camera Controls
            </h2>
            <button
              onClick={onClose}
              style={{
                ...buttonStyle,
                background: 'transparent',
                color: darkMode ? '#fff' : '#000',
                fontSize: '24px',
                padding: '4px 12px',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '14px', color: darkMode ? '#aaa' : '#666' }}>
            {camera?.name} • {camera?.location}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', marginTop: '16px', gap: '4px' }}>
            <button style={tabStyle(activeTab === 'detection')} onClick={() => setActiveTab('detection')}>
              Detection
            </button>
            <button style={tabStyle(activeTab === 'tracking')} onClick={() => setActiveTab('tracking')}>
              Tracking
            </button>
            <button style={tabStyle(activeTab === 'calibration')} onClick={() => setActiveTab('calibration')}>
              Calibration
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* Detection Tab */}
          {activeTab === 'detection' && (
            <div>
              <h3 style={{ marginTop: 0, color: darkMode ? '#fff' : '#000' }}>AI Detection Models</h3>
              <p style={{ fontSize: '13px', color: darkMode ? '#aaa' : '#666', marginBottom: '20px' }}>
                Select which AI models to run on this camera
              </p>

              {availableModels.map(model => (
                <div
                  key={model.id}
                  style={modelCardStyle(config.activeModels.includes(model.id), model.color)}
                  onClick={() => toggleModel(model.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#000' }}>
                        {model.name}
                      </div>
                      <div style={{ fontSize: '12px', color: darkMode ? '#aaa' : '#666', marginTop: '4px' }}>
                        Model ID: {model.id}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: config.activeModels.includes(model.id) ? model.color : (darkMode ? '#444' : '#ddd'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold',
                      }}
                    >
                      {config.activeModels.includes(model.id) && '✓'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tracking Tab */}
          {activeTab === 'tracking' && (
            <div>
              <h3 style={{ marginTop: 0, color: darkMode ? '#fff' : '#000' }}>Tracking Configuration</h3>

              {/* Features */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', color: darkMode ? '#aaa' : '#666', marginBottom: '12px' }}>
                  FEATURES
                </h4>

                {[
                  { key: 'tracking', label: 'Object Tracking', desc: 'Track objects across frames with unique IDs' },
                  { key: 'speed', label: 'Speed Detection', desc: 'Calculate object speed (requires calibration)' },
                  { key: 'counting', label: 'Object Counting', desc: 'Count objects entering/exiting zones' }
                ].map(feature => (
                  <div
                    key={feature.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: darkMode ? '#252525' : '#f5f5f5',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: darkMode ? '#fff' : '#000', marginBottom: '4px' }}>
                        {feature.label}
                      </div>
                      <div style={{ fontSize: '12px', color: darkMode ? '#aaa' : '#666' }}>
                        {feature.desc}
                      </div>
                    </div>
                    <div
                      style={switchStyle(config.features[feature.key])}
                      onClick={() => toggleFeature(feature.key)}
                    >
                      <div style={switchKnobStyle(config.features[feature.key])} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tracking Parameters */}
              {config.features.tracking && (
                <div>
                  <h4 style={{ fontSize: '14px', color: darkMode ? '#aaa' : '#666', marginBottom: '12px' }}>
                    TRACKING PARAMETERS
                  </h4>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: darkMode ? '#fff' : '#000' }}>
                      Max Disappeared Frames: {config.trackingConfig.max_disappeared}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={config.trackingConfig.max_disappeared}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        trackingConfig: { ...prev.trackingConfig, max_disappeared: parseInt(e.target.value) }
                      }))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: darkMode ? '#fff' : '#000' }}>
                      Max Distance (pixels): {config.trackingConfig.max_distance}
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={config.trackingConfig.max_distance}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        trackingConfig: { ...prev.trackingConfig, max_distance: parseInt(e.target.value) }
                      }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calibration Tab */}
          {activeTab === 'calibration' && (
            <div>
              <h3 style={{ marginTop: 0, color: darkMode ? '#fff' : '#000' }}>Camera Calibration</h3>

              {config.calibration.isCalibrated ? (
                <div style={{
                  padding: '16px',
                  background: '#4caf5020',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontWeight: 'bold', color: '#4caf50', marginBottom: '8px' }}>
                    ✓ Camera Calibrated
                  </div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#fff' : '#000' }}>
                    Pixels per meter: {config.calibration.pixelsPerMeter?.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#aaa' : '#666' }}>
                    Mode: {config.calibration.mode}
                  </div>
                  <button
                    style={{ ...buttonStyle, marginTop: '12px', background: '#ff9800' }}
                    onClick={startCalibration}
                  >
                    Recalibrate
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  background: darkMode ? '#252525' : '#f5f5f5',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#000', marginBottom: '8px' }}>
                    Not Calibrated
                  </div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#aaa' : '#666', marginBottom: '12px' }}>
                    Calibration is required for accurate speed detection and distance measurements.
                  </div>
                  <button style={buttonStyle} onClick={startCalibration}>
                    Start Calibration
                  </button>
                </div>
              )}

              {isCalibrating && (
                <div>
                  <h4 style={{ fontSize: '14px', color: darkMode ? '#aaa' : '#666', marginBottom: '12px' }}>
                    CALIBRATION WIZARD
                  </h4>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: darkMode ? '#fff' : '#000' }}>
                      Reference Distance (meters):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={referenceDistance}
                      onChange={(e) => setReferenceDistance(e.target.value)}
                      placeholder="e.g., 2.0"
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${darkMode ? '#444' : '#ccc'}`,
                        background: darkMode ? '#333' : '#fff',
                        color: darkMode ? '#fff' : '#000',
                      }}
                    />
                  </div>

                  <div style={{
                    padding: '12px',
                    background: darkMode ? '#1a3a1a' : '#e8f5e9',
                    border: '1px solid #4caf50',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: darkMode ? '#fff' : '#000',
                    marginBottom: '16px',
                  }}>
                    <strong>Instructions:</strong>
                    <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      <li>Place a reference object of known length in the camera view</li>
                      <li>Click on both ends of the object in the video feed</li>
                      <li>Enter the real-world distance above</li>
                      <li>Click Submit Calibration</li>
                    </ol>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong>Calibration Points: {calibrationPoints.length}/2</strong>
                  </div>

                  <button
                    style={{
                      ...buttonStyle,
                      background: calibrationPoints.length >= 2 ? '#4caf50' : '#ccc',
                      cursor: calibrationPoints.length >= 2 ? 'pointer' : 'not-allowed',
                    }}
                    onClick={submitCalibration}
                    disabled={calibrationPoints.length < 2}
                  >
                    Submit Calibration
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          background: darkMode ? '#252525' : '#f5f5f5',
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{ ...buttonStyle, flex: 1 }}
              onClick={applyChanges}
            >
              Apply Changes
            </button>
            <button
              style={{
                ...buttonStyle,
                flex: 1,
                background: darkMode ? '#444' : '#ccc',
                color: darkMode ? '#fff' : '#000',
              }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            color: darkMode ? '#aaa' : '#666',
            textAlign: 'center',
          }}>
            {config.activeModels.length} models • {Object.values(config.features).filter(Boolean).length} features enabled
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1299,
        }}
      />
    </>
  );
};

export default CameraControlSidebar;
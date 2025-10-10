import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

interface AvatarPosition {
  mouthX: number
  mouthY: number
  mouthSize: number
  mouthRegionWidth: number
  mouthRegionHeight: number
  eyeX: number
  eyeY: number
  eyeSpacing: number
  eyeSize: number
}

const AvatarPositionControls = () => {
  const { avatarConfig, setAvatarConfig, setShowPositionControls, avatarRenderMode, setAvatarRenderMode } = useAppStore()

  const [position, setPosition] = useState<AvatarPosition>({
    mouthX: avatarConfig.mouthX || 50,
    mouthY: avatarConfig.mouthY || 70,
    mouthSize: avatarConfig.mouthSize || 1.0,
    mouthRegionWidth: avatarConfig.mouthRegionWidth || 30,
    mouthRegionHeight: avatarConfig.mouthRegionHeight || 20,
    eyeX: avatarConfig.eyeX || 50,
    eyeY: avatarConfig.eyeY || 40,
    eyeSpacing: avatarConfig.eyeSpacing || 1.0,
    eyeSize: avatarConfig.eyeSize || 1.0,
  })

  const [showControls, setShowControls] = useState(false)

  // Auto-detect available modes
  const hasAIVariations = avatarConfig.generatedVariations && Object.keys(avatarConfig.generatedVariations).length > 0

  // Update avatar config in real-time as sliders change
  const handlePositionChange = (updates: Partial<AvatarPosition>) => {
    const newPosition = { ...position, ...updates }
    setPosition(newPosition)

    // Update the store immediately for real-time feedback
    setAvatarConfig({
      ...avatarConfig,
      mouthX: newPosition.mouthX,
      mouthY: newPosition.mouthY,
      mouthSize: newPosition.mouthSize,
      mouthRegionWidth: newPosition.mouthRegionWidth,
      mouthRegionHeight: newPosition.mouthRegionHeight,
      eyeX: newPosition.eyeX,
      eyeY: newPosition.eyeY,
      eyeSpacing: newPosition.eyeSpacing,
      eyeSize: newPosition.eyeSize,
    })
  }

  const handleSave = () => {
    setShowControls(false)
    setShowPositionControls(false)
  }

  const handleReset = () => {
    const defaultPosition = {
      mouthX: 50,
      mouthY: 70,
      mouthSize: 1.0,
      mouthRegionWidth: 30,
      mouthRegionHeight: 20,
      eyeX: 50,
      eyeY: 40,
      eyeSpacing: 1.0,
      eyeSize: 1.0,
    }
    setPosition(defaultPosition)
    setAvatarConfig({
      ...avatarConfig,
      ...defaultPosition,
    })
  }

  const handleOpen = () => {
    setShowControls(true)
    setShowPositionControls(true)
  }

  const handleClose = () => {
    setShowControls(false)
    setShowPositionControls(false)
  }

  if (!avatarConfig.uploadedImage) {
    return null
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="btn-secondary text-sm"
        title="Adjust mouth and eye positions"
      >
        ⚙️ Adjust Position
      </button>

      {showControls && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Adjust Avatar</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Fine-tune appearance for natural animation
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Mode Toggle */}
            {hasAIVariations && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rendering Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAvatarRenderMode('ai')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      avatarRenderMode === 'ai'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ✨ AI Mode
                  </button>
                  <button
                    onClick={() => setAvatarRenderMode('overlay')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      avatarRenderMode === 'overlay'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    🎨 Overlay Mode
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {avatarRenderMode === 'ai'
                    ? '✨ Using AI-generated photorealistic mouth variations'
                    : '🎨 Using drawn mouth overlay (faster, less realistic)'}
                </p>
              </div>
            )}

            {/* Unified Controls */}
            <div className="space-y-6">
              {/* Mouth Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mouth Position: {position.mouthX}%, {position.mouthY}%
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={position.mouthX}
                      onChange={(e) => handlePositionChange({ mouthX: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">Horizontal</div>
                  </div>
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={position.mouthY}
                      onChange={(e) => handlePositionChange({ mouthY: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">Vertical</div>
                  </div>
                </div>
              </div>

              {/* Mouth Size (Overlay) / Region Size (AI) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {avatarRenderMode === 'ai'
                    ? `Mouth Region: ${position.mouthRegionWidth}% × ${position.mouthRegionHeight}%`
                    : `Mouth Size: ${position.mouthSize.toFixed(1)}x`}
                </label>
                {avatarRenderMode === 'ai' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={position.mouthRegionWidth}
                        onChange={(e) => handlePositionChange({ mouthRegionWidth: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 text-center mt-1">Width</div>
                    </div>
                    <div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        value={position.mouthRegionHeight}
                        onChange={(e) => handlePositionChange({ mouthRegionHeight: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 text-center mt-1">Height</div>
                    </div>
                  </div>
                ) : (
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={position.mouthSize}
                    onChange={(e) => handlePositionChange({ mouthSize: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                )}
              </div>

              {/* Eye Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eye Position: {position.eyeX}%, {position.eyeY}%
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={position.eyeX}
                      onChange={(e) => handlePositionChange({ eyeX: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">Horizontal</div>
                  </div>
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={position.eyeY}
                      onChange={(e) => handlePositionChange({ eyeY: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">Vertical</div>
                  </div>
                </div>
              </div>

              {/* Eye Spacing and Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Eye Spacing: {position.eyeSpacing.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="2.0"
                    step="0.1"
                    value={position.eyeSpacing}
                    onChange={(e) => handlePositionChange({ eyeSpacing: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Eye Size: {position.eyeSize.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="1.5"
                    step="0.1"
                    value={position.eyeSize}
                    onChange={(e) => handlePositionChange({ eyeSize: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button onClick={handleReset} className="btn-secondary flex-1">
                Reset
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AvatarPositionControls

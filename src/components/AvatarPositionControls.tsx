import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

interface AvatarPosition {
  mouthX: number // 0-100 (percentage)
  mouthY: number // 0-100 (percentage)
  mouthSize: number // 0.5-2.0 (scale)
  eyeY: number // 0-100 (percentage)
  eyeSpacing: number // 0.5-2.0 (scale)
}

const AvatarPositionControls = () => {
  const { avatarConfig, setAvatarConfig } = useAppStore()

  const [position, setPosition] = useState<AvatarPosition>({
    mouthX: avatarConfig.mouthX || 50,
    mouthY: avatarConfig.mouthY || 70,
    mouthSize: avatarConfig.mouthSize || 1.0,
    eyeY: avatarConfig.eyeY || 40,
    eyeSpacing: avatarConfig.eyeSpacing || 1.0,
  })

  const [showControls, setShowControls] = useState(false)

  const handleSave = () => {
    setAvatarConfig({
      ...avatarConfig,
      mouthX: position.mouthX,
      mouthY: position.mouthY,
      mouthSize: position.mouthSize,
      eyeY: position.eyeY,
      eyeSpacing: position.eyeSpacing,
    })
    setShowControls(false)
  }

  const handleReset = () => {
    const defaultPosition = {
      mouthX: 50,
      mouthY: 70,
      mouthSize: 1.0,
      eyeY: 40,
      eyeSpacing: 1.0,
    }
    setPosition(defaultPosition)
    setAvatarConfig({
      ...avatarConfig,
      ...defaultPosition,
    })
  }

  if (!avatarConfig.uploadedImage) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowControls(true)}
        className="btn-secondary text-sm"
        title="Adjust mouth and eye positions"
      >
        ⚙️ Adjust Position
      </button>

      {showControls && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Adjust Avatar Position</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Fine-tune mouth and eye positions to match your photo
                </p>
              </div>
              <button
                onClick={() => setShowControls(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Mouth Horizontal Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mouth Horizontal Position: {position.mouthX}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="70"
                  value={position.mouthX}
                  onChange={(e) =>
                    setPosition({ ...position, mouthX: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>← Left</span>
                  <span>Right →</span>
                </div>
              </div>

              {/* Mouth Vertical Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mouth Vertical Position: {position.mouthY}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="85"
                  value={position.mouthY}
                  onChange={(e) =>
                    setPosition({ ...position, mouthY: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>↑ Higher</span>
                  <span>Lower ↓</span>
                </div>
              </div>

              {/* Mouth Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mouth Size: {position.mouthSize.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={position.mouthSize}
                  onChange={(e) =>
                    setPosition({ ...position, mouthSize: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Smaller</span>
                  <span>Larger</span>
                </div>
              </div>

              {/* Eye Vertical Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eye Vertical Position: {position.eyeY}%
                </label>
                <input
                  type="range"
                  min="25"
                  max="55"
                  value={position.eyeY}
                  onChange={(e) =>
                    setPosition({ ...position, eyeY: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>↑ Higher</span>
                  <span>Lower ↓</span>
                </div>
              </div>

              {/* Eye Spacing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eye Spacing: {position.eyeSpacing.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={position.eyeSpacing}
                  onChange={(e) =>
                    setPosition({ ...position, eyeSpacing: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>← Closer</span>
                  <span>Further →</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Adjust positions while the avatar is speaking to see
                real-time changes
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleReset} className="btn-secondary flex-1">
                Reset to Default
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AvatarPositionControls

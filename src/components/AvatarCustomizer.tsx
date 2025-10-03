import { useAppStore } from '../store/useAppStore'
import type { AvatarConfig } from '../types'

const AvatarCustomizer = () => {
  const { avatarConfig, setAvatarConfig, setShowAvatarCustomizer } = useAppStore()

  const updateConfig = (updates: Partial<AvatarConfig>) => {
    setAvatarConfig({ ...avatarConfig, ...updates })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Customize Avatar</h2>
            <button
              onClick={() => setShowAvatarCustomizer(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Skin Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Skin Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {['#F4C2A0', '#E8B59A', '#D4A373', '#A67C52', '#8B6F47', '#6B4423'].map(
                (color) => (
                  <button
                    key={color}
                    onClick={() => updateConfig({ skinColor: color })}
                    className={`w-10 h-10 rounded-full border-4 ${
                      avatarConfig.skinColor === color
                        ? 'border-primary-600'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
          </div>

          {/* Hair Style */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hair Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['short', 'long', 'curly', 'bald'].map((style) => (
                <button
                  key={style}
                  onClick={() =>
                    updateConfig({
                      hairStyle: style as AvatarConfig['hairStyle'],
                    })
                  }
                  className={`px-4 py-2 rounded-lg border-2 capitalize ${
                    avatarConfig.hairStyle === style
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          {avatarConfig.hairStyle !== 'bald' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hair Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {['#000000', '#6B4423', '#8B4513', '#D2691E', '#FFD700', '#FF6347'].map(
                  (color) => (
                    <button
                      key={color}
                      onClick={() => updateConfig({ hairColor: color })}
                      className={`w-10 h-10 rounded-full border-4 ${
                        avatarConfig.hairColor === color
                          ? 'border-primary-600'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Eye Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Eye Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {['#4A5568', '#8B4513', '#2E7D32', '#1976D2', '#7B1FA2'].map((color) => (
                <button
                  key={color}
                  onClick={() => updateConfig({ eyeColor: color })}
                  className={`w-10 h-10 rounded-full border-4 ${
                    avatarConfig.eyeColor === color
                      ? 'border-primary-600'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Glasses */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Glasses
            </label>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={avatarConfig.hasGlasses}
                  onChange={(e) =>
                    updateConfig({
                      hasGlasses: e.target.checked,
                      glassesStyle: e.target.checked ? 'round' : 'none',
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Wear Glasses</span>
              </label>
            </div>

            {avatarConfig.hasGlasses && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['round', 'square'].map((style) => (
                  <button
                    key={style}
                    onClick={() =>
                      updateConfig({
                        glassesStyle: style as AvatarConfig['glassesStyle'],
                      })
                    }
                    className={`px-4 py-2 rounded-lg border-2 capitalize ${
                      avatarConfig.glassesStyle === style
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Accessory */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Accessory
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['none', 'earrings', 'hat', 'bow'].map((accessory) => (
                <button
                  key={accessory}
                  onClick={() =>
                    updateConfig({
                      accessory: accessory as AvatarConfig['accessory'],
                    })
                  }
                  className={`px-4 py-2 rounded-lg border-2 capitalize ${
                    avatarConfig.accessory === accessory
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {accessory}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200">
          <button
            onClick={() => setShowAvatarCustomizer(false)}
            className="btn-primary w-full"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default AvatarCustomizer

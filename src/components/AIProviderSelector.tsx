import { useAppStore } from '../store/useAppStore'

/**
 * AI Provider Selector Component
 * Allows users to choose which AI image generation service to use
 */
const AIProviderSelector = () => {
  const { aiProvider, setAiProvider } = useAppStore()

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">AI Provider:</label>
      <select
        value={aiProvider}
        onChange={(e) => setAiProvider(e.target.value as 'bfl' | 'fal' | 'replicate' | 'auto')}
        className="px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-primary-500 focus:border-primary-500 focus:outline-none transition-colors"
      >
        <option value="auto">🤖 Auto (Fastest Available)</option>
        <option value="bfl">🌲 Black Forest Labs (Direct)</option>
        <option value="fal">⚡ fal.ai</option>
        <option value="replicate">🔄 Replicate</option>
      </select>

      <div className="group relative">
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="hidden group-hover:block absolute right-0 top-6 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50">
          <div className="space-y-2">
            <div>
              <strong>Auto:</strong> Uses fastest available (BFL &gt; fal.ai &gt; Replicate)
            </div>
            <div>
              <strong>Black Forest Labs:</strong> Official API, highest quality, ~$0.04 per image
            </div>
            <div>
              <strong>fal.ai:</strong> Fast (2-4s/image), ~$0.02-0.05 per image
            </div>
            <div>
              <strong>Replicate:</strong> Reliable alternative, ~$0.03-0.10 per image
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
            Add <code>BFL_API_KEY</code>, <code>FAL_API_KEY</code>, or <code>REPLICATE_API_KEY</code> to <code>.dev.vars</code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIProviderSelector

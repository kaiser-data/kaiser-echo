import { useAppStore } from '../store/useAppStore'

const LanguageSelector = () => {
  const { language, setLanguage } = useAppStore()

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          language === 'en'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        🇬🇧 English
      </button>
      <button
        onClick={() => setLanguage('de')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          language === 'de'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        🇩🇪 Deutsch
      </button>
    </div>
  )
}

export default LanguageSelector

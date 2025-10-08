import { useState, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

const AvatarUploader = () => {
  const { avatarConfig, setShowAvatarCustomizer } = useAppStore()
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    avatarConfig.uploadedImage || null
  )
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedImage(result)

      // Save to localStorage
      try {
        localStorage.setItem('kaiser-echo-avatar-image', result)

        // Update store to use uploaded avatar
        const store = useAppStore.getState()
        store.setAvatarConfig({
          ...store.avatarConfig,
          uploadedImage: result,
        })
      } catch (error) {
        console.error('Failed to save avatar:', error)
        alert('Image too large for storage. Try a smaller image.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    localStorage.removeItem('kaiser-echo-avatar-image')

    const store = useAppStore.getState()
    store.setAvatarConfig({
      ...store.avatarConfig,
      uploadedImage: undefined,
    })
  }

  return (
    <div className="card max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Upload Your Avatar
      </h3>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary-600 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {uploadedImage ? (
          <div className="space-y-4">
            <img
              src={uploadedImage}
              alt="Uploaded avatar"
              className="w-48 h-48 object-contain mx-auto rounded-lg"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClick()
                }}
                className="btn-secondary text-sm"
              >
                Change Image
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveImage()
                }}
                className="btn-secondary text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📸</div>
            <div className="text-gray-700 font-medium">
              Drop your portrait here
            </div>
            <div className="text-sm text-gray-500">
              or click to browse
            </div>
            <div className="text-xs text-gray-400">
              PNG, JPG or GIF • Max 5MB
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600 space-y-2">
        <p className="font-medium">💡 Tips for best results:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Use a front-facing portrait or cartoon image</li>
          <li>Clear face visibility with neutral expression</li>
          <li>Good lighting and contrast</li>
          <li>Square or portrait orientation works best</li>
        </ul>
      </div>

      <button
        onClick={() => setShowAvatarCustomizer(false)}
        className="btn-secondary w-full mt-4"
      >
        Close
      </button>
    </div>
  )
}

export default AvatarUploader

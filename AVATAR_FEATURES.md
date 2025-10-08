# Kaiser Echo - Realistic Talking Avatar Feature

## Overview

The Kaiser Echo voice agent now includes an advanced phoneme-based lip-sync system that allows users to upload their own portrait or cartoon avatar and have it animate realistically when speaking.

## Features

### 1. **Image Upload**
- Users can upload their own portrait, photo, or cartoon character
- Supports PNG, JPG, and GIF formats
- Maximum file size: 5MB
- Drag-and-drop or click to browse
- Images stored in browser localStorage for persistence

### 2. **Phoneme-Based Lip-Sync**
- Real-time mouth animation based on speech phonemes
- 9 distinct mouth shapes following Preston Blair animation standards:
  - **A**: Rest position (closed mouth)
  - **B**: Wide open (vowels like "ah", "aa")
  - **C**: Tight-lipped (consonants like "m", "b", "p")
  - **D**: Narrow open (vowels like "eh", "ae")
  - **E**: Round/puckered (vowels like "oo", "oh")
  - **F**: Upper teeth on lower lip ("f", "v")
  - **G**: Tongue visible ("th", "dh")
  - **H**: Wide/flat (vowels like "ee")
  - **X**: Silence/pause

### 3. **Realistic Animation**
- Automated phoneme detection from text-to-speech
- Smooth mouth shape transitions
- Natural blinking animation
- Emotion overlays (happy, thinking)
- Works with both English and German languages

### 4. **Dual Avatar System**
- **Simple Avatar**: Customizable 2D cartoon (original)
- **Realistic Avatar**: User-uploaded photo with phoneme lip-sync (new)
- Automatic switching based on whether image is uploaded
- Customize avatar appearance or upload your own

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────┐
│         VoiceInterface                  │
│   (TTS + Phoneme Detection)             │
└────────────┬────────────────────────────┘
             │
             ▼
     ┌───────────────────┐
     │ PhonemeSyncManager│ (Global State)
     └───────┬───────────┘
             │
             ▼
     ┌───────────────────┐
     │ RealisticAvatar   │
     │  (Canvas Renderer)│
     └───────────────────┘
```

### Key Components

1. **`usePhonemeDetection.ts`**
   - Web Audio API-based phoneme detection hook
   - Analyzes speech frequency spectrum
   - Maps frequencies to mouth shapes
   - Text-based phoneme estimation fallback

2. **`phonemeSync.ts`**
   - Global phoneme state manager
   - Synchronizes TTS with avatar animation
   - Publisher-subscriber pattern for component communication
   - Text-to-phoneme conversion engine

3. **`RealisticAvatar.tsx`**
   - Canvas-based rendering system
   - Dynamic mouth sprite generation
   - Real-time phoneme-driven animation
   - Blink and emotion overlays

4. **`AvatarUploader.tsx`**
   - Image upload UI component
   - File validation and size checking
   - LocalStorage persistence
   - Drag-and-drop support

### Phoneme Detection Algorithm

The system uses a hybrid approach:

1. **Frequency-Based Detection** (when audio available):
   - Analyzes low (0-2kHz), mid (2-4kHz), and high (4-6kHz) frequency bands
   - Maps frequency distributions to phoneme types
   - Real-time detection at ~60 FPS

2. **Text-Based Estimation** (fallback for TTS):
   - Parses text character by character
   - Maps characters/digraphs to phonemes
   - Estimates timing based on word count
   - Supports English and German

### Mouth Sprite System

Mouth shapes are generated procedurally:

```typescript
// Example: Wide open mouth (phoneme B)
{
  scaleY: 1.5,      // Vertical stretch
  scaleX: 1.2,      // Horizontal stretch
  openness: 1.0,    // Fully open
  color: 'rgba(60,40,40,1.0)'  // Dark inner mouth
}
```

Each phoneme has unique parameters for realistic appearance.

## User Guide

### How to Use the Realistic Avatar

1. **Upload Your Avatar**:
   - Click "📸 Upload Avatar" button
   - Drag and drop your image or click to browse
   - Wait for image to load and process

2. **Test the Animation**:
   - Click the microphone button
   - Speak in English or German
   - Watch your avatar's mouth animate in real-time!

3. **Change or Remove**:
   - Click "🖼️ Change Avatar" to upload a different image
   - Click "Remove" to delete and return to simple avatar

### Best Practices for Avatar Images

✅ **Good Images**:
- Front-facing portraits
- Clear face visibility
- Neutral expression works best
- Good lighting and contrast
- Square or portrait orientation

❌ **Avoid**:
- Side profiles (won't work well)
- Images with mouth already open
- Low resolution or blurry photos
- Dark or low-contrast images

## Performance

- **Rendering**: 60 FPS smooth animation
- **Latency**: <100ms phoneme detection
- **Memory**: ~2-5MB per uploaded image
- **Compatibility**: Chrome, Edge, Firefox, Safari

## Bilingual Support

The system supports both English and German:

**English Phonemes**:
- Vowels: ah, ee, eh, oo, oh, ae
- Consonants: m, b, p, f, v, th, s, z

**German Phonemes**:
- Umlauts: ä, ö, ü
- Special sounds: ch, sch, pf
- All standard German vowels and consonants

## Technical Details

### Phoneme Mapping Examples

```
"Hello"     → H-D-C-E-X
"How are"   → H-E-E-X-B-D-X
"you"       → H-E-E
"Hallo"     → H-B-C-E-X
"Guten Tag" → G-E-D-D-X-D-B-G
```

### Canvas Rendering Pipeline

```
1. Load uploaded image
2. Generate 9 phoneme mouth sprites
3. Subscribe to phoneme changes
4. Render loop (60 FPS):
   - Clear canvas
   - Draw current phoneme sprite
   - Add blink overlay if needed
   - Add emotion effects
5. Update on phoneme change
```

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Image Upload | ✅ | ✅ | ✅ | ✅ |
| Canvas Rendering | ✅ | ✅ | ✅ | ✅ |
| TTS Synthesis | ✅ | ✅ | ✅ | ✅ |
| Phoneme Detection | ✅ | ✅ | ⚠️* | ✅ |

*Safari has limited Web Audio API support for speech synthesis analysis

## Future Enhancements

Potential improvements for future versions:

1. **AI-Powered Phoneme Detection**:
   - Machine learning model for accurate phoneme classification
   - Real-time audio analysis via WebAssembly

2. **Advanced Facial Animation**:
   - Head movement and nodding
   - Eyebrow animations
   - Eye tracking and gaze direction

3. **3D Avatar Support**:
   - Three.js integration
   - Facial landmark detection
   - Full 3D head modeling

4. **Video Avatar**:
   - Face detection and tracking
   - Video-based lip-sync
   - Real-time face swap technology

## Troubleshooting

### Avatar Not Animating

1. **Check browser console** for errors
2. **Verify image uploaded** - you should see your photo
3. **Test TTS** - make sure speech is playing
4. **Try different browser** - Chrome/Edge recommended

### Image Not Loading

1. **File size** must be under 5MB
2. **Format** must be PNG, JPG, or GIF
3. **Clear browser cache** and try again
4. **Check console** for localStorage errors

### Poor Animation Quality

1. **Use better quality image** - higher resolution
2. **Ensure good lighting** in photo
3. **Front-facing portrait** works best
4. **Adjust phoneme sensitivity** (future feature)

## Credits

This implementation is inspired by:

- **Rhubarb Lip-Sync**: Open-source phoneme detection library
- **Preston Blair**: Classic animation mouth shapes
- **Web Speech API**: Browser-native TTS and recognition

## License

This feature is part of the Kaiser Echo demo project and follows the same license as the main application.

---

**Enjoy your realistic talking avatar! 🎭🗣️**

# AI-Generated Realistic Talking Avatar Setup

Complete guide for setting up photorealistic AI-generated mouth variations using Black Forest Labs FLUX.

## Overview

Instead of overlaying mouth shapes, this system generates 9 **photorealistic variations** of your uploaded photo with different mouth positions, then swaps between them in real-time for perfect lip-sync!

## Features

✅ **Photorealistic Quality** - FLUX generates perfect mouth positions
✅ **Your Credits** - Use Black Forest Labs API credits
✅ **Real-time Performance** - Pre-generated images swap instantly
✅ **9 Mouth Shapes** - Preston Blair phoneme set (A-H + X)
✅ **Automatic Caching** - Generated once, used forever
✅ **Fallback Mode** - Works with manual overlay if not generated

---

## Setup Options

### Option 1: **fal.ai (Recommended)** 🌟

**Pros:**
- Fast inference (2-4 seconds per image)
- FLUX Redux support
- Good API docs
- $5-10 free credits

**Setup:**
1. Get API key from https://fal.ai
2. Add to `.dev.vars`:
   ```
   FAL_API_KEY=your_key_here
   ```

**Cost:** ~$0.02-0.05 per variation × 9 = **$0.18-0.45 per photo**

### Option 2: **Replicate**

**Pros:**
- More models available
- Good documentation
- Pay-as-you-go

**Setup:**
1. Get API key from https://replicate.com
2. Add to `.dev.vars`:
   ```
   REPLICATE_API_KEY=r8_your_key_here
   ```

**Cost:** ~$0.03-0.10 per variation × 9 = **$0.27-0.90 per photo**

### Option 3: **Self-Hosted (100% Free!)**

Use your own GPU to run FLUX:

**RunPod:**
```bash
# Rent H100 for $0.69/hour
# Generate all 9 variations in ~2 minutes
# Total cost: ~$0.02 per photo
```

**Google Colab (Free):**
```python
# Free T4 GPU
# Run ComfyUI with FLUX
# Generate variations in ~5-10 minutes
# 100% FREE
```

---

## Usage Workflow

### For Users:

1. **Upload Avatar**
   - Click "📸 Upload Avatar"
   - Drop your photo (PNG/JPG)

2. **Generate AI Variations**
   - Click "✨ Generate AI Mouth"
   - Wait 30-60 seconds
   - Progress bar shows generation status

3. **Use AI Avatar**
   - Avatar automatically uses AI variations
   - Green indicator shows "Using AI-generated photorealistic variations"
   - Perfect lip-sync quality!

4. **Regenerate Anytime**
   - Click "🔄 Regenerate AI Mouth" to create new variations
   - Useful if you adjust positions or upload new photo

---

## Technical Details

### Generation Process

```
1. Upload Photo
   ↓
2. Click "Generate AI Mouth"
   ↓
3. Backend calls FLUX API 9 times:
   - Phoneme X: "mouth closed, lips together"
   - Phoneme A: "mouth slightly open, relaxed"
   - Phoneme B: "mouth wide open, saying ah"
   - Phoneme C: "lips pressed together, saying m"
   - Phoneme D: "mouth moderately open, saying eh"
   - Phoneme E: "lips rounded, saying oo"
   - Phoneme F: "teeth on lip, saying f"
   - Phoneme G: "tongue visible, saying th"
   - Phoneme H: "wide smile, saying ee"
   ↓
4. Save URLs to avatarConfig
   ↓
5. Frontend loads all 9 images
   ↓
6. Real-time swap during speech (60 FPS)
```

### API Integration

**Backend (Cloudflare Worker):**
```typescript
// api/services/flux.ts
export async function generateAllMouthVariations(
  env: Env,
  baseImageUrl: string
): Promise<Record<string, string>>
```

**Frontend Component:**
```typescript
// src/components/AIGenerationButton.tsx
const handleGenerate = async () => {
  const response = await fetch('/api/generate-variations', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl: avatarConfig.uploadedImage,
      sessionId: sessionId,
    }),
  })
}
```

### Caching Strategy

Generated variations are stored in:
1. **avatarConfig.generatedVariations** (Zustand state)
2. **localStorage** (persisted via zustand middleware)
3. **Optional**: Supabase for cross-device sync

---

## Environment Variables

Add to `.dev.vars` (backend):

```bash
# Choose ONE of these:
FAL_API_KEY=your_fal_key_here
# OR
BLACK_FOREST_API_KEY=your_bfl_key_here
# OR
REPLICATE_API_KEY=r8_your_replicate_key_here

# Existing keys
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Cost Comparison

| Provider | Cost per Photo | Speed | Quality |
|----------|---------------|-------|---------|
| **fal.ai** | $0.18-0.45 | ⚡ Fast (30s) | ⭐⭐⭐⭐⭐ Excellent |
| **Replicate** | $0.27-0.90 | 🐢 Slower (60s) | ⭐⭐⭐⭐⭐ Excellent |
| **RunPod** | $0.02 | ⚡⚡ Fastest (2min setup) | ⭐⭐⭐⭐⭐ Excellent |
| **Colab** | $0 FREE | 🐢 Slow (10min) | ⭐⭐⭐⭐ Good |

---

## Troubleshooting

### "Generation Failed" Error

**Check:**
1. API key configured in `.dev.vars`
2. Restart backend: `npm run worker:dev`
3. Check backend logs for API errors
4. Verify API key is valid and has credits

### "No face detected" Error

**Solution:**
- Use front-facing portrait
- Good lighting and clarity
- Face clearly visible
- Try different photo

### Slow Generation

**Tips:**
- First generation: 30-60 seconds (normal)
- Regeneration: Same time (creates new variations)
- Use fal.ai for fastest results
- Consider self-hosting for multiple photos

### Poor Quality Results

**Improve:**
- Use higher resolution photo (512x512 or larger)
- Good lighting in original photo
- Clear facial features
- Try adjusting position controls first

---

## Advanced: Self-Hosting Guide

### Using ComfyUI + FLUX

1. **Install ComfyUI:**
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI
   cd ComfyUI
   pip install -r requirements.txt
   ```

2. **Download FLUX Models:**
   - FLUX Dev: `black-forest-labs/FLUX.1-dev`
   - Place in `models/checkpoints/`

3. **Create Workflow:**
   - Load FLUX model
   - Add text conditioning with phoneme prompts
   - Output to API endpoint

4. **Deploy:**
   - **Local**: `python main.py`
   - **RunPod**: Use ComfyUI template
   - **Modal.com**: Serverless deployment

5. **Update Backend:**
   ```typescript
   // api/services/flux.ts
   const COMFYUI_URL = process.env.COMFYUI_URL
   ```

---

## Future Enhancements

**Planned Features:**
- ⏰ Progress tracking via WebSocket
- 📦 Batch generation (all 9 at once)
- 🎨 Style customization (realistic vs cartoon)
- 🔄 Auto-regenerate on photo change
- ☁️ Cloud storage for variations
- 🚀 ControlNet for pixel-perfect positioning

---

## Credits & License

- **FLUX** by Black Forest Labs
- **fal.ai** for fast inference
- **Rhubarb Lip-Sync** for phoneme standards
- **Preston Blair** for classic animation mouth shapes

This implementation is part of the Kaiser Echo demo project.

---

**Ready to generate photorealistic talking avatars! 🎭✨**

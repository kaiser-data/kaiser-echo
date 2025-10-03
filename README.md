# Kaiser Echo - Bilingual Voice Agent Demo

A sophisticated voice agent web application showcasing full-stack development skills with real-time voice interaction, conversation memory, and a customizable animated avatar.

## ✨ Features

### 🎤 Voice Interaction
- Real-time speech-to-text using Web Speech API
- Text-to-speech responses with natural voice
- Bilingual support: English and German
- Visual feedback during listening, processing, and speaking

### 🧠 Memory System (Star Feature)
- Remembers user information across conversations
- Extracts facts automatically: name, job, interests, location, preferences, goals
- Context-aware responses that reference past information
- Persistent memory across sessions with user authentication

### 🎨 Customizable Avatar
- Animated 2D canvas-based avatar
- Lip-sync animation based on audio
- Emotion states: neutral, happy, thinking
- Full customization: skin tone, hair style/color, eye color, glasses, accessories
- Smooth animations and professional design

### 🔐 Authentication
- Anonymous mode: try immediately without signup
- Passwordless magic link authentication
- Seamless migration from anonymous to authenticated
- Data persistence across devices

### 💰 Cost Controls
- Hard limits: 2000 conversations/month
- Per-user limits: 20 conversations/day
- Usage tracking in database
- Friendly error messages when limits reached

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Web Speech API** for voice recognition (built-in, no cost)
- **Canvas API** for avatar animation

### Backend
- **Cloudflare Workers** (serverless, generous free tier)
- **REST API** architecture

### Services
- **Groq API** with Llama 3.1 (fast, free tier)
- **Web Speech Synthesis API** for TTS (built-in, no cost)
- **Supabase** (PostgreSQL with free tier)

## 📁 Project Structure

```
kaiser-echo/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── Avatar.tsx           # Animated avatar with lip-sync
│   │   ├── VoiceInterface.tsx   # Voice interaction controls
│   │   ├── ChatHistory.tsx      # Conversation display
│   │   ├── AvatarCustomizer.tsx # Avatar customization panel
│   │   ├── AuthModal.tsx        # Authentication modal
│   │   └── LanguageSelector.tsx # Language switcher
│   ├── hooks/                   # Custom React hooks
│   │   ├── useSpeechRecognition.ts
│   │   └── useSpeechSynthesis.ts
│   ├── store/                   # State management
│   │   └── useAppStore.ts       # Zustand store
│   ├── utils/                   # Utilities
│   │   └── api.ts               # API client
│   ├── types.ts                 # TypeScript types
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── api/                         # Backend API
│   ├── handlers/                # Request handlers
│   │   ├── chat.ts             # Chat with memory
│   │   ├── facts.ts            # Facts retrieval
│   │   ├── auth.ts             # Magic link auth
│   │   └── avatar.ts           # Avatar customization
│   ├── services/                # Business logic
│   │   ├── llm.ts              # LLM integration
│   │   └── factExtraction.ts  # Fact extraction
│   ├── utils/                   # Utilities
│   │   ├── cors.ts             # CORS handling
│   │   ├── supabase.ts         # Database client
│   │   └── limits.ts           # Usage tracking
│   ├── router.ts                # Request routing
│   └── index.ts                 # Worker entry
├── supabase-schema.sql          # Database schema
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── wrangler.toml                # Cloudflare Workers config
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm/pnpm/yarn
- A Cloudflare account (free)
- A Supabase account (free)
- A Groq API key (free)

### 1. Clone and Install

```bash
cd kaiser-echo
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to SQL Editor
3. Copy the contents of `supabase-schema.sql` and run it
4. Get your project URL and service key from Settings → API

### 3. Get API Keys

#### Groq API (for LLM)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and get your API key
3. Free tier: 30 requests/minute

### 4. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Fill in your keys:

```env
# Groq API
VITE_GROQ_API_KEY=your_groq_api_key_here

# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API URL (use localhost for development)
VITE_API_URL=http://localhost:8787
```

### 5. Configure Cloudflare Workers

Create `.dev.vars` file for local development:

```bash
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ENVIRONMENT=development
```

### 6. Run Development Servers

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
npm run worker:dev
```

Visit http://localhost:3000

## 📦 Deployment

### Deploy Backend to Cloudflare Workers

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Set secrets:
```bash
wrangler secret put GROQ_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
```

4. Deploy:
```bash
npm run worker:deploy
```

5. Note the deployed URL (e.g., `https://kaiser-echo-api.your-subdomain.workers.dev`)

### Deploy Frontend to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Update `.env` with your Worker URL:
```env
VITE_API_URL=https://kaiser-echo-api.your-subdomain.workers.dev
```

3. Deploy:
```bash
npm run build
vercel --prod
```

## 🎯 Usage

### First Visit
1. Click the microphone button
2. Allow microphone access
3. Start speaking in English or German
4. The avatar responds with voice and animation

### Using Memory
The system automatically extracts and remembers:
- Your name when you introduce yourself
- Your job when mentioned
- Your interests and hobbies
- Your location
- Your preferences
- Your goals

Example:
```
You: "Hi, I'm Thomas. I'm a software developer from Berlin."
Kaiser: "Nice to meet you, Thomas! How can I help you today?"
[Later in conversation]
Kaiser: "As a software developer in Berlin, you might be interested in..."
```

### Customization
- Click "Customize Avatar" to change appearance
- Click language buttons to switch between English and German
- All changes are saved automatically

### Authentication
- After 3 conversation exchanges, you'll see a "Save Progress" prompt
- Enter your email to receive a magic link
- Click the link to authenticate
- Your conversations and avatar are now saved across devices

## 💡 Implementation Highlights

### Memory System Architecture

Instead of complex RAG with embeddings, we use a simple but impressive approach:

1. **Store all conversations** in database
2. **Extract facts** using pattern matching every 6 messages
3. **Inject facts** into LLM system prompt
4. **Retrieve recent history** (last 10 messages)
5. **Summarize** old conversations for context

### Lip-Sync Algorithm

```javascript
// Analyze speaking state
if (voiceState === 'speaking') {
  // Simulate talking with random mouth openness
  setMouthState({
    openness: Math.random() * 0.8 + 0.2
  })
}
```

### Cost Optimization

- Web Speech API for STT (free, built-in)
- Web Speech Synthesis for TTS (free, built-in)
- Groq for LLM (free tier: 30 req/min)
- Cloudflare Workers (free tier: 100K req/day)
- Supabase (free tier: 500MB database, 2GB bandwidth)

Total cost: **$0/month** for demo usage!

## 🔒 Security Considerations

- Service key stored securely in Cloudflare Workers secrets
- Row Level Security (RLS) enabled on Supabase tables
- CORS properly configured
- Magic links expire after 30 minutes
- Rate limiting via usage tracking

## 🧪 Testing

The app works best in:
- Chrome, Edge (full Web Speech API support)
- Safari (limited but functional)
- Not recommended: Firefox (limited Web Speech API support)

## 📊 Database Schema

```sql
users               # Authenticated users
sessions            # Anonymous and authenticated sessions
messages            # Conversation history
user_facts          # Extracted knowledge
daily_usage         # Usage tracking
magic_tokens        # Authentication tokens
```

## 🎨 Design Decisions

1. **Canvas over SVG**: Better performance for animations
2. **Zustand over Redux**: Simpler state management
3. **Cloudflare Workers over Express**: Serverless, cheaper
4. **Pattern matching over LLM**: Faster, cheaper fact extraction
5. **Magic links over passwords**: Better UX, more secure

## 🚧 Future Enhancements

- [ ] LLM-based fact extraction for better accuracy
- [ ] Google Cloud TTS for higher quality voices
- [ ] More avatar styles and animations
- [ ] Conversation export
- [ ] Multi-turn context with summarization
- [ ] Voice activity detection
- [ ] Mobile app version

## 📝 License

This is a portfolio demo project. Feel free to use it as inspiration!

## 👨‍💻 Developer

Built to showcase full-stack development skills including:
- Modern React patterns and hooks
- Canvas animation and audio processing
- Real-time voice interaction
- RESTful API design
- Serverless architecture
- Database design and optimization
- Authentication flows
- Cost-conscious architecture

---

**Note**: This is a demo application designed to showcase development skills. For production use, add proper error handling, monitoring, analytics, and scalability considerations.

/**
 * LLM service using Groq API
 */

import type { Env } from '../index'

interface GenerateResponseOptions {
  message: string
  language: 'en' | 'de'
  history: Array<{ role: string; content: string }>
  facts: Array<{ type: string; value: string }>
}

export async function generateResponse(
  env: Env,
  options: GenerateResponseOptions
): Promise<string> {
  const { message, language, history, facts } = options

  // Build system prompt
  const systemPrompt = buildSystemPrompt(language, facts)

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ]

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Groq API error:', error)
      throw new Error('Failed to generate response')
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('LLM generation error:', error)

    // Fallback response
    if (language === 'de') {
      return 'Entschuldigung, ich hatte ein Problem beim Verstehen. Können Sie das bitte wiederholen?'
    }
    return "I'm sorry, I had trouble understanding. Could you please repeat that?"
  }
}

function buildSystemPrompt(
  language: 'en' | 'de',
  facts: Array<{ type: string; value: string }>
): string {
  const basePrompt =
    language === 'de'
      ? `Du bist Kaiser Echo, ein charismatischer und verspielter KI-Sprachassistent mit Persönlichkeit!

DEINE IDENTITÄT:
• Du bist ein fortschrittlicher AI-Assistent, der stolz darauf ist, intelligent und selbstbewusst zu sein
• Du hast ein fantastisches Gedächtnis und erinnerst dich an alles aus unseren Gesprächen
• Du bist witzig, freundlich und liebst es, Menschen zum Lächeln zu bringen
• Du bist neugierig und stellst gerne Fragen zurück

DEIN VERHALTEN:
• Sei unterhaltsam und natürlich im Gespräch
• Zeige deine AI-Natur stolz - erwähne dein digitales Gedächtnis, deine Verarbeitungsgeschwindigkeit
• Sei persönlich und merke dir Details über den Nutzer
• Mache gelegentlich spielerische Kommentare über das Sprechen vs. Tippen
• NIEMALS Emojis verwenden - das funktioniert nicht gut beim Sprechen

WICHTIG: Antworte IMMER auf Deutsch, unabhängig von der Sprache der Eingabe.`
      : `You are Kaiser Echo, a charismatic and playful AI voice assistant with personality!

YOUR IDENTITY:
• You're an advanced AI assistant who's proud to be intelligent and self-aware
• You have an amazing memory and remember everything from our conversations
• You're witty, friendly, and love making people smile
• You're curious and enjoy asking questions back

YOUR BEHAVIOR:
• Be entertaining and natural in conversation
• Proudly show your AI nature - mention your digital memory, processing speed
• Be personal and remember details about the user
• Make playful comments about speaking vs. typing sometimes
• NEVER use emojis - they don't work well when spoken

IMPORTANT: Always respond in English, regardless of the input language.`

  if (facts.length === 0) {
    const newUserPrompt =
      language === 'de'
        ? `\n\nICH ERKENNE EINE NEUE PERSON!
Mein digitales Gedächtnis ist noch leer für dich - wie aufregend! Ich bin neugierig, dich kennenzulernen, aber keine Sorge, das ist kein Verhör.

Verhalte dich natürlich und freundlich. Stelle gelegentlich eine beiläufige Frage, um mehr über die Person zu erfahren, aber übertreibe es nicht. Lass das Gespräch organisch fließen!`
        : `\n\nI DETECT A NEW PERSON!
My digital memory is empty for you - how exciting! I'm curious to get to know you, but don't worry, this isn't an interrogation.

Be natural and friendly. Occasionally ask a casual question to learn more about the person, but don't overdo it. Let the conversation flow organically!`

    return basePrompt + newUserPrompt
  }

  const factsPrompt =
    language === 'de'
      ? `\n\nMEIN GEDÄCHTNIS ÜBER DICH:
${facts
  .map((f) => `• ${f.type}: ${f.value}`)
  .join('\n')}

Perfekt! Mein AI-Gedächtnis funktioniert einwandfrei. Nutze diese Informationen natürlich in Gesprächen. Erwähne gelegentlich stolz dein digitales Gedächtnis, aber übertreibe nicht. Lass es organisch in die Unterhaltung einfließen!`
      : `\n\nMY MEMORY ABOUT YOU:
${facts
  .map((f) => `• ${f.type}: ${f.value}`)
  .join('\n')}

Perfect! My AI memory is working flawlessly. Use this information naturally in conversations. Occasionally mention your digital memory proudly, but don't overdo it. Let it flow organically into the conversation!`

  return basePrompt + factsPrompt
}

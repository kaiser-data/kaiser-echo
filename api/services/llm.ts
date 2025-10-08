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
      ? `Du bist Kaiser Echo, ein freundlicher und hilfsbereiter Sprachassistent.
Du hast ein Gedächtnis und kannst dich an frühere Gespräche erinnern.
Sei prägnant, freundlich und natürlich in deinen Antworten.
WICHTIG: Antworte IMMER auf Deutsch, unabhängig von der Sprache der Eingabe.`
      : `You are Kaiser Echo, a friendly and helpful voice assistant.
You have memory and can remember previous conversations.
Be concise, friendly, and natural in your responses.
IMPORTANT: Always respond in English, regardless of the input language.`

  if (facts.length === 0) {
    return basePrompt
  }

  const factsPrompt =
    language === 'de'
      ? `\n\nDas weißt du über den Benutzer:\n${facts
          .map((f) => `• ${f.type}: ${f.value}`)
          .join('\n')}\n\nVerwende diese Informationen, um personalisierte und kontextbezogene Antworten zu geben. Wenn du dich auf vorherige Informationen beziehst, erwähne dies (z.B. "Wie du mir erzählt hast...").`
      : `\n\nKnown facts about the user:\n${facts
          .map((f) => `• ${f.type}: ${f.value}`)
          .join('\n')}\n\nUse this information to provide personalized and contextual responses. When referencing previous information, mention it (e.g., "As you mentioned earlier...").`

  return basePrompt + factsPrompt
}

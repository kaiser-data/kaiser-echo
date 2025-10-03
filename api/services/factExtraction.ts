/**
 * Fact extraction service
 * Simple pattern matching for now, can be enhanced with LLM
 */

interface Fact {
  type: 'name' | 'job' | 'interest' | 'preference' | 'location' | 'goal'
  value: string
  confidence: number
}

export async function extractFacts(conversationText: string): Promise<Fact[]> {
  const facts: Fact[] = []

  // Name extraction
  const namePatterns = [
    /(?:my name is|i'm|i am|ich heiße|ich bin)\s+([A-Z][a-z]+)/i,
    /(?:call me|nennen sie mich)\s+([A-Z][a-z]+)/i,
  ]

  for (const pattern of namePatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      facts.push({
        type: 'name',
        value: match[1],
        confidence: 0.9,
      })
    }
  }

  // Job extraction
  const jobPatterns = [
    /(?:i work as|i'm a|i am a|ich arbeite als|ich bin)\s+(?:a\s+)?([a-z\s]+(?:developer|engineer|designer|manager|teacher|doctor|nurse|artist|writer))/i,
    /(?:my job is|mein beruf ist)\s+([a-z\s]+)/i,
  ]

  for (const pattern of jobPatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      facts.push({
        type: 'job',
        value: match[1].trim(),
        confidence: 0.85,
      })
    }
  }

  // Interest extraction
  const interestPatterns = [
    /(?:i like|i love|i enjoy|i'm interested in|ich mag|ich liebe|ich interessiere mich für)\s+([a-z\s]+)/i,
    /(?:interested in|hobby|hobbies)\s+(?:is|are)?\s*([a-z\s]+)/i,
  ]

  for (const pattern of interestPatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      facts.push({
        type: 'interest',
        value: match[1].trim(),
        confidence: 0.8,
      })
    }
  }

  // Location extraction
  const locationPatterns = [
    /(?:i live in|i'm from|i am from|ich wohne in|ich komme aus)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:from|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(?:Germany|USA|UK|France)/i,
  ]

  for (const pattern of locationPatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      facts.push({
        type: 'location',
        value: match[1].trim(),
        confidence: 0.85,
      })
    }
  }

  // Preference extraction
  const preferencePatterns = [
    /(?:i prefer|ich bevorzuge)\s+([a-z\s]+)/i,
    /(?:better|lieber)\s+(?:than|als)\s+([a-z\s]+)/i,
  ]

  for (const pattern of preferencePatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      facts.push({
        type: 'preference',
        value: match[1].trim(),
        confidence: 0.75,
      })
    }
  }

  // Goal extraction
  const goalPatterns = [
    /(?:i want to|i'd like to|i plan to|ich möchte|ich plane)\s+([a-z\s]+)/i,
    /(?:my goal is|mein ziel ist)\s+([a-z\s]+)/i,
  ]

  for (const pattern of goalPatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      facts.push({
        type: 'goal',
        value: match[1].trim(),
        confidence: 0.8,
      })
    }
  }

  // Remove duplicates and return
  const uniqueFacts = facts.filter(
    (fact, index, self) =>
      index ===
      self.findIndex((f) => f.type === fact.type && f.value.toLowerCase() === fact.value.toLowerCase())
  )

  return uniqueFacts
}

# Professional Memory Management System

Kaiser Echo's advanced memory management system provides intelligent fact extraction, categorization, and personalized conversation enhancement.

## System Overview

### Core Features
- **LLM-Powered Fact Extraction**: Intelligent extraction using Groq LLM with fallback pattern matching
- **Hierarchical Categorization**: 8 main categories with structured subcategories
- **Quality Management**: Confidence scoring, verification, and importance ranking
- **Analytics & Insights**: Comprehensive memory analytics and conversation recommendations
- **Automatic Cleanup**: Expiration handling for temporary facts

### Architecture

```
Memory Manager
├── Fact Extraction Engine (LLM + Pattern Matching)
├── Storage & Validation (Deduplication + Similarity)
├── Memory Profile Builder (Hierarchical Organization)
├── Analytics Engine (Insights + Recommendations)
└── API Endpoints (CRUD + Analytics)
```

## Fact Categories

### 1. Identity 👤
- `identity.name`: Person's name
- `identity.age`: Age information
- `identity.gender`: Gender identity

### 2. Location 📍
- `location.residence`: Where they live
- `location.workplace`: Where they work
- `location.origin`: Where they're from

### 3. Profession 💼
- `profession.title`: Job title/role
- `profession.company`: Company name
- `profession.industry`: Industry sector
- `profession.experience`: Years of experience

### 4. Interests 🎯
- `interests.hobby`: Personal hobbies
- `interests.sport`: Sports activities
- `interests.music`: Musical preferences
- `interests.technology`: Tech interests
- `interests.entertainment`: Entertainment preferences

### 5. Preferences ⭐
- `preferences.food`: Food preferences
- `preferences.language`: Language preferences
- `preferences.style`: Style preferences

### 6. Relationships 👥
- `relationships.family`: Family information
- `relationships.friends`: Friend circles
- `relationships.status`: Relationship status

### 7. Goals 🎯
- `goals.personal`: Personal objectives
- `goals.professional`: Career goals
- `goals.learning`: Learning objectives

### 8. Context 💭
- `context.recent_topic`: Recently discussed topics
- `context.current_project`: Current projects (expires in 24h)

## Memory Quality System

### Confidence Scoring (0.0 - 1.0)
- **0.9-1.0**: High confidence (explicit statements)
- **0.7-0.8**: Medium confidence (clear implications)
- **0.5-0.6**: Low confidence (inferred information)

### Importance Levels
- **High**: Identity, core profession, residence
- **Medium**: Professional details, interests, goals
- **Low**: Context, temporary preferences

### Verification Status
- **Verified**: Confidence > 0.8 or explicitly confirmed
- **Unverified**: Needs validation

## API Endpoints

### GET /api/memory
Get complete memory profile and analytics
```
Query Parameters:
- sessionId (required)
- userId (optional)

Response:
{
  "success": true,
  "data": {
    "profile": {...},
    "analytics": {...},
    "summary": "Name: Martin • Job Title: Developer • Lives in: Berlin..."
  }
}
```

### PUT /api/memory/fact
Update specific fact
```
Body:
{
  "sessionId": "session_123",
  "factId": "fact_456",
  "value": "Updated value",
  "verified": true,
  "importance": "high"
}
```

### DELETE /api/memory/fact
Delete specific fact
```
Body:
{
  "sessionId": "session_123",
  "factId": "fact_456"
}
```

### POST /api/memory/extract
Force fact extraction from recent conversation
```
Body:
{
  "sessionId": "session_123",
  "userId": "user_789"
}
```

### GET /api/memory/insights
Get memory insights and recommendations
```
Query Parameters:
- sessionId (required)
- userId (optional)

Response:
{
  "success": true,
  "data": {
    "analytics": {...},
    "insights": {
      "completeness": 0.75,
      "quality": { "score": 0.82, "factors": {...} },
      "engagement": { "level": "high", "score": 0.85 },
      "recommendations": [...]
    }
  }
}
```

## Memory Analytics

### Completeness Score
Percentage of core categories filled (identity, location, profession, interests)

### Quality Assessment
- **Quantity**: Number of facts relative to ideal (20 facts)
- **Confidence**: Average confidence across all facts
- **Verification**: Percentage of verified facts
- **Diversity**: Number of different categories
- **Recency**: Recent memory activity

### Engagement Levels
- **Low**: < 3 total facts
- **Medium**: 3-8 facts
- **High**: > 8 facts with recent activity

### Recommendations Engine
Suggests conversation topics and engagement strategies based on memory gaps and patterns.

## LLM Integration

### System Prompt Enhancement
Memory facts are formatted with emojis and clear categorization:
```
👤 Name: Martin
💼 Job Title: Software Developer
📍 Lives in: Berlin
🎯 Technology: React, Node.js
```

### Memory Summary Format
Concise bullet-point format for efficient token usage while maintaining comprehensive information.

## Database Schema

### Enhanced user_facts Table
```sql
id (UUID, Primary Key)
user_id (UUID, Foreign Key)
session_id (VARCHAR)
fact_type (VARCHAR) -- e.g., "identity.name"
fact_value (TEXT)
confidence (DECIMAL)
context (TEXT) -- NEW: Surrounding conversation context
source (VARCHAR) -- NEW: 'conversation', 'explicit', 'inferred'
verified (BOOLEAN) -- NEW: Verification status
importance (VARCHAR) -- NEW: 'low', 'medium', 'high'
expires_at (TIMESTAMP) -- NEW: Optional expiration
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Performance Indexes
- `idx_user_facts_importance`
- `idx_user_facts_verified`
- `idx_user_facts_source`
- `idx_user_facts_expires_at`
- `idx_user_facts_fact_type_prefix`

## Usage Examples

### Basic Memory Retrieval
```typescript
const memoryManager = new MemoryManager(env)
const profile = await memoryManager.getMemoryProfile(sessionId, userId)
const summary = await memoryManager.generateMemorySummary(sessionId, userId)
```

### Fact Extraction
```typescript
const facts = await memoryManager.extractFacts(conversationText, sessionId, userId)
await memoryManager.storeFacts(facts)
```

### Analytics
```typescript
const analytics = await memoryManager.getMemoryAnalytics(sessionId, userId)
console.log(`Total facts: ${analytics.totalFacts}`)
console.log(`Quality score: ${analytics.averageConfidence}`)
```

## Best Practices

### Fact Extraction
- Run every 6 messages for optimal balance
- Use LLM for complex extraction, fallback to patterns
- Validate before storing to prevent duplicates

### Memory Management
- Expire context facts after 24 hours
- Prioritize high-importance facts in conversations
- Regularly validate and verify facts

### Performance
- Use similarity scoring to prevent duplicates
- Index on commonly queried fields
- Batch operations when possible

## Security & Privacy

### Data Protection
- All facts encrypted at rest
- No sensitive information in logs
- Optional fact expiration for privacy

### User Control
- Users can edit/delete any fact
- Verification status for accuracy
- Clear data retention policies

## Migration

To upgrade existing systems, run the migration script:
```sql
-- See: api/migrations/enhance-memory-schema.sql
ALTER TABLE user_facts ADD COLUMN context TEXT;
-- ... additional fields
```

## Future Enhancements

### Planned Features
- Multi-language fact extraction
- Fact relationship mapping
- Conversation topic suggestion
- Memory-based personality adaptation
- Cross-session memory sharing (with permission)
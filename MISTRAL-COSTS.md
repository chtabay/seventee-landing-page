# Coût du Contexte Mistral AI - Analyse et Optimisation

## 💰 Comment Mistral facture-t-il ?

Mistral AI facture sur la base des **tokens** :
- **Tokens d'entrée** (input) : Tout ce que vous envoyez (messages utilisateur + historique + système)
- **Tokens de sortie** (output) : La réponse générée par Mistral

### Tarifs Mistral (à vérifier sur leur site, exemples indicatifs)

| Modèle | Input (par 1M tokens) | Output (par 1M tokens) |
|--------|----------------------|------------------------|
| mistral-small | ~0.20€ | ~0.20€ |
| mistral-medium | ~0.60€ | ~0.60€ |
| mistral-large | ~2.50€ | ~2.50€ |
| mixtral-8x7b | ~0.50€ | ~0.50€ |

## 📊 Coût du contexte dans votre chat

### Exemple de conversation

```
Message 1 (utilisateur) : "Bonjour"
  → ~10 tokens
Message 2 (bot) : "Bonjour ! Comment puis-je vous aider ?"
  → ~15 tokens
Message 3 (utilisateur) : "Je veux déposer mes documents"
  → ~10 tokens
Message 4 (bot) : "Parfait ! Vous pouvez..."
  → ~50 tokens
... (10 messages de plus)
```

### Calcul du coût avec contexte complet

**Scénario : Conversation de 20 messages**

1. **Sans optimisation** (tout l'historique à chaque fois) :
   - Message 1 : 10 tokens (input) + 15 tokens (output) = 25 tokens
   - Message 2 : 25 tokens (historique) + 10 tokens (nouveau) + 50 tokens (output) = 85 tokens
   - Message 3 : 85 tokens (historique) + 10 tokens (nouveau) + 50 tokens (output) = 145 tokens
   - Message 4 : 145 tokens + 10 + 50 = 205 tokens
   - ...
   - Message 20 : ~2000 tokens (historique) + 10 + 50 = **2060 tokens**

   **Total pour 20 messages** : ~21,000 tokens
   **Coût avec mistral-medium** : 21,000 / 1,000,000 × 0.60€ = **0.0126€**

2. **Avec optimisation** (seulement les 5 derniers messages) :
   - Chaque requête : ~300 tokens (historique limité) + 10 + 50 = 360 tokens
   - **Total pour 20 messages** : ~7,200 tokens
   - **Coût** : 7,200 / 1,000,000 × 0.60€ = **0.0043€**

   **Économie : 66% de réduction !**

## 🎯 Stratégies d'optimisation

### 1. Limiter l'historique envoyé

```javascript
// ❌ MAUVAIS : Envoyer tout l'historique
const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory // Peut être très long !
];

// ✅ BON : Limiter à N derniers messages
const MAX_CONTEXT_MESSAGES = 5;
const recentMessages = conversationHistory.slice(-MAX_CONTEXT_MESSAGES);
const messages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages
];
```

### 2. Résumer l'historique ancien

```javascript
// Résumer les messages anciens en un seul message
async function summarizeOldMessages(oldMessages) {
    const summaryPrompt = `Résume cette conversation précédente en 2-3 phrases :
${oldMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    const summary = await mistralClient.chat.complete({
        model: 'mistral-small', // Modèle moins cher pour le résumé
        messages: [{ role: 'user', content: summaryPrompt }],
        maxTokens: 100 // Résumé court
    });

    return summary.choices[0].message.content;
}

// Utilisation
const oldMessages = conversationHistory.slice(0, -5);
const recentMessages = conversationHistory.slice(-5);
const summary = await summarizeOldMessages(oldMessages);

const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'assistant', content: `Contexte précédent : ${summary}` },
    ...recentMessages
];
```

### 3. Utiliser un système de cache

```javascript
// Cache des réponses fréquentes
const responseCache = new Map();

function getCacheKey(message, userType) {
    return `${userType}_${message.toLowerCase().trim()}`;
}

async function getCachedOrNewResponse(message, userType) {
    const cacheKey = getCacheKey(message, userType);
    
    // Vérifier le cache
    if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey);
    }

    // Générer nouvelle réponse
    const response = await callMistral(message, userType);
    
    // Mettre en cache (limiter à 100 entrées)
    if (responseCache.size >= 100) {
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
    }
    responseCache.set(cacheKey, response);
    
    return response;
}
```

### 4. Optimiser le prompt système

```javascript
// ❌ MAUVAIS : Prompt système trop long
const systemPrompt = `
Tu es un assistant pour Seventee...
[500 mots de contexte détaillé]
`;

// ✅ BON : Prompt concis et efficace
const systemPrompt = `Assistant Seventee - Location immobilière.
Aide candidats et agences. Réponses concises et pertinentes.`;
```

### 5. Utiliser des embeddings pour la recherche sémantique

```javascript
// Stocker les messages avec leurs embeddings
const messageEmbeddings = [];

// Pour chaque nouveau message, chercher les messages similaires
async function findRelevantContext(currentMessage, limit = 3) {
    const currentEmbedding = await getEmbedding(currentMessage);
    
    // Trouver les messages les plus similaires
    const similarities = messageEmbeddings.map(msg => ({
        message: msg,
        similarity: cosineSimilarity(currentEmbedding, msg.embedding)
    })).sort((a, b) => b.similarity - a.similarity);
    
    // Retourner seulement les plus pertinents
    return similarities.slice(0, limit).map(s => s.message);
}
```

## 📈 Calculs détaillés pour votre cas d'usage

### Scénario réaliste : Chat assistant Seventee

**Hypothèses** :
- 100 conversations/jour
- 15 messages en moyenne par conversation
- 50 tokens par message utilisateur
- 100 tokens par réponse bot
- Prompt système : 200 tokens

### Sans optimisation

```
Par conversation :
- Historique complet à chaque message
- Message 15 : ~2000 tokens d'historique + 50 + 100 = 2150 tokens
- Total conversation : ~16,000 tokens

Coût par conversation (mistral-medium) :
16,000 / 1,000,000 × 0.60€ = 0.0096€

Coût journalier :
100 conversations × 0.0096€ = 0.96€/jour
Coût mensuel : ~29€/mois
```

### Avec optimisation (historique limité à 5 messages)

```
Par conversation :
- Historique limité : ~500 tokens max
- Chaque requête : 500 + 50 + 100 = 650 tokens
- Total conversation : ~9,750 tokens

Coût par conversation :
9,750 / 1,000,000 × 0.60€ = 0.00585€

Coût journalier :
100 conversations × 0.00585€ = 0.585€/jour
Coût mensuel : ~17.5€/mois

ÉCONOMIE : 40% de réduction
```

### Avec optimisation avancée (résumé + cache)

```
Par conversation :
- Résumé de l'ancien contexte : 50 tokens
- 5 derniers messages : 500 tokens
- Cache hit rate : 30% (questions fréquentes)
- Total moyen : ~5,000 tokens

Coût par conversation :
5,000 / 1,000,000 × 0.60€ = 0.003€

Coût journalier :
100 conversations × 0.003€ = 0.30€/jour
Coût mensuel : ~9€/mois

ÉCONOMIE : 69% de réduction !
```

## 🔧 Implémentation optimisée dans votre code

Voici comment modifier `server-chat.js` pour optimiser les coûts :

```javascript
// Configuration
const MAX_CONTEXT_MESSAGES = 5; // Limiter à 5 derniers messages
const USE_SUMMARY = true; // Activer le résumé pour conversations longues
const SUMMARY_THRESHOLD = 10; // Résumer après 10 messages

app.post('/api/chat/message', async (req, res) => {
    try {
        const { message, sessionId, userType } = req.body;
        
        let conversation = conversations.get(sessionId) || [];
        conversation.push({ role: 'user', content: message });

        // OPTIMISATION 1 : Limiter l'historique
        let messagesToSend;
        
        if (conversation.length > SUMMARY_THRESHOLD && USE_SUMMARY) {
            // OPTIMISATION 2 : Résumer les anciens messages
            const oldMessages = conversation.slice(0, -MAX_CONTEXT_MESSAGES);
            const recentMessages = conversation.slice(-MAX_CONTEXT_MESSAGES);
            
            const summary = await summarizeConversation(oldMessages);
            
            messagesToSend = [
                { role: 'system', content: buildSystemPrompt(userType) },
                { role: 'assistant', content: `Contexte précédent : ${summary}` },
                ...recentMessages
            ];
        } else {
            // Envoyer seulement les derniers messages
            const recentMessages = conversation.slice(-MAX_CONTEXT_MESSAGES);
            messagesToSend = [
                { role: 'system', content: buildSystemPrompt(userType) },
                ...recentMessages
            ];
        }

        // OPTIMISATION 3 : Vérifier le cache pour questions fréquentes
        const cacheKey = `${userType}_${message.toLowerCase().trim()}`;
        if (responseCache.has(cacheKey)) {
            const cached = responseCache.get(cacheKey);
            conversation.push({ role: 'assistant', content: cached.response });
            conversations.set(sessionId, conversation);
            
            return res.json({
                response: cached.response,
                suggestedLinks: cached.suggestedLinks,
                actions: cached.actions,
                cached: true // Indiquer que c'est en cache
            });
        }

        // Appel Mistral avec contexte optimisé
        const chatResponse = await mistralClient.chat.complete({
            model: 'mistral-medium',
            messages: messagesToSend,
            temperature: 0.7,
            maxTokens: 500 // Limiter la réponse aussi
        });

        const botResponse = chatResponse.choices[0].message.content;
        conversation.push({ role: 'assistant', content: botResponse });
        conversations.set(sessionId, conversation);

        // Mettre en cache
        const suggestedLinks = extractSuggestedLinks(botResponse, userType);
        const actions = userType === 'agency' ? 
            await generateActionSuggestions(botResponse, conversation) : [];
        
        responseCache.set(cacheKey, { response: botResponse, suggestedLinks, actions });

        res.json({
            response: botResponse,
            suggestedLinks,
            actions,
            tokensUsed: chatResponse.usage.totalTokens // Pour monitoring
        });

    } catch (error) {
        console.error('Erreur chat:', error);
        res.status(500).json({ error: 'Erreur lors du traitement' });
    }
});

// Fonction de résumé
async function summarizeConversation(messages) {
    if (messages.length === 0) return '';
    
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const summaryPrompt = `Résume cette conversation en 2-3 phrases courtes :\n${text}`;
    
    const response = await mistralClient.chat.complete({
        model: 'mistral-small', // Modèle moins cher pour résumé
        messages: [{ role: 'user', content: summaryPrompt }],
        maxTokens: 100
    });
    
    return response.choices[0].message.content;
}
```

## 📊 Monitoring des coûts

```javascript
// Ajouter un middleware de tracking
const costTracker = {
    totalTokens: 0,
    totalCost: 0,
    requests: 0
};

function trackCost(usage, model = 'mistral-medium') {
    const costPerMillion = {
        'mistral-small': 0.20,
        'mistral-medium': 0.60,
        'mistral-large': 2.50
    };
    
    const cost = (usage.totalTokens / 1_000_000) * costPerMillion[model];
    
    costTracker.totalTokens += usage.totalTokens;
    costTracker.totalCost += cost;
    costTracker.requests++;
    
    console.log(`Tokens: ${usage.totalTokens}, Coût: ${cost.toFixed(6)}€, Total: ${costTracker.totalCost.toFixed(4)}€`);
}

// Utiliser dans chaque appel Mistral
const chatResponse = await mistralClient.chat.complete({...});
trackCost(chatResponse.usage, 'mistral-medium');
```

## 🎯 Recommandations finales

### Pour votre chat assistant Seventee :

1. **Limiter l'historique à 5-7 messages** : Suffisant pour le contexte
2. **Résumer après 10 messages** : Économise 40-50% sur conversations longues
3. **Mettre en cache les questions fréquentes** : "Comment ça marche ?", "Quels documents ?"
4. **Utiliser mistral-small pour résumés** : 3x moins cher
5. **Monitorer les coûts** : Alertes si dépassement budget

### Budget estimé optimisé :

- **100 conversations/jour** : ~9-17€/mois
- **500 conversations/jour** : ~45-85€/mois
- **1000 conversations/jour** : ~90-170€/mois

**Comparaison** :
- Sans optimisation : ~29€/mois (100 conversations/jour)
- Avec optimisation : ~9€/mois (69% d'économie)

## ✅ Conclusion

Le coût du contexte peut représenter **60-70% du coût total** si non optimisé. Avec les stratégies ci-dessus, vous pouvez réduire les coûts de **40-70%** tout en maintenant la qualité des réponses.

**Action immédiate** : Implémenter la limitation d'historique (5 messages) = économie immédiate de 40% !

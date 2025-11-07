# Intégration Mistral AI - Guide d'implémentation

## ✅ Oui, c'est totalement faisable avec Mistral AI !

Mistral AI est une excellente alternative française aux autres LLMs. Voici comment l'intégrer dans votre chat assistant.

## 🎯 Options disponibles avec Mistral AI

### 1. **Mistral API** (Recommandé pour production)
- API similaire à OpenAI
- Modèles disponibles : `mistral-small`, `mistral-medium`, `mistral-large`, `mixtral-8x7b`
- Coûts compétitifs
- Support français natif

### 2. **Modèles open-source** (Pour hébergement propre)
- Mistral 7B, Mixtral 8x7B
- Peuvent être hébergés localement ou sur votre infrastructure
- Plus de contrôle, mais nécessite plus de ressources

## 📦 Installation

### Option 1 : SDK officiel Mistral (Recommandé)

```bash
npm install @mistralai/mistralai
```

### Option 2 : Appels HTTP directs

```bash
npm install axios
```

## 🔑 Configuration

### 1. Obtenir une clé API Mistral

1. Créer un compte sur https://console.mistral.ai
2. Générer une clé API
3. Configurer dans les variables d'environnement

```bash
# .env
MISTRAL_API_KEY=votre_cle_api_mistral
```

### 2. Modifier le frontend pour utiliser l'API backend

Mettre à jour `script-chat.js` pour appeler votre backend au lieu de la simulation :

```javascript
async sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;

    this.addMessage(message, 'user');
    chatInput.value = '';
    this.showLoading();

    try {
        // Appel à votre backend qui utilise Mistral
        const response = await fetch('http://localhost:3001/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                sessionId: this.getSessionId(),
                userType: this.detectUserType() // 'candidate' | 'agency'
            })
        });

        const data = await response.json();
        this.hideLoading();

        // Afficher la réponse du bot
        this.addMessage(data.response, 'bot');

        // Ajouter les liens suggérés
        if (data.suggestedLinks && data.suggestedLinks.length > 0) {
            this.addSuggestedLinks(data.suggestedLinks);
        }

        // Ajouter les suggestions d'actions
        if (data.actions && data.actions.length > 0) {
            this.addActionSuggestions(data.actions);
        }

    } catch (error) {
        this.hideLoading();
        this.addMessage('Désolé, une erreur est survenue. Veuillez réessayer.', 'bot');
        console.error('Erreur:', error);
    }
}
```

## 💰 Coûts Mistral AI

### Tarifs API (à vérifier sur leur site)

- **mistral-small** : ~0.20€ / 1M tokens
- **mistral-medium** : ~0.60€ / 1M tokens  
- **mistral-large** : ~2.50€ / 1M tokens
- **mixtral-8x7b** : ~0.50€ / 1M tokens

**Estimation pour votre chat** :
- ~500 tokens par message utilisateur
- ~1000 tokens par réponse bot
- **Coût par conversation** : ~0.001€ (très économique)

## 🚀 Avantages de Mistral AI

1. **Support français natif** : Excellent pour votre marché français
2. **Coûts compétitifs** : Moins cher que GPT-4
3. **Latence faible** : Réponses rapides
4. **Modèles open-source** : Possibilité d'héberger vous-même
5. **API simple** : Compatible avec le code OpenAI

## 📝 Exemple d'utilisation directe

### Chat simple avec Mistral

```javascript
const { Mistral } = require('@mistralai/mistralai');

const client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY
});

async function chatWithMistral(userMessage, conversationHistory) {
    const response = await client.chat.complete({
        model: 'mistral-medium',
        messages: [
            {
                role: 'system',
                content: 'Tu es un assistant pour Seventee, plateforme de location immobilière.'
            },
            ...conversationHistory,
            {
                role: 'user',
                content: userMessage
            }
        ],
        temperature: 0.7,
        maxTokens: 1000
    });

    return response.choices[0].message.content;
}
```

## 🔧 Intégration complète

### Structure recommandée

```
projet/
├── frontend/
│   ├── chat.html
│   ├── styles-chat.css
│   └── script-chat.js (modifié pour appeler l'API)
│
├── backend/
│   ├── server-chat.js (avec intégration Mistral)
│   ├── package.json
│   └── .env
│
└── README-CHAT.md
```

### package.json du backend

```json
{
  "name": "seventee-chat-backend",
  "version": "1.0.0",
  "dependencies": {
    "@mistralai/mistralai": "^1.0.0",
    "express": "^4.18.0",
    "multer": "^1.4.5",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "scripts": {
    "start": "node server-chat.js",
    "dev": "nodemon server-chat.js"
  }
}
```

## 🎨 Personnalisation des prompts

Mistral répond très bien aux prompts en français. Exemple pour votre cas :

```javascript
const systemPrompt = `Tu es un assistant intelligent pour Seventee, la plateforme de location immobilière qui révolutionne le marché français.

Tes objectifs :
1. Aider les candidats à préparer leur dossier de location
2. Guider les agences dans leur utilisation de la plateforme
3. Vérifier et valider les documents déposés
4. Suggérer des actions pertinentes selon le contexte

Ton ton : Professionnel, bienveillant, et orienté solutions.

Tu dois toujours suggérer des liens vers les pages pertinentes du site Seventee quand c'est approprié.`;
```

## 🔐 Sécurité avec Mistral

1. **Ne jamais exposer la clé API côté client**
2. **Utiliser le backend comme proxy**
3. **Rate limiting** : Limiter les appels par utilisateur
4. **Validation** : Toujours valider les inputs avant d'envoyer à Mistral

## 📊 Monitoring et optimisation

### Métriques à suivre

```javascript
// Exemple de logging
const metrics = {
    tokensUsed: response.usage.totalTokens,
    model: 'mistral-medium',
    latency: Date.now() - startTime,
    cost: calculateCost(response.usage.totalTokens, 'mistral-medium')
};
```

### Optimisation des coûts

1. **Cache des réponses** : Mettre en cache les réponses fréquentes
2. **Modèle adapté** : Utiliser `mistral-small` pour les questions simples
3. **Limite de tokens** : Limiter `maxTokens` selon le besoin
4. **Batch processing** : Traiter plusieurs documents en une fois

## 🆚 Comparaison Mistral vs autres LLMs

| Critère | Mistral | OpenAI GPT-4 | Claude |
|---------|---------|--------------|--------|
| Coût | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Qualité FR | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Latence | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Open-source | ✅ | ❌ | ❌ |
| API simplicité | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## ✅ Checklist d'implémentation

- [x] Créer le backend avec Express
- [x] Intégrer le SDK Mistral AI
- [x] Créer les endpoints API
- [ ] Modifier le frontend pour appeler l'API
- [ ] Configurer les variables d'environnement
- [ ] Tester avec différents types de messages
- [ ] Implémenter la vérification de documents avec OCR + Mistral
- [ ] Ajouter le rate limiting
- [ ] Mettre en place le monitoring
- [ ] Déployer en production

## 🚀 Prochaines étapes

1. **Installer les dépendances** :
   ```bash
   cd backend
   npm install
   ```

2. **Configurer la clé API** :
   ```bash
   echo "MISTRAL_API_KEY=votre_cle" > .env
   ```

3. **Démarrer le serveur** :
   ```bash
   npm start
   ```

4. **Tester l'intégration** :
   - Ouvrir `chat.html`
   - Modifier `script-chat.js` pour pointer vers `http://localhost:3001`
   - Tester une conversation

## 📚 Ressources

- **Documentation Mistral** : https://docs.mistral.ai
- **Console Mistral** : https://console.mistral.ai
- **GitHub SDK** : https://github.com/mistralai/mistral-sdk-js

---

**Conclusion** : Mistral AI est parfaitement adapté pour votre chat assistant. C'est même une excellente choice pour un projet français avec des besoins de coûts maîtrisés et un excellent support de la langue française !

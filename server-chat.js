// Backend API avec intégration Mistral AI
// server-chat.js - Serveur Node.js pour le chat assistant

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { Mistral } = require('@mistralai/mistralai'); // SDK officiel Mistral

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration Mistral AI
const mistralClient = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || 'your-mistral-api-key'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuration Multer pour l'upload de fichiers
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'), false);
        }
    }
});

// Store conversations en mémoire (remplacer par une vraie DB en production)
const conversations = new Map();
const documents = new Map();
const responseCache = new Map(); // Cache pour questions fréquentes

// Configuration d'optimisation des coûts
const MAX_CONTEXT_MESSAGES = 5; // Limiter à 5 derniers messages (au lieu de 10)
const USE_SUMMARY = true; // Activer le résumé pour conversations longues
const SUMMARY_THRESHOLD = 10; // Résumer après 10 messages
const MAX_RESPONSE_TOKENS = 500; // Limiter la taille des réponses

// Tracking des coûts
const costTracker = {
    totalTokens: 0,
    totalCost: 0,
    requests: 0
};

function trackCost(usage, model = 'mistral-medium') {
    const costPerMillion = {
        'mistral-small': 0.20,
        'mistral-medium': 0.60,
        'mistral-large': 2.50,
        'mixtral-8x7b': 0.50
    };
    
    const cost = (usage.totalTokens / 1_000_000) * (costPerMillion[model] || 0.60);
    
    costTracker.totalTokens += usage.totalTokens;
    costTracker.totalCost += cost;
    costTracker.requests++;
    
    console.log(`💰 Tokens: ${usage.totalTokens} | Coût: ${cost.toFixed(6)}€ | Total: ${costTracker.totalCost.toFixed(4)}€`);
}

// Fonction de résumé pour optimiser les coûts
async function summarizeConversation(messages) {
    if (messages.length === 0) return '';
    
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const summaryPrompt = `Résume cette conversation précédente en 2-3 phrases courtes :\n${text}`;
    
    try {
        const response = await mistralClient.chat.complete({
            model: 'mistral-small', // Modèle moins cher pour résumé
            messages: [{ role: 'user', content: summaryPrompt }],
            maxTokens: 100 // Résumé court
        });
        
        trackCost(response.usage, 'mistral-small');
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Erreur résumé:', error);
        return 'Conversation précédente sur la location immobilière.';
    }
}

// ============================================
// ENDPOINT: Chat avec Mistral AI
// ============================================
app.post('/api/chat/message', async (req, res) => {
    try {
        const { message, sessionId, userId, userType } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Message et sessionId requis' });
        }

        // Récupérer ou créer la conversation
        let conversation = conversations.get(sessionId) || [];
        conversation.push({ role: 'user', content: message });

        // OPTIMISATION 1 : Vérifier le cache pour questions fréquentes
        const cacheKey = `${userType}_${message.toLowerCase().trim()}`;
        if (responseCache.has(cacheKey)) {
            const cached = responseCache.get(cacheKey);
            conversation.push({ role: 'assistant', content: cached.response });
            conversations.set(sessionId, conversation);
            
            console.log('✅ Réponse depuis le cache (coût: 0€)');
            return res.json({
                response: cached.response,
                suggestedLinks: cached.suggestedLinks,
                actions: cached.actions,
                cached: true,
                tokensUsed: 0
            });
        }

        // OPTIMISATION 2 : Construire le contexte optimisé
        const systemPrompt = buildSystemPrompt(userType);
        let messagesToSend;

        if (conversation.length > SUMMARY_THRESHOLD && USE_SUMMARY) {
            // OPTIMISATION 3 : Résumer les anciens messages si conversation longue
            const oldMessages = conversation.slice(0, -MAX_CONTEXT_MESSAGES);
            const recentMessages = conversation.slice(-MAX_CONTEXT_MESSAGES);
            
            const summary = await summarizeConversation(oldMessages);
            
            messagesToSend = [
                { role: 'system', content: systemPrompt },
                { role: 'assistant', content: `Contexte précédent : ${summary}` },
                ...recentMessages
            ];
            
            console.log(`📝 Conversation longue (${conversation.length} msgs) - Résumé activé`);
        } else {
            // Envoyer seulement les derniers messages (limite à MAX_CONTEXT_MESSAGES)
            const recentMessages = conversation.slice(-MAX_CONTEXT_MESSAGES);
            messagesToSend = [
                { role: 'system', content: systemPrompt },
                ...recentMessages
            ];
        }

        // Appel à Mistral AI avec contexte optimisé
        const chatResponse = await mistralClient.chat.complete({
            model: 'mistral-medium', // ou 'mistral-small', 'mistral-large', 'mixtral-8x7b'
            messages: messagesToSend,
            temperature: 0.7,
            maxTokens: MAX_RESPONSE_TOKENS // Limiter la réponse aussi
        });

        // Tracking des coûts
        trackCost(chatResponse.usage, 'mistral-medium');

        const botResponse = chatResponse.choices[0].message.content;

        // Ajouter la réponse du bot à la conversation
        conversation.push({ role: 'assistant', content: botResponse });
        conversations.set(sessionId, conversation);

        // Analyser la réponse pour extraire les liens suggérés
        const suggestedLinks = extractSuggestedLinks(botResponse, userType);

        // Générer des suggestions d'actions pour les agences
        const actions = userType === 'agency' ? 
            await generateActionSuggestions(botResponse, conversation) : [];

        // Mettre en cache la réponse (limiter à 100 entrées)
        if (responseCache.size >= 100) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
        }
        responseCache.set(cacheKey, { response: botResponse, suggestedLinks, actions });

        res.json({
            response: botResponse,
            suggestedLinks,
            actions,
            sessionId,
            tokensUsed: chatResponse.usage.totalTokens,
            cached: false
        });

    } catch (error) {
        console.error('Erreur chat:', error);
        res.status(500).json({ 
            error: 'Erreur lors du traitement du message',
            details: error.message 
        });
    }
});

// ============================================
// ENDPOINT: Upload de documents
// ============================================
app.post('/api/documents/upload', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const { sessionId } = req.body;
        const uploadedFiles = [];

        for (const file of req.files) {
            // Analyser le document avec Mistral (vision si disponible)
            const analysis = await analyzeDocument(file.path, file.mimetype);

            const fileInfo = {
                id: generateId(),
                originalName: file.originalname,
                fileName: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype,
                analysis,
                uploadedAt: new Date().toISOString()
            };

            uploadedFiles.push(fileInfo);

            // Stocker dans la session
            if (!documents.has(sessionId)) {
                documents.set(sessionId, []);
            }
            documents.get(sessionId).push(fileInfo);
        }

        res.json({
            files: uploadedFiles,
            message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès`
        });

    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
});

// ============================================
// ENDPOINT: Vérification de documents avec Mistral
// ============================================
app.post('/api/documents/verify', async (req, res) => {
    try {
        const { sessionId, fileIds } = req.body;

        const sessionDocs = documents.get(sessionId) || [];
        const filesToVerify = fileIds ? 
            sessionDocs.filter(doc => fileIds.includes(doc.id)) : 
            sessionDocs;

        if (filesToVerify.length === 0) {
            return res.status(400).json({ error: 'Aucun document à vérifier' });
        }

        const verificationResults = [];

        for (const file of filesToVerify) {
            // Lire le contenu du fichier
            const fileContent = await fs.readFile(file.path);
            
            // Pour les PDFs, utiliser OCR (Tesseract ou service cloud)
            // Pour les images, utiliser la vision de Mistral si disponible
            const verification = await verifyDocumentWithMistral(file, fileContent);

            verificationResults.push({
                fileId: file.id,
                fileName: file.originalName,
                status: verification.status, // 'valid' | 'invalid' | 'pending'
                issues: verification.issues,
                documentType: verification.documentType,
                extractedData: verification.extractedData
            });
        }

        // Analyse globale du dossier
        const dossierCompleteness = analyzeDossierCompleteness(verificationResults);

        res.json({
            verification: verificationResults,
            dossierCompleteness,
            suggestions: generateDocumentSuggestions(dossierCompleteness)
        });

    } catch (error) {
        console.error('Erreur vérification:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
});

// ============================================
// FONCTIONS HELPER
// ============================================

function buildSystemPrompt(userType) {
    const basePrompt = `Tu es un assistant intelligent pour la plateforme Seventee, spécialisée dans la location immobilière en France.

Tu dois aider les utilisateurs de manière professionnelle et bienveillante.`;

    if (userType === 'agency') {
        return basePrompt + `

Tu t'adresses à une agence immobilière. Tes réponses doivent :
- Mettre en avant les avantages de Seventee (réduction des coûts, gain de temps)
- Suggérer des actions concrètes pour améliorer leur gestion locative
- Être orientées business et ROI

Tu peux suggérer des liens vers :
- La page "Découvrir l'offre agence" (index.html#agences)
- La page "Demander une démo" (index.html#demo)
- La page "Comment ça marche" (index.html#comment-ca-marche)`;
    } else {
        return basePrompt + `

Tu t'adresses à un candidat locataire. Tes réponses doivent :
- Être rassurantes et pédagogiques
- Expliquer clairement le processus de candidature
- Aider à préparer un dossier complet

Tu peux suggérer des liens vers :
- La page "Créer mon compte candidat" (index.html#inscription)
- La page "Rechercher un logement" (index.html#candidats)
- La page "Comment ça marche" (index.html#comment-ca-marche)`;
    }
}

async function analyzeDocument(filePath, mimetype) {
    // Pour l'instant, analyse basique par nom de fichier
    // En production, utiliser OCR + Mistral pour analyser le contenu
    
    const fileName = path.basename(filePath).toLowerCase();
    
    let documentType = 'Document générique';
    if (fileName.includes('identité') || fileName.includes('cni') || fileName.includes('passeport')) {
        documentType = 'Pièce d\'identité';
    } else if (fileName.includes('revenu') || fileName.includes('salaire')) {
        documentType = 'Justificatif de revenus';
    } else if (fileName.includes('avis') || fileName.includes('impôt')) {
        documentType = 'Avis d\'imposition';
    }

    return {
        documentType,
        confidence: 0.8,
        needsVerification: true
    };
}

async function verifyDocumentWithMistral(file, fileContent) {
    try {
        // Préparer le prompt pour Mistral
        const prompt = `Analyse ce document de location immobilière et réponds en JSON avec :
{
    "documentType": "type de document identifié",
    "status": "valid|invalid|pending",
    "issues": ["liste des problèmes éventuels"],
    "extractedData": {
        "nom": "...",
        "date": "...",
        "montant": "..."
    }
}

Document: ${file.originalName}
Type: ${file.mimetype}`;

        // Appel à Mistral pour analyser
        // Note: Pour les fichiers binaires, il faudrait d'abord extraire le texte avec OCR
        const response = await mistralClient.chat.complete({
            model: 'mistral-medium',
            messages: [
                { role: 'system', content: 'Tu es un expert en analyse de documents administratifs français.' },
                { role: 'user', content: prompt }
            ],
            responseFormat: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content);

    } catch (error) {
        console.error('Erreur vérification Mistral:', error);
        return {
            documentType: 'Document',
            status: 'pending',
            issues: ['Erreur lors de l\'analyse'],
            extractedData: {}
        };
    }
}

function extractSuggestedLinks(response, userType) {
    const links = [];

    // Détection de mots-clés dans la réponse pour suggérer des liens
    const responseLower = response.toLowerCase();

    if (responseLower.includes('compte') || responseLower.includes('inscription')) {
        links.push({
            title: 'Créer mon compte candidat',
            description: 'Inscription gratuite en 2 minutes',
            url: 'index.html#inscription'
        });
    }

    if (responseLower.includes('recherche') || responseLower.includes('logement')) {
        links.push({
            title: 'Rechercher un logement',
            description: 'Découvrez les offres disponibles',
            url: 'index.html#candidats'
        });
    }

    if (responseLower.includes('agence') || responseLower.includes('démo')) {
        links.push({
            title: 'Découvrir l\'offre agence',
            description: 'Tout savoir sur Seventee pour les agences',
            url: 'index.html#agences'
        });
        links.push({
            title: 'Demander une démo',
            description: 'Découvrez la plateforme en action',
            url: 'index.html#demo'
        });
    }

    return links;
}

async function generateActionSuggestions(response, conversation) {
    // Utiliser Mistral pour générer des suggestions d'actions
    const prompt = `Basé sur cette conversation avec une agence immobilière, suggère 3-4 actions concrètes qu'elle pourrait entreprendre.

Conversation: ${JSON.stringify(conversation.slice(-5))}

Réponds uniquement avec une liste JSON d'actions.`;

    try {
        const mistralResponse = await mistralClient.chat.complete({
            model: 'mistral-small',
            messages: [
                { role: 'user', content: prompt }
            ],
            responseFormat: { type: 'json_object' }
        });

        const parsed = JSON.parse(mistralResponse.choices[0].message.content);
        return parsed.actions || [];

    } catch (error) {
        // Fallback sur des suggestions génériques
        return [
            'Publier une annonce sur Seventee',
            'Consulter les candidatures qualifiées',
            'Réduire vos coûts de diffusion'
        ];
    }
}

function analyzeDossierCompleteness(verificationResults) {
    const requiredDocs = ['pièce d\'identité', 'justificatif de revenus'];
    const foundDocs = verificationResults
        .filter(r => r.status === 'valid')
        .map(r => r.documentType.toLowerCase());

    const missing = requiredDocs.filter(doc => 
        !foundDocs.some(found => found.includes(doc.split(' ')[0]))
    );

    return {
        isComplete: missing.length === 0,
        missingDocuments: missing,
        validDocuments: verificationResults.filter(r => r.status === 'valid').length,
        totalDocuments: verificationResults.length
    };
}

function generateDocumentSuggestions(completeness) {
    const suggestions = [];

    if (!completeness.isComplete) {
        suggestions.push(`Il manque ${completeness.missingDocuments.length} document(s) : ${completeness.missingDocuments.join(', ')}`);
    } else {
        suggestions.push('✅ Votre dossier est complet ! Vous pouvez maintenant postuler.');
    }

    if (completeness.validDocuments >= 3) {
        suggestions.push('💡 Ce dossier est prêt pour une décision rapide');
        suggestions.push('→ Organiser une visite dans les 48h');
    }

    return suggestions;
}

function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ============================================
// ENDPOINT: Statistiques de coûts
// ============================================
app.get('/api/stats/costs', (req, res) => {
    res.json({
        totalRequests: costTracker.requests,
        totalTokens: costTracker.totalTokens,
        totalCost: costTracker.totalCost.toFixed(6),
        averageCostPerRequest: costTracker.requests > 0 
            ? (costTracker.totalCost / costTracker.requests).toFixed(6) 
            : 0,
        averageTokensPerRequest: costTracker.requests > 0 
            ? Math.round(costTracker.totalTokens / costTracker.requests) 
            : 0
    });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Serveur chat assistant démarré sur http://localhost:${PORT}`);
    console.log(`📝 Endpoints disponibles:`);
    console.log(`   POST /api/chat/message`);
    console.log(`   POST /api/documents/upload`);
    console.log(`   POST /api/documents/verify`);
    console.log(`   GET  /api/stats/costs`);
    console.log(`\n💰 Optimisations activées:`);
    console.log(`   - Historique limité à ${MAX_CONTEXT_MESSAGES} messages`);
    console.log(`   - Résumé activé après ${SUMMARY_THRESHOLD} messages`);
    console.log(`   - Cache des réponses fréquentes`);
    console.log(`   - Réponses limitées à ${MAX_RESPONSE_TOKENS} tokens`);
});

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
    console.error('Erreur non gérée:', error);
});

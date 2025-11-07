// Backend API for Chat Assistant
// This is a basic Express.js server structure
// You'll need to integrate with your actual LLM API (OpenAI, Anthropic, etc.)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/documents';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non supporté. Utilisez PDF, JPG ou PNG.'));
        }
    }
});

// In-memory conversation storage (use a database in production)
const conversations = new Map();

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Get or create conversation
        const convId = conversationId || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (!conversations.has(convId)) {
            conversations.set(convId, {
                id: convId,
                messages: [],
                documents: [],
                createdAt: new Date()
            });
        }

        const conversation = conversations.get(convId);

        // Add user message
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        // Call LLM API (replace with your actual LLM integration)
        const llmResponse = await callLLM(message, conversation, context);

        // Add assistant response
        conversation.messages.push({
            role: 'assistant',
            content: llmResponse.text,
            timestamp: new Date()
        });

        // Analyze response for links and actions
        const links = extractLinks(llmResponse.text, context);
        const suggestedActions = extractActions(llmResponse.text, context);

        res.json({
            conversationId: convId,
            text: llmResponse.text,
            links: links,
            suggestedActions: suggestedActions,
            documentVerification: llmResponse.documentVerification || null
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Erreur lors du traitement de votre message' });
    }
});

// Document upload endpoint
app.post('/api/documents/upload', upload.array('documents', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const uploadedFiles = req.files.map(file => ({
            id: file.filename,
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date()
        }));

        // Verify documents (integrate with OCR/document verification service)
        const verificationResults = await Promise.all(
            uploadedFiles.map(file => verifyDocument(file))
        );

        res.json({
            files: uploadedFiles.map((file, index) => ({
                ...file,
                verification: verificationResults[index]
            }))
        });

    } catch (error) {
        console.error('Error uploading documents:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload des documents' });
    }
});

// Document verification endpoint
app.post('/api/documents/verify', async (req, res) => {
    try {
        const { fileId } = req.body;

        if (!fileId) {
            return res.status(400).json({ error: 'ID de fichier requis' });
        }

        // Find file and verify (integrate with actual verification service)
        const verificationResult = await verifyDocumentById(fileId);

        res.json({
            fileId: fileId,
            verification: verificationResult
        });

    } catch (error) {
        console.error('Error verifying document:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification du document' });
    }
});

// Get conversation history
app.get('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    const conversation = conversations.get(id);

    if (!conversation) {
        return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    res.json(conversation);
});

// Helper function to call LLM (replace with actual implementation)
async function callLLM(message, conversation, context) {
    // TODO: Integrate with your LLM provider
    // Examples:
    // - OpenAI: const response = await openai.chat.completions.create({...})
    // - Anthropic: const response = await anthropic.messages.create({...})
    // - Local model: const response = await localLLM.generate({...})

    // Mock response for now
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('document') || lowerMessage.includes('dossier')) {
        return {
            text: `Pour vérifier vos documents, vous pouvez les déposer directement dans le chat. Je peux vérifier :
- Pièce d'identité (CNI, passeport)
- Justificatifs de revenus (fiches de paie, avis d'imposition)
- Garanties (caution, garantie visale)
- Autres documents nécessaires

Cliquez sur l'icône de pièce jointe pour commencer.`
        };
    }

    if (lowerMessage.includes('agence') || lowerMessage.includes('propriétaire')) {
        return {
            text: `En tant qu'agence, je peux vous aider à :
- Analyser les dossiers de candidats
- Suggérer des actions pour optimiser vos locations
- Vérifier la complétude des dossiers
- Identifier les dossiers les plus prometteurs

Quelle est votre question spécifique ?`,
            suggestedActions: [
                {
                    title: 'Vérifier les dossiers en attente',
                    description: '3 dossiers nécessitent votre attention'
                }
            ]
        };
    }

    return {
        text: `Je comprends votre question. Pourriez-vous être plus précis ? Je peux vous aider avec :
- La vérification de documents
- Les démarches de location
- Les questions pour les agences
- Les questions pour les candidats

N'hésitez pas à me poser une question spécifique !`
    };
}

// Extract relevant links from LLM response
function extractLinks(text, context) {
    const links = [];

    // Analyze text and context to suggest relevant links
    if (text.includes('document') || text.includes('dossier')) {
        links.push({
            title: 'Guide des documents requis',
            url: '/index.html#candidats',
            description: 'Liste complète des documents nécessaires'
        });
    }

    if (text.includes('agence') || context?.userType === 'agency') {
        links.push({
            title: 'Découvrir l\'offre agence',
            url: '/index.html#agences',
            description: 'En savoir plus sur les avantages pour les agences'
        });
    }

    return links;
}

// Extract suggested actions from LLM response
function extractActions(text, context) {
    const actions = [];

    if (context?.userType === 'agency') {
        actions.push({
            title: 'Vérifier les dossiers en attente',
            description: 'Plusieurs dossiers nécessitent votre attention'
        });
    }

    return actions;
}

// Verify document (integrate with OCR/document verification service)
async function verifyDocument(file) {
    // TODO: Integrate with actual document verification service
    // Examples:
    // - OCR: Tesseract.js, Google Cloud Vision API, AWS Textract
    // - Document validation: Custom logic based on document type
    // - Fraud detection: ML models for document authenticity

    const fileName = file.originalName.toLowerCase();

    // Mock verification
    if (fileName.includes('identité') || fileName.includes('cni') || fileName.includes('passeport')) {
        return {
            status: 'verified',
            message: 'Identité vérifiée',
            details: 'Document d\'identité valide et lisible.',
            confidence: 0.95
        };
    }

    if (fileName.includes('revenu') || fileName.includes('salaire') || fileName.includes('paie')) {
        return {
            status: 'verified',
            message: 'Revenus vérifiés',
            details: 'Revenus suffisants pour la location.',
            confidence: 0.90
        };
    }

    return {
        status: 'verified',
        message: 'Document vérifié',
        details: 'Document accepté.',
        confidence: 0.85
    };
}

async function verifyDocumentById(fileId) {
    // Find file and verify
    // Implementation depends on your file storage
    return {
        status: 'verified',
        message: 'Document vérifié',
        details: 'Document accepté.'
    };
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Chat API server running on port ${PORT}`);
    console.log(`📝 Chat endpoint: http://localhost:${PORT}/api/chat`);
    console.log(`📄 Upload endpoint: http://localhost:${PORT}/api/documents/upload`);
});

module.exports = app;

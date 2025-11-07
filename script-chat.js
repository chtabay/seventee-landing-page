// Chat Assistant JavaScript

class ChatAssistant {
    constructor() {
        this.messages = [];
        this.uploadedDocuments = [];
        this.sidebarLinks = [];
        this.suggestedActions = [];
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.setupFileUpload();
    }

    setupEventListeners() {
        // Send message
        const sendBtn = document.getElementById('sendMessage');
        const chatInput = document.getElementById('chatInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });

        // Attach files
        document.getElementById('attachFiles').addEventListener('click', () => {
            this.toggleUploadArea();
        });

        document.getElementById('closeUploadArea').addEventListener('click', () => {
            this.toggleUploadArea(false);
        });

        // Toggle sidebar
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            document.getElementById('chatSidebar').classList.toggle('open');
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    setupFileUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        // Click to upload
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message || this.isProcessing) return;

        // Add user message
        this.addMessage('user', message);
        input.value = '';
        input.style.height = 'auto';

        // Show loading
        this.showLoading(true);

        try {
            // Simulate API call (replace with actual API)
            const response = await this.callChatAPI(message);
            
            // Add assistant response
            this.addMessage('assistant', response.text);
            
            // Update sidebar links if provided
            if (response.links && response.links.length > 0) {
                this.updateSidebarLinks(response.links);
            }

            // Check for document verification
            if (response.documentVerification) {
                this.handleDocumentVerification(response.documentVerification);
            }

            // Check for suggested actions
            if (response.suggestedActions && response.suggestedActions.length > 0) {
                this.updateSuggestedActions(response.suggestedActions);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('assistant', 'Désolé, une erreur est survenue. Veuillez réessayer.');
        } finally {
            this.showLoading(false);
        }
    }

    async callChatAPI(message) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        // Mock response - Replace with actual API call
        const mockResponse = this.generateMockResponse(message);
        return mockResponse;
    }

    generateMockResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Document-related queries
        if (lowerMessage.includes('document') || lowerMessage.includes('dossier') || lowerMessage.includes('pièce')) {
            return {
                text: `Pour vérifier vos documents, vous pouvez les déposer directement dans le chat. Je peux vérifier :
- Pièce d'identité (CNI, passeport)
- Justificatifs de revenus (fiches de paie, avis d'imposition)
- Garanties (caution, garantie visale)
- Autres documents nécessaires

Cliquez sur l'icône de pièce jointe pour commencer.`,
                links: [
                    {
                        title: 'Guide des documents requis',
                        url: 'index.html#candidats',
                        description: 'Liste complète des documents nécessaires pour votre dossier'
                    },
                    {
                        title: 'Comment certifier son dossier',
                        url: 'index.html#candidats',
                        description: 'Certifiez votre identité et vos revenus pour 15€'
                    }
                ]
            };
        }

        // Agency-related queries
        if (lowerMessage.includes('agence') || lowerMessage.includes('propriétaire')) {
            return {
                text: `En tant qu'agence, je peux vous aider à :
- Analyser les dossiers de candidats
- Suggérer des actions pour optimiser vos locations
- Vérifier la complétude des dossiers
- Identifier les dossiers les plus prometteurs

Quelle est votre question spécifique ?`,
                links: [
                    {
                        title: 'Découvrir l\'offre agence',
                        url: 'index.html#agences',
                        description: 'En savoir plus sur les avantages pour les agences'
                    },
                    {
                        title: 'Demander une démo',
                        url: 'index.html#demo',
                        description: 'Réservez une démonstration personnalisée'
                    }
                ],
                suggestedActions: [
                    {
                        title: 'Vérifier les dossiers en attente',
                        description: '3 dossiers nécessitent votre attention'
                    },
                    {
                        title: 'Optimiser vos annonces',
                        description: 'Améliorez la visibilité de vos biens disponibles'
                    }
                ]
            };
        }

        // General help
        return {
            text: `Je comprends votre question. Pourriez-vous être plus précis ? Je peux vous aider avec :
- La vérification de documents
- Les démarches de location
- Les questions pour les agences
- Les questions pour les candidats

N'hésitez pas à me poser une question spécifique !`,
            links: [
                {
                    title: 'Comment ça marche',
                    url: 'index.html#comment-ca-marche',
                    description: 'Découvrez le processus complet'
                },
                {
                    title: 'Créer un compte',
                    url: 'index.html#inscription',
                    description: 'Rejoignez la communauté Seventee'
                }
            ]
        };
    }

    addMessage(type, text) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message__avatar';
        
        if (type === 'user') {
            avatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        } else if (type === 'assistant') {
            avatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        }

        const content = document.createElement('div');
        content.className = 'message__content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message__text';
        textDiv.innerHTML = this.formatMessage(text);

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message__time';
        timeDiv.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        content.appendChild(textDiv);
        content.appendChild(timeDiv);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Save to history
        this.messages.push({ type, text, timestamp: new Date() });
        this.saveChatHistory();
    }

    formatMessage(text) {
        // Convert markdown-like formatting to HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                this.uploadFile(file);
            }
        });
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Type de fichier non supporté. Utilisez PDF, JPG ou PNG.', 'error');
            return false;
        }

        if (file.size > maxSize) {
            this.showNotification('Fichier trop volumineux. Taille maximale : 10MB.', 'error');
            return false;
        }

        return true;
    }

    async uploadFile(file) {
        const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Add to uploaded files list
        this.uploadedDocuments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'pending'
        });

        this.displayUploadedFile(file, fileId);

        // Simulate file upload and verification
        setTimeout(() => {
            this.verifyDocument(fileId, file);
        }, 1500);
    }

    displayUploadedFile(file, fileId) {
        const uploadedFilesContainer = document.getElementById('uploadedFiles');
        const fileDiv = document.createElement('div');
        fileDiv.className = 'uploaded-file';
        fileDiv.id = `file-${fileId}`;

        const icon = document.createElement('div');
        icon.className = 'uploaded-file__icon';
        icon.innerHTML = file.type === 'application/pdf' 
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';

        const info = document.createElement('div');
        info.className = 'uploaded-file__info';

        const name = document.createElement('div');
        name.className = 'uploaded-file__name';
        name.textContent = file.name;

        const size = document.createElement('div');
        size.className = 'uploaded-file__size';
        size.textContent = this.formatFileSize(file.size);

        const status = document.createElement('div');
        status.className = 'uploaded-file__status uploaded-file__status--pending';
        status.textContent = 'Vérification...';

        info.appendChild(name);
        info.appendChild(size);
        fileDiv.appendChild(icon);
        fileDiv.appendChild(info);
        fileDiv.appendChild(status);
        uploadedFilesContainer.appendChild(fileDiv);

        // Update sidebar
        this.updateSidebarDocuments();
    }

    async verifyDocument(fileId, file) {
        // Simulate document verification
        const fileDiv = document.getElementById(`file-${fileId}`);
        if (!fileDiv) return;

        const statusDiv = fileDiv.querySelector('.uploaded-file__status');
        
        // Mock verification result
        const verificationResult = this.mockDocumentVerification(file);
        
        statusDiv.className = `uploaded-file__status uploaded-file__status--${verificationResult.status}`;
        statusDiv.textContent = verificationResult.message;

        // Update document status
        const doc = this.uploadedDocuments.find(d => d.id === fileId);
        if (doc) {
            doc.status = verificationResult.status;
            doc.verification = verificationResult;
        }

        // Add message about verification
        if (verificationResult.status === 'verified') {
            this.addMessage('assistant', `✅ Document "${file.name}" vérifié avec succès ! ${verificationResult.details || ''}`);
        } else if (verificationResult.status === 'error') {
            this.addMessage('assistant', `⚠️ Problème détecté avec "${file.name}" : ${verificationResult.message}`);
        }

        this.updateSidebarDocuments();
    }

    mockDocumentVerification(file) {
        // Mock verification logic
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('identité') || fileName.includes('cni') || fileName.includes('passeport')) {
            return {
                status: 'verified',
                message: 'Identité vérifiée',
                details: 'Document d\'identité valide et lisible.'
            };
        }
        
        if (fileName.includes('revenu') || fileName.includes('salaire') || fileName.includes('paie')) {
            return {
                status: 'verified',
                message: 'Revenus vérifiés',
                details: 'Revenus suffisants pour la location.'
            };
        }
        
        return {
            status: 'verified',
            message: 'Document vérifié',
            details: 'Document accepté.'
        };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    updateSidebarLinks(links) {
        const sidebarContent = document.getElementById('sidebarLinks');
        const emptyState = sidebarContent.querySelector('.sidebar-empty');
        
        if (emptyState) {
            emptyState.remove();
        }

        links.forEach(link => {
            // Check if link already exists
            const existingLink = Array.from(sidebarContent.querySelectorAll('.sidebar-link')).find(
                el => el.href === link.url
            );
            
            if (!existingLink) {
                const linkDiv = document.createElement('a');
                linkDiv.className = 'sidebar-link';
                linkDiv.href = link.url;
                linkDiv.target = '_blank';

                const title = document.createElement('div');
                title.className = 'sidebar-link__title';
                title.textContent = link.title;

                const description = document.createElement('div');
                description.className = 'sidebar-link__description';
                description.textContent = link.description;

                linkDiv.appendChild(title);
                linkDiv.appendChild(description);
                sidebarContent.appendChild(linkDiv);

                this.sidebarLinks.push(link);
            }
        });
    }

    updateSidebarDocuments() {
        const sidebarDocuments = document.getElementById('sidebarDocuments');
        const documentList = document.getElementById('documentList');

        if (this.uploadedDocuments.length === 0) {
            sidebarDocuments.style.display = 'none';
            return;
        }

        sidebarDocuments.style.display = 'block';
        documentList.innerHTML = '';

        this.uploadedDocuments.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'document-item';

            const icon = document.createElement('div');
            icon.className = 'document-item__icon';
            icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>';

            const name = document.createElement('div');
            name.className = 'document-item__name';
            name.textContent = doc.name;

            item.appendChild(icon);
            item.appendChild(name);
            documentList.appendChild(item);
        });
    }

    updateSuggestedActions(actions) {
        const sidebarActions = document.getElementById('sidebarActions');
        const actionList = document.getElementById('actionList');

        if (actions.length === 0) {
            sidebarActions.style.display = 'none';
            return;
        }

        sidebarActions.style.display = 'block';
        actionList.innerHTML = '';

        actions.forEach(action => {
            const item = document.createElement('div');
            item.className = 'action-item';

            const title = document.createElement('div');
            title.className = 'action-item__title';
            title.textContent = action.title;

            const description = document.createElement('div');
            description.className = 'action-item__description';
            description.textContent = action.description;

            item.appendChild(title);
            item.appendChild(description);
            actionList.appendChild(item);

            this.suggestedActions.push(action);
        });
    }

    handleDocumentVerification(verification) {
        // Handle document verification results
        console.log('Document verification:', verification);
    }

    toggleUploadArea(show = null) {
        const uploadArea = document.getElementById('documentUploadArea');
        const isVisible = uploadArea.style.display !== 'none';
        
        if (show === null) {
            uploadArea.style.display = isVisible ? 'none' : 'block';
        } else {
            uploadArea.style.display = show ? 'block' : 'none';
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        const sendBtn = document.getElementById('sendMessage');
        const chatInput = document.getElementById('chatInput');

        if (show) {
            indicator.style.display = 'flex';
            this.isProcessing = true;
            sendBtn.disabled = true;
            chatInput.disabled = true;
        } else {
            indicator.style.display = 'none';
            this.isProcessing = false;
            sendBtn.disabled = false;
            chatInput.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease-out;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#15ff74' : '#2563eb'};
            color: white;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    saveChatHistory() {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(this.messages));
            localStorage.setItem('uploadedDocuments', JSON.stringify(this.uploadedDocuments));
        } catch (e) {
            console.error('Error saving chat history:', e);
        }
    }

    loadChatHistory() {
        try {
            const savedMessages = localStorage.getItem('chatHistory');
            const savedDocs = localStorage.getItem('uploadedDocuments');

            if (savedMessages) {
                this.messages = JSON.parse(savedMessages);
                // Restore messages (optional - might want to show only recent)
            }

            if (savedDocs) {
                this.uploadedDocuments = JSON.parse(savedDocs);
                this.updateSidebarDocuments();
            }
        } catch (e) {
            console.error('Error loading chat history:', e);
        }
    }
}

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatAssistant = new ChatAssistant();
});

// Chat Assistant JavaScript
// Gestion du chat, upload de documents, et suggestions de liens

class ChatAssistant {
    constructor() {
        this.messages = [];
        this.uploadedFiles = [];
        this.suggestedLinks = [];
        this.isUploadOpen = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.updateDocumentStatus();
    }

    setupEventListeners() {
        // Chat input
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        sendButton.addEventListener('click', () => this.sendMessage());
        
        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });

        // Document upload
        const toggleUpload = document.getElementById('toggleUpload');
        const closeUpload = document.getElementById('closeUpload');
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        const browseFiles = document.getElementById('browseFiles');

        toggleUpload.addEventListener('click', () => this.toggleUploadArea());
        closeUpload.addEventListener('click', () => this.toggleUploadArea());
        browseFiles.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Sidebar toggle
        const toggleSidebar = document.getElementById('toggleSidebar');
        toggleSidebar.addEventListener('click', () => this.toggleSidebar());
    }

    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Show loading indicator
        this.showLoading();

        // Simulate API call (remplacer par un vrai appel API)
        setTimeout(() => {
            this.hideLoading();
            this.processBotResponse(message);
        }, 1000 + Math.random() * 1000);
    }

    addMessage(text, sender = 'bot', metadata = {}) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${sender}`;
        
        const time = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let messageContent = '';
        
        if (sender === 'bot') {
            messageContent = `
                <div class="message__avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
                    </svg>
                </div>
                <div class="message__content">
                    <div class="message__text">${this.formatMessage(text)}</div>
                    <div class="message__time">${time}</div>
                </div>
            `;
        } else {
            messageContent = `
                <div class="message__avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="message__content">
                    <div class="message__text">${this.escapeHtml(text)}</div>
                    <div class="message__time">${time}</div>
                </div>
            `;
        }

        messageDiv.innerHTML = messageContent;
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Store message
        this.messages.push({ text, sender, time, metadata });
        this.saveChatHistory();
    }

    formatMessage(text) {
        // Convert markdown-like formatting to HTML
        let formatted = this.escapeHtml(text);
        
        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Lists
        formatted = formatted.replace(/^\- (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async processBotResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Analyse du message pour détecter les intentions
        let response = '';
        let suggestedLinks = [];
        let actionSuggestions = [];

        // Détection de mots-clés et génération de réponses
        if (lowerMessage.includes('document') || lowerMessage.includes('dossier') || lowerMessage.includes('pièce')) {
            response = `Je peux vous aider avec vos documents ! 📄\n\nVous pouvez :\n- Déposer vos documents en cliquant sur l'icône de pièce jointe\n- Me demander quels documents sont nécessaires pour une candidature\n- Me demander de vérifier vos documents déposés\n\nQuelle aide souhaitez-vous ?`;
            
            suggestedLinks.push({
                title: 'Documents nécessaires pour une candidature',
                description: 'Liste complète des pièces à fournir',
                url: 'index.html#documents'
            });
        }
        
        else if (lowerMessage.includes('candidature') || lowerMessage.includes('postuler') || lowerMessage.includes('appliquer')) {
            response = `Pour postuler à un logement sur Seventee :\n\n1. **Créez votre compte** candidat\n2. **Déposez votre dossier** (pièces d'identité, justificatifs de revenus)\n3. **Recherchez un logement** dans votre ville\n4. **Postulez** en un clic sur les biens qui vous intéressent\n\nLes agences reçoivent uniquement les dossiers pré-qualifiés, ce qui augmente vos chances ! 🎯`;
            
            suggestedLinks.push({
                title: 'Créer mon compte candidat',
                description: 'Inscription gratuite en 2 minutes',
                url: 'index.html#inscription'
            });
            suggestedLinks.push({
                title: 'Rechercher un logement',
                description: 'Découvrez les offres disponibles',
                url: 'index.html#candidats'
            });
        }
        
        else if (lowerMessage.includes('agence') || lowerMessage.includes('propriétaire') || lowerMessage.includes('louer')) {
            response = `En tant qu'agence immobilière, Seventee vous permet de :\n\n✅ **Réduire vos coûts** de 50% sur les portails\n✅ **Gagner 6 heures** par location\n✅ **Recevoir uniquement 2-3 dossiers** qualifiés au lieu de 50 candidatures\n\nNos dossiers sont pré-vérifiés (identité et revenus) pour vous faire gagner du temps. 💼`;
            
            suggestedLinks.push({
                title: 'Découvrir l\'offre agence',
                description: 'Tout savoir sur Seventee pour les agences',
                url: 'index.html#agences'
            });
            suggestedLinks.push({
                title: 'Demander une démo',
                description: 'Découvrez la plateforme en action',
                url: 'index.html#demo'
            });
        }
        
        else if (lowerMessage.includes('vérifier') || lowerMessage.includes('vérification') || lowerMessage.includes('valider')) {
            if (this.uploadedFiles.length > 0) {
                response = this.verifyDocuments();
            } else {
                response = `Pour vérifier vos documents, veuillez d'abord les déposer en cliquant sur l'icône de pièce jointe. 📎\n\nUne fois déposés, je pourrai vérifier leur complétude et leur validité.`;
            }
        }
        
        else if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('bonsoir')) {
            response = `Bonjour ! 👋\n\nJe suis là pour vous aider avec vos questions sur la location immobilière. Je peux :\n- Répondre à vos questions\n- Vérifier vos documents\n- Vous guider dans vos démarches\n- Suggérer des actions pertinentes\n\nComment puis-je vous aider aujourd'hui ?`;
        }
        
        else if (lowerMessage.includes('aide') || lowerMessage.includes('help')) {
            response = `Voici comment je peux vous aider :\n\n**Pour les candidats :**\n- Créer votre dossier de candidature\n- Vérifier vos documents\n- Trouver un logement\n- Comprendre le processus\n\n**Pour les agences :**\n- Découvrir l'offre Seventee\n- Demander une démo\n- Comprendre les avantages\n- Voir les témoignages\n\nQue souhaitez-vous faire ?`;
            
            suggestedLinks.push({
                title: 'Comment ça marche',
                description: 'Processus complet expliqué',
                url: 'index.html#comment-ca-marche'
            });
        }
        
        else {
            // Réponse générique avec suggestions
            response = `Je comprends votre question. 🤔\n\nPour mieux vous aider, pouvez-vous préciser si vous êtes :\n- Un **candidat** à la location\n- Une **agence immobilière**\n\nOu posez-moi une question plus spécifique sur :\n- Les documents nécessaires\n- Le processus de candidature\n- L'offre pour les agences\n- La vérification de documents`;
        }

        // Ajouter la réponse du bot
        this.addMessage(response, 'bot');

        // Ajouter des suggestions d'actions pour les agences
        if (lowerMessage.includes('agence') || lowerMessage.includes('propriétaire')) {
            actionSuggestions = [
                'Publier une annonce sur Seventee',
                'Consulter les candidatures qualifiées',
                'Réduire vos coûts de diffusion',
                'Gagner du temps sur le tri des dossiers'
            ];
            
            this.addActionSuggestions(actionSuggestions);
        }

        // Ajouter les liens suggérés
        if (suggestedLinks.length > 0) {
            this.addSuggestedLinks(suggestedLinks);
        }
    }

    verifyDocuments() {
        if (this.uploadedFiles.length === 0) {
            return 'Aucun document à vérifier. Veuillez d\'abord déposer vos documents.';
        }

        let response = '**Vérification de vos documents :** 📋\n\n';
        const requiredDocs = ['pièce d\'identité', 'justificatif de revenus', 'avis d\'imposition', 'garantie'];
        const foundDocs = [];
        const missingDocs = [];

        // Simulation de vérification (à remplacer par une vraie vérification avec LLM/OCR)
        this.uploadedFiles.forEach(file => {
            const fileName = file.name.toLowerCase();
            let docType = 'Document';
            
            if (fileName.includes('identité') || fileName.includes('cni') || fileName.includes('passeport')) {
                docType = 'Pièce d\'identité';
                foundDocs.push('pièce d\'identité');
            } else if (fileName.includes('revenu') || fileName.includes('salaire') || fileName.includes('fiche')) {
                docType = 'Justificatif de revenus';
                foundDocs.push('justificatif de revenus');
            } else if (fileName.includes('avis') || fileName.includes('impôt') || fileName.includes('impot')) {
                docType = 'Avis d\'imposition';
                foundDocs.push('avis d\'imposition');
            } else if (fileName.includes('garant') || fileName.includes('caution')) {
                docType = 'Garantie';
                foundDocs.push('garantie');
            }

            const isValid = Math.random() > 0.3; // Simulation : 70% de validité
            const badge = isValid ? 
                '<span class="verification-badge verification-badge--valid">✓ Valide</span>' :
                '<span class="verification-badge verification-badge--invalid">✗ À vérifier</span>';
            
            response += `• **${docType}** (${file.name}) ${badge}\n`;
        });

        // Documents manquants
        requiredDocs.forEach(doc => {
            if (!foundDocs.includes(doc)) {
                missingDocs.push(doc);
            }
        });

        if (missingDocs.length > 0) {
            response += `\n**Documents manquants :**\n`;
            missingDocs.forEach(doc => {
                response += `• ${doc}\n`;
            });
        } else {
            response += `\n✅ **Votre dossier est complet !** Vous pouvez maintenant postuler à des logements.`;
        }

        // Suggestions pour les agences
        if (missingDocs.length === 0 && this.uploadedFiles.length >= 3) {
            response += `\n\n💡 **Suggestions pour l'agence :**\n`;
            response += `→ Ce dossier est prêt pour une décision rapide\n`;
            response += `→ Organiser une visite dans les 48h\n`;
            response += `→ Vérifier la compatibilité avec les critères du bien`;
        }

        return response;
    }

    addActionSuggestions(actions) {
        const chatMessages = document.getElementById('chatMessages');
        const lastMessage = chatMessages.lastElementChild;
        
        if (lastMessage && lastMessage.classList.contains('message--bot')) {
            const actionDiv = document.createElement('div');
            actionDiv.className = 'action-suggestion';
            actionDiv.innerHTML = `
                <div class="action-suggestion__title">💡 Suggestions d'actions :</div>
                <ul class="action-suggestion__list">
                    ${actions.map(action => `<li class="action-suggestion__item">${action}</li>`).join('')}
                </ul>
            `;
            
            const messageContent = lastMessage.querySelector('.message__content');
            messageContent.appendChild(actionDiv);
        }
    }

    addSuggestedLinks(links) {
        const sidebarLinks = document.getElementById('sidebarLinks');
        
        // Remove empty state
        const emptyState = sidebarLinks.querySelector('.sidebar__empty');
        if (emptyState) {
            emptyState.remove();
        }

        links.forEach(link => {
            // Check if link already exists
            const existingLink = Array.from(sidebarLinks.querySelectorAll('.sidebar-link')).find(
                el => el.getAttribute('href') === link.url
            );
            
            if (!existingLink) {
                const linkElement = document.createElement('a');
                linkElement.className = 'sidebar-link';
                linkElement.href = link.url;
                linkElement.target = '_blank';
                linkElement.innerHTML = `
                    <div class="sidebar-link__title">${link.title}</div>
                    <div class="sidebar-link__description">${link.description}</div>
                `;
                sidebarLinks.appendChild(linkElement);
                this.suggestedLinks.push(link);
            }
        });
    }

    toggleUploadArea() {
        const uploadArea = document.getElementById('documentUpload');
        this.isUploadOpen = !this.isUploadOpen;
        uploadArea.classList.toggle('active', this.isUploadOpen);
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            // Validate file type and size
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            const maxSize = 10 * 1024 * 1024; // 10 MB

            if (!validTypes.includes(file.type)) {
                alert(`Le fichier ${file.name} n'est pas dans un format accepté (PDF, JPG, PNG)`);
                return;
            }

            if (file.size > maxSize) {
                alert(`Le fichier ${file.name} est trop volumineux (max 10 Mo)`);
                return;
            }

            // Add to uploaded files
            this.uploadedFiles.push(file);
            this.displayUploadedFile(file);
            this.updateDocumentStatus();
            
            // Notify bot about new document
            setTimeout(() => {
                this.addMessage(`J'ai bien reçu votre document "${file.name}". Voulez-vous que je le vérifie ?`, 'bot');
            }, 500);
        });
    }

    displayUploadedFile(file) {
        const uploadList = document.getElementById('uploadedFiles');
        const fileDiv = document.createElement('div');
        fileDiv.className = 'uploaded-file';
        fileDiv.dataset.fileName = file.name;
        
        const fileIcon = file.type === 'application/pdf' ? 
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' :
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        
        fileDiv.innerHTML = `
            <div class="uploaded-file__icon">${fileIcon}</div>
            <div class="uploaded-file__name">${file.name}</div>
            <div class="uploaded-file__size">${this.formatFileSize(file.size)}</div>
            <button class="uploaded-file__remove" onclick="chatAssistant.removeFile('${file.name}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        uploadList.appendChild(fileDiv);
    }

    removeFile(fileName) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.name !== fileName);
        const fileElement = document.querySelector(`[data-file-name="${fileName}"]`);
        if (fileElement) {
            fileElement.remove();
        }
        this.updateDocumentStatus();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    updateDocumentStatus() {
        const statusContainer = document.getElementById('documentStatus');
        
        if (this.uploadedFiles.length === 0) {
            statusContainer.innerHTML = '<p class="document-status__empty">Aucun document déposé</p>';
            return;
        }

        statusContainer.innerHTML = this.uploadedFiles.map(file => {
            const status = Math.random() > 0.3 ? 'valid' : 'pending';
            return `
                <div class="document-status__item">
                    <div class="document-status__icon document-status__icon--${status}"></div>
                    <span>${file.name}</span>
                </div>
            `;
        }).join('');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('chatSidebar');
        sidebar.classList.toggle('hidden');
    }

    showLoading() {
        const loading = document.getElementById('loadingIndicator');
        loading.classList.add('active');
    }

    hideLoading() {
        const loading = document.getElementById('loadingIndicator');
        loading.classList.remove('active');
    }

    saveChatHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            try {
                this.messages = JSON.parse(saved);
                // Optionally restore messages to UI
            } catch (e) {
                console.error('Error loading chat history:', e);
            }
        }
    }
}

// Initialize chat assistant when DOM is ready
let chatAssistant;
document.addEventListener('DOMContentLoaded', () => {
    chatAssistant = new ChatAssistant();
});

/**
 * WebSocket Chat Client
 * Handles real-time messaging with automatic reconnection
 */

class WebSocketChat {
    constructor() {
        this.ws = null;
        this.username = '';
        this.userProfile = null;
        this.sessionId = '';
        this.currentRoomId = '';
        this.currentChatName = '';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.chats = [];
        this.filteredChats = [];
        this.messages = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.selectedFiles = [];
        this.pendingFiles = [];
        
        // Add remove all files button event
        this.removeAllFilesBtn = document.getElementById('removeAllFilesBtn');
        if (this.removeAllFilesBtn) {
            this.removeAllFilesBtn.addEventListener('click', () => this.removeAllFiles());
        }
        
        // File upload tracking
        this.uploadProgress = new Map(); // Track upload progress for each file
        this.downloadProgress = new Map(); // Track download progress for each file
        this.activeUploads = new Set(); // Track active uploads progress for all file
        this.activeDownloads = new Set(); // Track active download progress for all file
        this.CHUNK_SIZE = 15 * 1024 * 1024; // 15 MB
        this.maxConcurrentUploads = 15;
        this.maxConcurrentDownloads = 15;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeDarkMode();
        this.showLoginModal();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Login elements
        this.loginModal = document.getElementById('loginModal');
        this.usernameInput = document.getElementById('usernameInput');
        this.loginBtn = document.getElementById('loginBtn');
        this.loginError = document.getElementById('loginError');
        
        // Chat elements 
        this.chatContainer = document.querySelector('.chat-container');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.currentUserName = document.getElementById('currentUserName');
        this.currentUserAvatar = document.getElementById('userAvatar');
        this.userStatusDot = document.getElementById('userStatusDot');
        this.welcomeUsername = document.getElementById('welcomeUsername');
        this.chatList = document.getElementById('chatList');
        this.chatTitle = document.getElementById('chatTitle');
        this.chatStatus = document.getElementById('chatStatus');
        this.chatAvatar = document.getElementById('chatAvatar');
        this.chatStatusDot = document.getElementById('chatStatusDot');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.fileInput = document.getElementById('fileInput');
        this.attachBtn = document.getElementById('attachBtn');
        this.fileList = document.getElementById('fileList');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.totalChatsCount = document.getElementById('totalChatsCount');
        
        // Search and filter elements
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.clearSearchBtn.style.display = 'none';
        this.filterTabs = document.querySelectorAll('.filter-tab');
        
        // Filter count elements
        this.allCount = document.getElementById('allCount');
        this.unreadCount = document.getElementById('unreadCount');
        this.personalCount = document.getElementById('personalCount');
        this.groupsCount = document.getElementById('groupsCount');
        this.onlineCount = document.getElementById('onlineCount');
        
        // Settings dropdown
        this.settingsDropdown = document.getElementById('settingsDropdown');

        this.newGroupBtn = document.getElementById('newGroupBtn');

        this.activeSessionsBtn = document.getElementById('activeSessionsBtn');
        this.activeSessionsModal = document.getElementById('activeSessionsModal');
        this.closeSessionsModal = document.getElementById('closeSessionsModal');

        this.logoutBtn = document.getElementById('logoutBtn');
        
        this.chatDetails = document.getElementById('chatDetails');

        // Dark mode toggle
        this.darkModeToggle = document.getElementById('darkModeToggle');
        
        // Add missing currentUserContact element
        this.currentUserContact = document.getElementById('currentUserContact');
        
        // Toast container
        this.toastContainer = document.getElementById('toastContainer');
        this.notificationToast = document.getElementById('notificationToast');
        
        // Notification elements
        this.notificationIcon = document.getElementById('notificationIcon');
        this.notificationPanel = document.getElementById('notificationPanel');
        this.notificationClose = document.getElementById('notificationClose');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Login events
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') this.handleLogin();
        });

        // Message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') this.sendMessage();
        });
        this.messageInput.addEventListener('input', () => this.updateSendButtonState());

        // File attachment events
        this.attachBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));

        // Search and filter events
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.clearSearch();
        });
        this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => this.handleFilterChange(tab.dataset.filter));
        });

        // Action buttons
        this.refreshBtn.addEventListener('click', () => this.refreshChats());
        this.settingsBtn.addEventListener('click', () => this.toggleSettingsDropdown());
        
        // Settings dropdown actions
        this.newGroupBtn.addEventListener('click', () => this.handleNewGroup());
        this.activeSessionsBtn.addEventListener('click', () => this.handleActiveSessions());

        this.closeSessionsModal.addEventListener('click', () => { this.hideActiveSessionsModal(); });

        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Chat Details Modal
        chatDetails.addEventListener('click', () => this.openChatDetailsModal());

        // Dark mode toggle
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());

        // Notification events
        this.notificationIcon.addEventListener('click', () => this.showNotificationPanel());
        this.notificationClose.addEventListener('click', () => this.hideNotificationPanel());

        // Close modal when clicking outside
        this.activeSessionsModal.addEventListener('click', (e) => {
            if (e.target.id === 'activeSessionsModal') {
                this.hideActiveSessionsModal();
            }
        });

        // Close settings dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.settingsBtn.contains(e.target) && !this.settingsDropdown.contains(e.target)) {
                this.settingsDropdown.classList.remove('show');
            }
            if (e.target.classList.contains('modal')) {
                if (e.target === avatarActionsModal) this.closeAvatarActionsModal();
                if (e.target === chatDetailsModal) this.closeChatDetailsModalHandler();
                if (e.target === activeSessionsModal) this.hideActiveSessionsModal();
                if (e.target === newGroupModal) this.closeNewGroupModalHandler();
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }

    openChatDetailsModal() {
        this.setupChatDetailsModal();
        if (!this.currentRoomId) return;
        // this.currentRoomId = roomId;
        // this.currentChatName = chatName;
        this.chatDetailsModal.style.display = 'flex';

        // chatDetailsAvatar.textContent = currentChat.avatar;
        // chatDetailsName.textContent = currentChat.name;
        
        // if (currentChat.type === 'group') {
        //     chatDetailsContact.textContent = `${currentChat.members.length} members`;
        //     detailsSectionTitle.textContent = 'Group Members';
        //     loadGroupMembers(currentChat);
        // } else {
        //     chatDetailsContact.textContent = '+91 99450 26856'; // Sample contact
        //     detailsSectionTitle.textContent = 'Groups in Common';
        //     loadCommonGroups(currentChat);
        // }
    }

    closeChatDetailsModalHandler() {
        this.chatDetailsModal.style.display = 'none';
    }

    setupChatDetailsModal() {
        // Chat Details Modal
        this.chatDetailsModal = document.getElementById('chatDetailsModal');
        this.closeChatDetailsModal = document.getElementById('closeChatDetailsModal');

        this.chatDetailsAvatar = document.getElementById('chatDetailsAvatar');
        this.chatDetailsName = document.getElementById('chatDetailsName');
        this.chatDetailsContact = document.getElementById('chatDetailsContact');
        this.detailsContent = document.getElementById('detailsContent');
        this.detailsSectionTitle = document.getElementById('detailsSectionTitle');

        this.detailAudioBtn = document.getElementById('detailAudioBtn');
        this.detailVideoBtn = document.getElementById('detailVideoBtn');
        this.detailPayBtn = document.getElementById('detailPayBtn');
        this.detailSearchBtn = document.getElementById('detailSearchBtn');

        this.closeChatDetailsModal.addEventListener('click', () => this.closeChatDetailsModalHandler());
        this.detailAudioBtn.addEventListener('click', () => this.handleAction('audio'));
        this.detailVideoBtn.addEventListener('click', () => this.handleAction('video'));
        this.detailPayBtn.addEventListener('click', () => this.handleAction('pay'));
        this.detailSearchBtn.addEventListener('click', () => this.handleAction('search'));
    
    }

    sendActiveSessions() {
        const loginData = {
            action: 'get_my_sessions',
            username: this.username,
            sessionid: this.sessionId,
            deviceip: '127.0.0.1',
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };

        this.sendJSON(loginData);
    }

    showActiveSessionsModal() {
        activeSessionsModal.style.display = 'flex';
    }

    hideActiveSessionsModal() {
        activeSessionsModal.style.display = 'none';
    }

    loadActiveSessions(sessionsHistory) {
        const sessionsContent = document.getElementById('sessionsContent');
        // Show loading spinner
        sessionsContent.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading sessions...</p>
            </div>
        `;
        this.renderSessions(sessionsHistory.my_sessions || []);
    }
    
    renderSessions(sessions) {
        const sessionsContent = document.getElementById('sessionsContent');
        
        // Categorize sessions
        const currentSession = sessions.filter(s => s.SessnId === this.sessionId);
        const activeSessions = sessions.filter(s => s.SessType === 1 && s.SessnId !== this.sessionId);
        const olderSessions = sessions.filter(s => s.SessType === 0);

        let html = '';

        // Current Session
        if (currentSession.length > 0) {
            html += this.renderSessionCategory('Current Session', currentSession, '🟢', false);
        }

        // Other Active Sessions
        if (activeSessions.length > 0) {
            html += this.renderSessionCategory('Other Active Sessions', activeSessions, '🟡', true);
        }

        // Older Sessions
        if (olderSessions.length > 0) {
            html += this.renderSessionCategory('Older Sessions', olderSessions, '⚫', false);
        }

        if (html === '') {
            html = `
                <div class="empty-category">
                    <div class="empty-category-icon">📱</div>
                    <p>No sessions found</p>
                </div>
            `;
        }

        sessionsContent.innerHTML = html;

        // Add event listeners for terminate buttons
        this.addTerminateEventListeners(activeSessions);
    }

    renderSessionCategory(title, sessions, icon, showTerminateAll) {
        const count = sessions.length;
        
        let html = `
            <div class="session-category">
                <div class="category-header">
                    <div class="category-title">
                        <span class="category-icon">${icon}</span>
                        <span class="category-name">${title}</span>
                        <span class="category-count">${count}</span>
                    </div>
        `;

        if (showTerminateAll && count > 0) {
            html += `
                    <button class="terminate-all-btn" id="terminateAllBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Terminate All (${count})
                    </button>
            `;
        }

        html += `
                </div>
                <div class="session-list">
        `;

        if (sessions.length === 0) {
            html += `
                <div class="empty-category">
                    <p>No ${title.toLowerCase()} found</p>
                </div>
            `;
        } else {
            sessions.forEach(session => {
                html += this.renderSessionItem(session);
            });
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    renderSessionItem(session) {
        const isCurrent = session.SessnId === this.sessionId;
        const isActive = session.SessType === 1;
        const isOnline = session.Status === 'Online';
        
        let iconClass = 'offline';
        let sessionIcon = '📱';
        
        if (isCurrent) {
            iconClass = 'current';
            sessionIcon = '✅';
        } else if (isActive) {
            iconClass = 'active';
            sessionIcon = '🔄';
        }

        const showTerminateBtn = !isCurrent && isOnline;

        return `
            <div class="session-item" data-conn-id="${session.ConnId}">
                <div class="session-icon ${iconClass}">
                    ${sessionIcon}
                </div>
                <div class="session-details">
                    <div class="session-type">${session.ConnId} : ${session.SessnId}</div>
                    <div class="session-info">
                        <div class="session-ip">IP: ${session.DeviceIP}</div>
                        <div class="session-time">Connected: ${session.Conn_At}</div>
                        ${session.Discn_At ? `<div class="session-time">Disconnected: ${session.Discn_At}</div>` : ''}
                    </div>
                    <div class="session-status">
                        <div class="status-dot-small ${isOnline ? 'online' : 'offline'}"></div>
                        <span class="status-text-small">${session.Status}</span>
                    </div>
                </div>
                <div class="session-actions">
                    ${showTerminateBtn ? `
                        <button class="terminate-btn" id="terminateBtn${session.ConnId}" title="Terminate Session">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    addTerminateEventListeners(activeSessions) {
        const terminateAllBtn = document.getElementById('terminateAllBtn');
        if (terminateAllBtn) {
            terminateAllBtn.addEventListener('click', () => {
                console.log('Terminate All clicked!');
                this.terminateSession(activeSessions.map(s => s.ConnId));
            });
        }

        activeSessions.forEach(session => {
            const btnId = `terminateBtn${session.ConnId}`;
            const terminateBtn = document.getElementById(btnId);
            if (terminateBtn) {
                terminateBtn.addEventListener('click', () => {
                    console.log('Terminate ', session.ConnId, ' clicked!'); 
                    this.terminateSession([session.ConnId]);
                });
            } else {
                console.warn(`Terminate button not found for ConnId: ${session.ConnId}`);
            }
        });
    }    

    terminateSession(activeConnId) {
        const terminateData = {
            action: 'terminate_session',
            username: this.username,
            sessionid: this.sessionId,
            connId: activeConnId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };

        this.sendJSON(terminateData);
        console.log('Feature coming soon!', activeConnId);
    }

    showSessionsError(message) {
        const sessionsContent = document.getElementById('sessionsContent');
        sessionsContent.innerHTML = `
            <div class="empty-category">
                <div class="empty-category-icon">❌</div>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Initialize dark mode
     */
    initializeDarkMode() {
        // Set dark mode as default
        document.body.classList.add('dark-mode');
        this.updateDarkModeIcon(true);

        // Initialize login theme toggle
        const loginThemeToggle = document.getElementById('loginThemeToggle');
        if (loginThemeToggle) {
            loginThemeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                this.updateDarkModeIcon(isDark);
                localStorage.setItem('darkMode', isDark);
            });
        }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        this.updateDarkModeIcon(isDark);
        
        // Save preference
        localStorage.setItem('darkMode', isDark);
    }

    /**
     * Update dark mode icon
     */
    updateDarkModeIcon(isDark) {
        this.darkModeToggle.innerHTML = isDark ? 
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>` :
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>`;
    }

    /**
     * Show notification panel
     */
    showNotificationPanel() {
        // this.notificationPanel.classList.add('show');
        this.toggleNotificationPanel();
    }

    toggleNotificationPanel() {
        this.notificationPanel.classList.toggle('show');
    }
    
    /**
     * Hide notification panel
     */
    hideNotificationPanel() {
        this.notificationPanel.classList.remove('show');
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        this.loginModal.style.display = 'flex';
        this.usernameInput.focus();
        this.chatContainer.style.display = 'none';
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
        // console.log('Hiding login modal');
        this.loginModal.style.display = 'none';
        this.chatContainer.style.display = 'flex';
        
        // Reset login button state
        this.loginBtn.disabled = false;
        this.loginBtn.textContent = 'Connect';
    }

    /**
     * Handle login process
     */
    handleLogin() {
        const username = this.usernameInput.value.trim();
        
        if (!username) {
            this.showLoginError('Please enter a username');
            return;
        }

        this.username = username;
        this.sessionId = this.generateSessionId();
        this.loginError.textContent = '';
        this.loginBtn.disabled = true;
        this.loginBtn.textContent = 'Connecting...';
        
        this.connect();
    }

    /**
     * Show login error
     */
    showLoginError(message) {
        this.loginError.textContent = message;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type == 'error' ? '❌' : type == 'success' ? '✅' : 'ℹ️'}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Show notification toast
     */
    showNotificationToast(title, message) {
        const titleEl = this.notificationToast.querySelector('.notification-title');
        const messageEl = this.notificationToast.querySelector('.notification-message');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        this.notificationToast.classList.add('show');
        
        setTimeout(() => {
            this.notificationToast.classList.remove('show');
        }, 3000);
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique batch ID
     */
    generateBatchId() {
        return 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        this.updateConnectionStatus('Connecting...', false);
        
        try {
            // Add connection timeout
            const connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState == WebSocket.CONNECTING) {
                    this.ws.close();
                    this.handleConnectionError();
                }
            }, 10000); // 10 second timeout
            
            // this.ws = new WebSocket('wss://nodejsws-67yl.onrender.com');
            this.ws = new WebSocket('ws://localhost:5173');
            
            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                this.handleConnect();
            };
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = () => {
                clearTimeout(connectionTimeout);
                this.handleDisconnect();
            };
            this.ws.onerror = (error) => this.handleError(error);
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError();
        }
    }

    /**
     * Handle successful connection
     */
    handleConnect() {
        console.log('Connected to WebSocket server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('Connected', true);
        
        // Send login message
        this.sendLoginMessage();
    }

    /**
     * Send login message to server
     */
    sendLoginMessage() {
        if (this.username) {
            const loginData = {
                action: 'login',
                username: this.username,
                sessionid: this.sessionId,
                deviceip: '127.0.0.1',
                batchId: this.generateBatchId(),
                requestId: this.generateBatchId()
            };

            this.sendJSON(loginData);
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            
            // Check if we have a valid response structure
            if (data && (data.phpOutput || data.status)) {
                this.handleServerResponse(data);
            } else {
                console.warn('Invalid response structure:', data);
            }
            
        } catch (error) {
            console.error('Error parsing message:', error, 'Raw data:', event.data);
            // Try to handle non-JSON responses
            if (event.data) {
                console.log('Raw message received:', event.data);
            }
        }
    }

    /**
     * Handle server response
     */
    handleServerResponse(data) {
        // console.log('Processing server response:', data);
        
        const { phpOutput, originalData, status } = data;
        
        if (!phpOutput) {
            console.warn('No phpOutput in response:', data);
            return;
        }

        // Handle login response
        if (originalData?.action == 'login' && phpOutput.login) {
            this.handleLoginResponse(phpOutput);
        }
        
        // Handle chat list response
        if (phpOutput.get_chats) {
            this.handleChatsResponse(phpOutput.get_chats);
        }
        
        // Handle get messages response
        if (phpOutput.get_messages) {
            this.handleMessagesResponse(phpOutput);
        }
        
        // Handle send message response
        if (phpOutput.send_message) {
            this.handleSendMessageResponse(phpOutput.send_message);
        }
        
        // Handle chunk upload response
        if (phpOutput.chunk_upload) {
            this.handleChunkUploadResponse(phpOutput.chunk_upload);
        }
        
        // Handle receiver sessions (incoming messages)
        if (phpOutput.get_receiver_sessions) {
            this.handleIncomingMessage(phpOutput.get_receiver_sessions);
        }

        // Handle max_chunkindex response
        if (phpOutput.get_max_chunkindex) {
            this.handleMaxChunkIndexResponse(data);
        }
        
        // Handle chunk assemble response
        if (phpOutput.chunk_assemble || phpOutput.chunk_append) {
            this.handleChunkAssembleResponse(data);
        }

        // Handle active session response
        if (phpOutput.get_active_sessions && phpOutput.get_active_sessions.active_sessions && phpOutput.get_active_sessions.online_users) {
            this.handleOnlineOfflineResponse(phpOutput.get_active_sessions);
        }

        // Handle sender session response
        if (phpOutput.get_sender_sessions && phpOutput.get_sender_sessions.sender_sessions && phpOutput.get_sender_sessions.sender_messages) {
            this.handleDeliveryMessage(phpOutput.get_sender_sessions);
        }

        // Handle my session response
        if (phpOutput.get_my_sessions && phpOutput.get_my_sessions.my_sessions) {
            this.loadActiveSessions(phpOutput.get_my_sessions);
        } else if (phpOutput.get_active_sessions && phpOutput.get_active_sessions.my_sessions) {
            this.loadActiveSessions(phpOutput.get_active_sessions);
        }

        // Handle terminate session response
        if (phpOutput.terminate_session && phpOutput.terminate_session.terminate_session) {
            const termsess = phpOutput.terminate_session.terminate_session;
            if (termsess[0].SessnId == this.sessionId) {
                this.handleLogout();
                console.log('Terminated successfully:', this.userProfile);
            }
        }

        // Handle get users response
        if (phpOutput.get_users) {
            this.handleGetUsersResponse(phpOutput.get_users);
        }

        // Handle create group response
        if (phpOutput.create_group) {
            this.handleCreateGroupResponse(phpOutput.create_group);
        }
    }

    handleCreateGroupResponse(create_group) {
        // this.refreshChats()
        this.showToast(create_group.message, 'success');
    }

    /**
     * Handle login response
     */
    handleLoginResponse(phpOutput) {
        // console.log('Handling login response:', phpOutput);
        
        // Check for successful login in multiple possible response formats
        const loginSuccess = (phpOutput.login && phpOutput.login.status == 'success') ||
                           (phpOutput.get_chats && phpOutput.get_chats.status == 'success');
        
        if (loginSuccess) {
            // Get user profile from response
            if (phpOutput.get_user_profile && phpOutput.get_user_profile.status == 'success') {
                this.userProfile = phpOutput.get_user_profile.user_profile;
                // console.log('User profile loaded:', this.userProfile);
            }
            
            // console.log('Login successful, hiding modal and enabling chat');
            this.hideLoginModal();
            this.updateUserInfo();
            this.enableChat();
            
            // If we already have chats in the response, use them
            if (phpOutput.get_chats) {
                this.handleChatsResponse(phpOutput.get_chats);
            } else {
                this.loadChats();
            }
            
            this.showToast('Login successful!', 'success');
        } else {
            const errorMessage = (phpOutput.login && phpOutput.login.message) || 'Login failed';
            console.log('Login failed:', errorMessage);
            this.handleLoginError(errorMessage);
            this.showToast(errorMessage, 'error');
        }
    }

    /**
     * Handle login error
     */
    handleLoginError(message) {
        this.showLoginError(message);
        this.loginBtn.disabled = false;
        this.loginBtn.textContent = 'Connect';
        this.updateConnectionStatus('Connection Error', false);
    }

    /**
     * Handle chats response
     */
    handleChatsResponse(chatsData) {
        // console.log('Handling chats response:', chatsData);
        
        if (chatsData.status == 'success') {
            this.chats = chatsData.chats || [];
            // console.log('Loaded chats:', this.chats.length);
            this.updateChatCounts();
            this.applyFiltersAndSearch();
        } else {
            console.warn('Failed to load chats:', chatsData);
            this.showToast('Failed to load conversations', 'error');
        }
    }

    handleMessagesResponse(responseData) {
        const messagesData = responseData.get_messages;
        const filesData = responseData.get_message_files;
        const recpro = responseData.get_receiver_profile.receiver_profile[0];
        // console.log('Handling messages response:', messagesData);

        if (messagesData && messagesData.status == 'success') {
            this.messages = messagesData.messages || [];
            
            // Handle message files from get_message_files response
            if (filesData && filesData.status == 'success') {
                this.messageFiles = filesData.message_files || [];
            } else {
                this.messageFiles = [];
            }
            
            // Update chat list with latest message info
            if (this.messages.length > 0 && this.currentRoomId) {
                this.updateChatFromMessages(this.currentRoomId, this.messages);
            }
            
            if (recpro && recpro.RoomId == this.currentRoomId) {
                this.chatStatus.textContent = recpro.Status;
                this.chatStatusDot.className = `chat-status-dot ${recpro.Status.includes('Online') ? 'online' : ''}`;
                // console.log('this.chatStatus.textContent', session.Status);
            }
            
            this.renderMessages();
        } else {
            console.warn('Failed to load messages:', responseData);
        }
    }

    /**
     * Handle send message response
     */
    handleSendMessageResponse(sendData) {
        // console.log('Handling send message response:', sendData);
        
        if (sendData.status == 'success') {
            // Handle file uploads if files were sent
            if (sendData.files && sendData.files.length > 0) {
                this.handleFileUploads(sendData.files);
            }
            this.loadMessages();
        } else {
            console.warn('Failed to send message:', sendData);
            this.showToast('Failed to send message', 'error');
        }
    }

    /**
     * Handle file uploads after successful message send
     */
    handleFileUploads(files) {
        console.log('Starting file uploads:', files);
        
        // Show notification panel
        this.showNotificationPanel();
        
        // Start uploading each file
        files.forEach(fileInfo => {
            const originalFile = this.pendingFiles.find(f => f.name === fileInfo.FileName);
            if (originalFile) {
                this.sendFileInChunks(originalFile, fileInfo.FileId);
            }
        });
    }

    /**
     * Send file in chunks
     */
    sendFileInChunks(file, fileId) {
        const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);

        this.activeUploads.add(fileId);
        this.uploadProgress.set(fileId, {
            fileId: fileId,
            fileName: file.name,
            roomName: this.currentChatName,
            fileSize: file.size,
            totalChunks: totalChunks,
            currentChunk: 0,
            percentage: 0
        });
        
        this.updateUploadProgressDisplay();
        
        // Start with first chunk
        this.sendNextChunk(file, fileId, 0, totalChunks);
    }

    /**
     * Send next chunk of file
     */
    sendNextChunk(file, fileId, chunkIndex, totalChunks) {
        const offset = chunkIndex * this.CHUNK_SIZE;
        const blob = file.slice(offset, offset + this.CHUNK_SIZE);
        const reader = new FileReader();
        const sessionId = this.generateSessionId();

        reader.onload = (e) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const header = JSON.stringify({
                    action: 'chunk_upload',
                    username: this.username,
                    fileId: fileId,
                    fileName: file.name,
                    sessionid: sessionId,
                    chunkIndex: chunkIndex,
                    totalChunks: totalChunks,
                    batchId: this.generateBatchId(),
                    requestId: this.generateBatchId()
                });

                const encoder = new TextEncoder();
                const headerBytes = encoder.encode(header);
                const headerLengthBuffer = new Uint32Array([headerBytes.length]).buffer;
                const chunkBuffer = new Uint8Array(e.target.result);

                const fullBuffer = new Uint8Array(4 + headerBytes.length + chunkBuffer.length);
                fullBuffer.set(new Uint8Array(headerLengthBuffer), 0);
                fullBuffer.set(headerBytes, 4);
                fullBuffer.set(chunkBuffer, 4 + headerBytes.length);

                // Store pending chunk info for response handling
                this.pendingChunks = this.pendingChunks || new Map();
                this.pendingChunks.set(`${fileId}_${chunkIndex}`, {
                    file: file,
                    fileId: fileId,
                    chunkIndex: chunkIndex,
                    totalChunks: totalChunks
                });

                this.ws.send(fullBuffer);
                console.log(`Sent chunk ${chunkIndex + 1}/${totalChunks} for file ${file.name}`);
            }
        };

        reader.readAsArrayBuffer(blob);
    }

    /**
     * Handle chunk upload response
     */
    handleChunkUploadResponse(chunkData) {
        
        if (chunkData.status === 'success') {
            const fileId = chunkData.fileId;
            const chunkIndex = parseInt(chunkData.chunkIndex);
            const totalChunks = parseInt(chunkData.totalChunks);
            
            // Find pending chunk info
            const pendingKey = `${fileId}_${chunkIndex}`;
            const pendingChunk = this.pendingChunks?.get(pendingKey);
            
            if (pendingChunk) {
                // Update progress
                console.log('chunk upload response:', this.uploadProgress);
                const progress = this.uploadProgress.get(fileId);
                
                if (progress) {
                    progress.currentChunk = chunkIndex + 1;
                    progress.percentage = Math.round((progress.currentChunk / progress.totalChunks) * 100);
                    this.updateUploadProgressDisplay();
                }
                
                // Send next chunk if not finished
                if (chunkIndex + 1 < totalChunks) {
                    this.sendNextChunk(pendingChunk.file, fileId, chunkIndex + 1, totalChunks);
                } else {
                    // Upload completed
                    console.log(`File upload completed: ${pendingChunk.file.name}`);
                    this.showNotificationToast('Upload Complete', `${pendingChunk.file.name} uploaded successfully`);
                    
                    this.uploadProgress.delete(fileId);
                    this.activeUploads.delete(fileId);
                    this.updateUploadProgressDisplay();
                    this.updateDownloadButtonStates();
                }
                
                // Clean up pending chunk
                this.pendingChunks.delete(pendingKey);
            }
        } else {
            console.error('Chunk upload failed:', chunkData);
            this.showToast('Chunk upload failed', 'error');
            this.uploadProgress.delete(fileId);
            this.activeUploads.delete(fileId);
            this.updateUploadProgressDisplay();
            this.updateDownloadButtonStates();
        }
    }

    /**
     * Update upload progress display in notification panel
     */
    updateUploadProgressDisplay() {
        // Don't clear existing items, just update or add new ones
        if (!this.notificationPanel) return;
        
        const content = this.notificationPanel.querySelector('.notification-panel-content');
        if (!content) return;
        
        const uploadCount = this.uploadProgress.size;
        
        if (uploadCount === 0) return;
        
        // Create or find upload section
        // let uploadSection = content.querySelector('.upload-section');
        // if (!uploadSection) {
            // uploadSection = document.createElement('div');
            // uploadSection.className = 'upload-section';
            // uploadSection.innerHTML = '<h4>File Uploads</h4>';
            // content.appendChild(uploadSection);
        // }
        
        this.uploadProgress.forEach((progress, fileId) => {
            // Check if progress item already exists
            let progressItem = content.querySelector(`[data-file-id="${fileId}"]`);
            
            if (!progressItem) {
                // Create new progress item
                progressItem = document.createElement('div');
                progressItem.className = 'upload-progress-item';
                progressItem.dataset.fileId = fileId;
                content.appendChild(progressItem);
            }
            
            if (progress.currentChunk == progress.totalChunks) {
                progressItem.innerHTML = `
                    <div class="upload-info">
                        <div class="upload-header">
                            <div class="upload-icon">📤</div>
                            <div class="upload-details">
                                <div class="upload-filename">${this.escapeHtml(progress.fileName)}</div>
                                <div class="upload-room">Room : ${this.escapeHtml(progress.roomName)}</div>
                            </div>
                            <div class="upload-percentage">${progress.percentage}%</div>
                        </div>
                        
                            <a href="#" class="upload-link" onclick="window.chatApp.downloadFilePOST('${fileId}', '${this.username}', '${this.sessionId}'); return false;">Click here to download</a>

                        <div class="upload-stats">
                            <span>Chunk ${progress.currentChunk}/${progress.totalChunks}</span>
                            <span>${this.formatFileSize(progress.fileSize)}</span>
                        </div>
                    </div>
                `;
            } else {
                progressItem.innerHTML = `
                    <div class="upload-info">
                        <div class="upload-header">
                            <div class="upload-icon">📤</div>
                            <div class="upload-details">
                                <div class="upload-filename">${this.escapeHtml(progress.fileName)}</div>
                                <div class="upload-room">Room : ${this.escapeHtml(progress.roomName)}</div>
                            </div>
                            <div class="upload-percentage">${progress.percentage}%</div>
                        </div>
                        <div class="upload-progress-bar">
                            <div class="upload-progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <div class="upload-stats">
                            <span>Chunk ${progress.currentChunk}/${progress.totalChunks}</span>
                            <span>${this.formatFileSize(progress.fileSize)}</span>
                        </div>
                    </div>
                `;
            }
        });
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(receiverData) {
        console.log('handleIncomingMessage(), get_receiver_sessions');
        
        if (receiverData.receiver_sessions && receiverData.receiver_sessions.length > 0) {
            const session = receiverData.receiver_sessions[0];
            
            // Update chat list with new message info instead of making get_chats request
            this.updateChatFromReceiverSession(session);
            
            if (session.RoomId == this.currentRoomId) {
                this.loadMessages();
            }
        }
    }

    /**
     * Handle active session response
     */
    handleOnlineOfflineResponse(responseData) {
        // console.log('handleOnlineOfflineResponse');
        if (responseData.online_users && responseData.online_users.length > 0) {
            const session = responseData.online_users.find(chat => chat.RoomId == this.currentRoomId);
            
            this.updateChatFromActiveSession(responseData.online_users);

            if (session && session.RoomId == this.currentRoomId) {
                this.chatStatus.textContent = session.Status;
                this.chatStatusDot.className = `chat-status-dot ${session.Status.includes('Online') ? 'online' : ''}`;
                // console.log('this.chatStatus.textContent', session.Status);
            }
        }
    }

    /**
     * Handle sender session response
     */
    handleDeliveryMessage(senderData) {
        // console.log('handleOnlineOfflineResponse');
        if (senderData.sender_messages && senderData.sender_messages.length > 0) {
            const session = senderData.sender_messages.find(chat => chat.RoomId == this.currentRoomId);
            
            if (session && session.RoomId == this.currentRoomId) {
                this.updateChatFromSenderSession(senderData.sender_messages);
                // console.log('this.chatStatus.textContent', session.Status);
            }
        }
    }

    /**
     * Update chat from sender session response
     */
    updateChatFromSenderSession(sessionmessage) {
        sessionmessage.forEach(user => {
            const selectedMsg = document.querySelector(`[data-msg-id="${user.MsgId}"]`);
            if (selectedMsg) {
                // Select the tick container inside the message
                const tickContainer = selectedMsg.querySelector('.message-status');
                if (tickContainer) {
                    let tickHtml = '';

                    if (user.MsgState === 1) {
                        tickHtml = `<span class="message-tick sent-tick">✔</span>`;
                    } else if (user.MsgState === 2) {
                        tickHtml = `<span class="message-tick delivered-tick">✔✔</span>`;
                    } else if (user.MsgState === 3) {
                        tickHtml = `<span class="message-tick seen-tick">✔✔</span>`;
                    }

                    tickContainer.innerHTML = tickHtml;
                }
            }
            // console.log('activeOnline', this.chats[chatIndex]);
        });
    }

    /**
     * Update chat from active session response
     */
    updateChatFromActiveSession(activeOnline) {
        // console.log('updateChatFromActiveSession', activeOnline);

        activeOnline.forEach(user => {
            const chatIndex = this.chats.findIndex(chat => chat.RoomId == user.RoomId);
            this.chats[chatIndex].Status = user.Status;
            // console.log('activeOnline', this.chats[chatIndex]);
        });
        this.updateChatCounts();
        this.applyFiltersAndSearch();
    }

    /**
     * Update chat from receiver session (incoming message)
     */
    updateChatFromReceiverSession(session) {
        const chatIndex = this.chats.findIndex(chat => chat.RoomId == session.RoomId);
        // console.log('Updating user chat with ReceiverSession:', chatIndex);
        if (chatIndex != -1) {
            // Update existing chat
            this.chats[chatIndex].MsgStr = session.MsgStr;
            this.chats[chatIndex].Status = session.Status;
            // console.log('Updating user chat with ReceiverSession:', session);
            // Only increment unread if it's not the current active chat
            if (session.RoomId != this.currentRoomId) {
                this.chats[chatIndex].Unread = session.Unread;
            }
            
            // Move chat to top of list
            const updatedChat = this.chats.splice(chatIndex, 1)[0];
            this.chats.unshift(updatedChat);
            
            // this.updateChatCounts();
            // this.applyFiltersAndSearch();
        } else {
            // Add new chat to the top
            const newChat = {
                RoomId: session.RoomId,
                MsgStr: session.MsgStr,
                Status: session.Status,
                MsgTxt: session.MsgTxt,
                Unread: session.Unread,
                ChatType: session.ChatType,
                Name: session.Name,
                FileName: session.FileName
            };
            this.chats.unshift(newChat);
        }
    
        this.updateChatCounts();
        this.applyFiltersAndSearch();
    }

    /**
     * Update chat from messages response
     */
    updateChatFromMessages(roomId, messages) {
        const chatIndex = this.chats.findIndex(chat => chat.RoomId == roomId);
        
        if (chatIndex != -1 && messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            // console.log('Updating user chat with msg:', latestMessage);
            // Update chat with latest message and reset unread count
            this.chats[chatIndex].MsgStr = latestMessage.MsgStr;
            this.chats[chatIndex].Status = latestMessage.Status;
            this.chats[chatIndex].Unread = 0; // Reset unread count when viewing messages
            
            this.updateChatCounts();
            this.applyFiltersAndSearch();
        }
    }

    /**
     * Update user info in UI
     */
    updateUserInfo() {
        // console.log('Updating user info with profile:', this.userProfile);
        
        // Display name and contact info separately
        const displayName = this.userProfile[0].name || this.username;
        // const contactInfo = this.userProfile?.email || this.userProfile?.mobile || this.username;
        
        this.currentUserName.textContent = displayName;
        // this.currentUserContact.textContent = contactInfo;
        this.currentUserAvatar.textContent = displayName.charAt(0).toUpperCase();
        this.userStatusDot.className = `chat-status-dot ${this.userProfile[0].Status.includes('Online') ? 'online' : ''}`;
        this.welcomeUsername.textContent = displayName;
    }

    /**
     * Handle file selection
     */
    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        const maxSize = 1024 * 1024 * 1024; // 1GB in bytes
        
        // Filter files that exceed size limit
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
            if (file.size <= maxSize) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        });
        
        // Show error for files that exceed limit
        if (invalidFiles.length > 0) {
            this.showToast(`Files exceed 1GB limit: ${invalidFiles.join(', ')}`, 'error');
        }
        
        // Add valid files to selection
        this.selectedFiles = [...this.selectedFiles, ...validFiles];
        this.renderFileList();
        this.updateSendButtonState();
        
        // Clear file input
        event.target.value = '';
    }

    /**
     * Remove file from selection
     */
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
        this.updateSendButtonState();
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Remove all files from selection
     */
    removeAllFiles() {
        this.selectedFiles = [];
        this.renderFileList();
        this.updateSendButtonState();
    }

    /**
     * Render file list
     */
    renderFileList() {
        if (this.selectedFiles.length === 0) {
            this.fileList.style.display = 'none';
            return;
        }
        
        this.fileList.style.display = 'block';
        this.fileList.innerHTML = `
            <div class="file-list-header">
                <span class="file-list-title">Selected Files (${this.selectedFiles.length})</span>
                <button class="remove-all-btn" onclick="window.chatApp.removeAllFiles()" title="Remove all files">
                    Remove All
                </button>
            </div>
        `;
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">📎</div>
                    <div class="file-details">
                        <div class="file-name">${this.escapeHtml(file.name)}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button class="file-remove-btn" onclick="window.chatApp.removeFile(${index})" title="Remove file">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            `;
            
            this.fileList.appendChild(fileItem);
        });
    }

    /**
     * Update send button state
     */
    updateSendButtonState() {
        // console.log('this.messageInput.value.trim().length', this.messageInput.value.trim().length);
        const hasMessage = this.messageInput.value.trim().length > 0;
        const hasFiles = this.selectedFiles.length > 0;
        this.sendBtn.disabled = !(hasMessage || hasFiles) || !this.isConnected;
        this.messageInput.style.height = 'auto'; // Reset
        if (hasMessage) {
            const maxHeight = parseFloat(getComputedStyle(this.messageInput).lineHeight) * 5;
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, maxHeight) + 'px';
            this.messageInput.style.overflowY = this.messageInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
        } else {
            this.messageInput.value = '';
        }
        // this.messageInput.style.height = '-1px';
    }

    /**
     * Update chat counts
     */
    updateChatCounts() {
        const allCount = this.chats.length;
        const unreadCount = this.chats.filter(chat => chat.Unread > 0).length;
        const personalCount = this.chats.filter(chat => chat.ChatType == 'Single').length;
        const groupsCount = this.chats.filter(chat => chat.ChatType == 'Group').length;
        const onlineCount = this.chats.filter(chat => chat.Status == 'Online' && chat.ChatType == 'Single'
        ).length;
        
        this.allCount.textContent = `(${allCount})`;
        this.unreadCount.textContent = `(${unreadCount})`;
        this.personalCount.textContent = `(${personalCount})`;
        this.groupsCount.textContent = `(${groupsCount})`;
        this.onlineCount.textContent = `(${onlineCount})`;
        
        this.totalChatsCount.textContent = `${allCount} conversation${allCount != 1 ? 's' : ''}`;
    }

    /**
     * Enable chat functionality
     */
    enableChat() {
        this.messageInput.disabled = false;
        this.attachBtn.disabled = false;
        this.messageInput.placeholder = 'Type a message...';
        this.updateSendButtonState();
    }

    /**
     * Load chats from server
     */
    loadChats() {
        const chatsData = {
            action: 'get_chats',
            username: this.username,
            sessionid: this.sessionId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };

        this.sendJSON(chatsData);
    }

    /**
     * Refresh chats
     */
    refreshChats() {
        this.loadChats();
        this.showNotificationToast('Chats Refreshed', 'Chat list has been updated');
    }

    /**
     * Load messages for current room
     */
    loadMessages() {
        if (!this.currentRoomId) return;

        const messagesData = {
            action: 'get_messages',
            username: this.username,
            roomid: this.currentRoomId,
            sessionid: this.sessionId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };

        this.sendJSON(messagesData);
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.clearSearchBtn.style.display = query ? 'block' : 'none';
        this.applyFiltersAndSearch();
    }

    /**
     * Clear search
     */
    clearSearch() {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.clearSearchBtn.style.display = 'none';
        this.applyFiltersAndSearch();
    }

    /**
     * Handle filter change
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter == filter);
        });
        
        this.applyFiltersAndSearch();
    }

    /**
     * Apply filters and search
     */
    applyFiltersAndSearch() {
        let filtered = [...this.chats];
        // console.log('applyFiltersAndSearch:', filtered);
        // Apply filter
        if (this.currentFilter != 'all') {
            filtered = filtered.filter(chat => {
                switch (this.currentFilter) {
                    case 'unread':
                        return chat.Unread > 0;
                    case 'groups':
                        return chat.ChatType == 'Group';
                    case 'personal':
                        return chat.ChatType == 'Single';
                    case 'online':
                        return chat.Status == 'Online' && chat.ChatType == 'Single'; ;
                    default:
                        return true;
                }
            });
        }
        
        // Apply search
        if (this.searchQuery) {
            filtered = filtered.filter(chat => 
                chat.Name.toLowerCase().includes(this.searchQuery) 
                // ||
                // chat.MsgStr.toLowerCase().includes(this.searchQuery)
            );
        }
        
        this.filteredChats = filtered;
        this.renderChatList();
    }

    /**
     * Render chat list
     */
    renderChatList() {
        this.chatList.innerHTML = '';
        
        if (this.filteredChats.length == 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <p>No chats found</p>
                <small>${this.searchQuery ? 'Try a different search term' : 'Start a conversation'}</small>
            `;
            this.chatList.appendChild(emptyState);
            return;
        }
        // console.log('renderChatList:', this.filteredChats);
        this.filteredChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.roomId = chat.RoomId;
            
            const isOnline = chat.Status == 'Online' || chat.Status.includes('Online');
            const statusClass = isOnline ? 'online' : 'offline';
            
            const unreadBadge = chat.Unread > 0 ? 
                `<div class="chat-item-unread">${chat.Unread}</div>` : '';
            
            chatItem.innerHTML = `
                <div class="chat-item-avatar">
                    <span>${chat.Name.charAt(0).toUpperCase()}</span>
                    <div class="chat-item-status-dot ${statusClass}"></div>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <div class="chat-item-name">${chat.Name}</div>
                        <div class="chat-item-time">${chat.Status}</div>
                    </div>
                    <div class="chat-item-preview">
                        <span>${this.escapeHtml(this.base64ToString(chat.MsgStr))}</span>
                        ${unreadBadge}
                    </div>
                </div>
            `;

            chatItem.addEventListener('click', (e) => {
                // Don't trigger chat selection if avatar was clicked
                if (!e.target.closest('.chat-item-avatar')) {
                    this.selectChat(chat.RoomId, chat.Name);
                }
                // this.selectChat(chat.RoomId, chat.Name);
            });

            // Add click event for avatar
            const avatar = chatItem.querySelector('.chat-item-avatar');
            avatar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openAvatarActionsModal(chat);
            });
            
            this.chatList.appendChild(chatItem);
        });
    }

    openAvatarActionsModal(chat) {
        this.setupAvatarActionsModal();
        this.avatarActionsModal.style.display = 'flex';
        this.avatarLargeInitial.textContent = chat.Name.charAt(0).toUpperCase();
        this.avatarUserName.textContent = chat.Name;
        this.avatarActionsModal.dataset.chatId = chat.RoomId;
    }

    closeAvatarActionsModal() {
        this.avatarActionsModal.style.display = 'none';
        delete this.avatarActionsModal.dataset.chatId;
    }

    setupAvatarActionsModal() {
        // Avatar Actions Modal
        this.avatarActionsModal = document.getElementById('avatarActionsModal');
        this.closeAvatarModal = document.getElementById('closeAvatarModal');
        this.avatarLargeInitial = document.getElementById('avatarLargeInitial');
        this.avatarUserName = document.getElementById('avatarUserName');
        this.avatarUserContact = document.getElementById('avatarUserContact');
        this.audioCallBtn = document.getElementById('audioCallBtn');
        this.videoCallBtn = document.getElementById('videoCallBtn');
        this.payBtn = document.getElementById('payBtn');
        this.searchBtn = document.getElementById('searchBtn');

        // Avatar Actions Modal
        closeAvatarModal.addEventListener('click', () => this.closeAvatarActionsModal());
        audioCallBtn.addEventListener('click', () => this.handleAction('audio'));
        videoCallBtn.addEventListener('click', () => this.handleAction('video'));
        payBtn.addEventListener('click', () => this.handleAction('pay'));
        searchBtn.addEventListener('click', () => this.handleAction('search'));
    }

    handleAction(action) {
        let message = '';
        switch (action) {
            case 'audio':
                message = `New feature coming soon!`;
                break;
            case 'video':
                message = `New feature coming soon!`;
                break;
            case 'pay':
                message = `New feature coming soon!`;
                break;
            case 'search':
                message = `New feature coming soon!`;
                break;
            default :
                message = `Invalid action!`;
                break;
        }
        
        this.showToast(message, 'info');
        // this.closeAvatarActionsModal();
        // this.closeChatDetailsModalHandler();
    }
    /**
     * Format time for display
     */
    formatTime(timeString) {
        if (timeString == 'Online') return 'Online';
        if (timeString.includes('Online')) return 'Online';
        return timeString;
    }

    /**
     * Select a chat
     */
    selectChat(roomId, chatName) {
        // Clear selected files when switching conversations
        this.selectedFiles = [];
        this.renderFileList();
        this.updateSendButtonState();
        
        this.currentRoomId = roomId;
        this.currentChatName = chatName;
        
        // Update active chat in UI
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-room-id="${roomId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Update chat header
        this.chatTitle.textContent = chatName;
        // this.chatStatus.textContent = isOnline ? 'Online' : 'Offline';
        this.chatAvatar.textContent = chatName.charAt(0).toUpperCase();
        // this.chatStatusDot.className = `chat-status-dot ${isOnline ? 'online' : ''}`;
        
        // Load messages for this chat
        this.loadMessages();
        
        // Hide welcome screen and show messages
        this.messagesContainer.innerHTML = '<div class="messages-list" id="messagesList"></div>';

        document.querySelector('.message-input-container').style.display = 'block';
    }

    /**
     * Render messages
     */
    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            messagesList.appendChild(messageEl);
        });
        
        this.scrollToBottom();
    }

    /**
     * Create message element
     */
    createMessageElement(message) {
        const messageEl = document.createElement('div');
        const isOwnMessage = message.User == this.username || message.User == 'system';

        // messageEl.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
        let messageClass = 'message ';
        if (message.User == 'system') {
            messageClass += 'system';
        } else {
            messageClass += isOwnMessage ? 'sent' : 'received';
        }
        messageEl.className = messageClass;
        messageEl.dataset.msgId = message.MsgId;

        let tickHtml = '';
        let messageStatusHtml = '';

        if (isOwnMessage) {
            if (message.MsgState === 1) {
                tickHtml = `<span class="message-tick sent-tick">✔</span>`;
            } else if (message.MsgState === 2) {
                tickHtml = `<span class="message-tick delivered-tick">✔✔</span>`;
            } else if (message.MsgState === 3) {
                tickHtml = `<span class="message-tick seen-tick">✔✔</span>`;
            }

            messageStatusHtml = `<div class="message-status">${tickHtml}</div>`;
        }
        
        const time = new Date(message.Sent_At).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Get files for this message
        const messageFiles = this.messageFiles ? this.messageFiles.filter(file => parseInt(file.MsgId) === parseInt(message.MsgId)) : [];
        const enrichedFiles = messageFiles.map(file => {
            const isUploading = this.uploadProgress?.has(file.FileId) ?? false;
            const isDownloading = this.downloadProgress?.has(file.FileId) ?? false;
            const isDisabled = isUploading || isDownloading;
        
            return { ...file, isUploading, isDownloading, isDisabled };
        });
        let filesHtml = '';
        if (enrichedFiles.length > 0) {
            filesHtml = `
                <div class="message-files">
                    ${enrichedFiles.map(file => `
                        <div class="message-file">
                            <div class="message-file-icon">📎</div>
                            <div class="message-file-info">
                                <div class="message-file-name">${this.escapeHtml(file.FileName)}</div>
                                <div class="message-file-size">${file.FileSize}</div>
                            </div>
                            <button class="message-file-download" 
                                data-file-id="${file.FileId}" 
                                data-file-name="${file.FileName}" 
                                ${file.isDisabled ? 'disabled' : ''}>
                                📥
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        messageEl.innerHTML = `
            <div class="message-bubble">
                <div class="message-header">
                    <span class="message-username">${message.User == 'system' ? 'OMS Chat' : (message.Name || message.User)}</span>
                    <span class="message-time">${time}</span>
                </div>
                ${message.MsgTxt ? `<div class="message-content">${this.escapeHtml(this.base64ToString(message.MsgTxt))}</div>` : ''}
                ${filesHtml}
                ${messageStatusHtml}
            </div>
        `;
        // ✅ Add download click listeners ONLY IF there are messageFiles
        if (messageFiles.length > 0) {
            setTimeout(() => {
                messageEl.querySelectorAll('.message-file-download').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const fileId = btn.dataset.fileId;
                        const fileName = btn.dataset.fileName;
                        this.downloadFile(fileId, fileName);
                    });
                });
            }, 0);
        }
        return messageEl;
    }

    /**
     * Send message
     */
    sendMessage() {
        const messageText = this.stringToBase64(this.messageInput.value.trim());
        
        if ((!messageText && this.selectedFiles.length === 0) || !this.currentRoomId) return;
        
        // Store files before clearing for upload process
        this.pendingFiles = [...this.selectedFiles];
        
        const messageData = {
            action: 'send_message',
            username: this.username,
            roomid: this.currentRoomId,
            message: messageText || '',
            sessionid: this.sessionId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };
        
        // Add file data if files are selected
        if (this.selectedFiles.length > 0) {
            messageData.files = this.selectedFiles.map(file => file.name);
            messageData.size = this.selectedFiles.map(file => file.size);
        }
        
        this.sendJSON(messageData);
        this.messageInput.value = '';
        this.selectedFiles = [];
        this.renderFileList();
        this.updateSendButtonState();
    }

    /**
     * Toggle settings dropdown
     */
    toggleSettingsDropdown() {
        this.settingsDropdown.classList.toggle('show');
    }

    /**
     * Handle new group action
     */
    handleNewGroup() {
        this.settingsDropdown.classList.remove('show');
        // this.showToast('New group feature coming soon!', 'info');
        this.openNewGroupModal();
    }

    setupNewGroupModal() {
        this.newGroupBtn = document.getElementById('newGroupBtn');
        this.newGroupModal = document.getElementById('newGroupModal');
        this.closeNewGroupModal = document.getElementById('closeNewGroupModal');
        this.cancelGroupBtn = document.getElementById('cancelGroupBtn');
        this.createGroupBtn = document.getElementById('createGroupBtn');
        this.groupNameInput = document.getElementById('groupNameInput');
        this.groupNameInput?.addEventListener('input', (e) => {
            this.updateCreateButtonState();
        });
        this.groupNameError = document.getElementById('groupNameError');
        this.availableUsersList = document.getElementById('availableUsersList');
        this.selectedUsersList = document.getElementById('selectedUsersList');

        this.availableUsersSearch = document.getElementById('availableUsersSearch');
        this.availableUsersSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.availableUsersSearch.value = '';
                this.clearAvailableSearch.style.display = 'none';
                this.filterUsers();
            }
        });
        this.selectedUsersSearch = document.getElementById('selectedUsersSearch');
        this.selectedUsersSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.selectedUsersSearch.value = '';
                this.clearSelectedSearch.style.display = 'none';
                this.filterUsers();
            }
        });
        this.clearAvailableSearch = document.getElementById('clearAvailableSearch');
        this.clearSelectedSearch = document.getElementById('clearSelectedSearch');
        
        // Transfer control buttons
        this.moveToSelected = document.getElementById('moveToSelected');
        this.moveAllToSelected = document.getElementById('moveAllToSelected');
        this.removeFromSelected = document.getElementById('removeFromSelected');
        this.removeAllFromSelected = document.getElementById('removeAllFromSelected');

        this.availableUsers = [];
        this.selectedUsers = [];
        this.filteredAvailableUsers = [];
        this.filteredSelectedUsers = [];

        this.closeNewGroupModal?.addEventListener('click', () => this.closeNewGroupModalHandler());
        this.cancelGroupBtn?.addEventListener('click', () => this.closeNewGroupModalHandler());
        this.createGroupBtn?.addEventListener('click', () => this.createNewGroupModalHandler());

        // Transfer button functionality
        this.moveToSelected?.addEventListener('click', () => {
            const selectedLogins = this.getSelectedItems('available');
            if (selectedLogins.length > 0) {
                this.moveUsersToSelected(selectedLogins);
            }
        });

        this.moveAllToSelected?.addEventListener('click', () => {
            const allLogins = this.availableUsers.map(u => u.login);
            this.moveUsersToSelected(allLogins);
        });
        
        this.removeFromSelected?.addEventListener('click', () => {
            const selectedLogins = this.getSelectedItems('selected');
            if (selectedLogins.length > 0) {
                this.moveUsersToAvailable(selectedLogins);
            }
        });
        
        this.removeAllFromSelected?.addEventListener('click', () => {
            const allLogins = this.selectedUsers.map(u => u.login);
            this.moveUsersToAvailable(allLogins);
        });

        // Setup drag and drop
        [availableUsersList, selectedUsersList].forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            list.addEventListener('drop', (e) => {
                e.preventDefault();
                const logins = JSON.parse(e.dataTransfer.getData('text/plain'));
                const source = e.dataTransfer.getData('source');

                if (list === this.selectedUsersList && source === 'available') {
                    this.moveUsersToSelected(logins);
                } else if (list === this.availableUsersList && source === 'selected') {
                    this.moveUsersToAvailable(logins);
                }
            });
        });

        // Search functionality
        this.availableUsersSearch?.addEventListener('input', (e) => {
            const value = e.target.value;
            this.clearAvailableSearch.style.display = value ? 'flex' : 'none';
            this.filterUsers();
        });
        
        this.selectedUsersSearch?.addEventListener('input', (e) => {
            const value = e.target.value;
            this.clearSelectedSearch.style.display = value ? 'flex' : 'none';
            this.filterUsers();
        });
        
        this.clearAvailableSearch?.addEventListener('click', () => {
            this.availableUsersSearch.value = '';
            this.clearAvailableSearch.style.display = 'none';
            this.filterUsers();
        });
        
        this.clearSelectedSearch?.addEventListener('click', () => {
            this.selectedUsersSearch.value = '';
            this.clearSelectedSearch.style.display = 'none';
            this.filterUsers();
        });

        // Close modal when clicking outside
        this.newGroupModal.addEventListener('click', (e) => {
            if (e.target.id === 'newGroupModal') {
                this.closeNewGroupModalHandler();
            }
        });
    }

    closeNewGroupModalHandler() {
        this.newGroupModal.style.display = 'none';
        this.resetGroupForm();
    }

    createNewGroupModalHandler() {
        const groupName = this.groupNameInput.value.trim();
        const selectedUserLogins = this.selectedUsers.map(u => u.login);

        if (groupName && selectedUserLogins.length > 0) {
            const requestData = {
                action: 'create_group',
                groupname: groupName,
                users: selectedUserLogins,
                username: this.username,
                sessionid: this.sessionId,
                batchId: this.generateBatchId(),
                requestId: this.generateBatchId()
            };
            this.sendJSON(requestData);
        }
        this.newGroupModal.style.display = 'none';
        this.resetGroupForm();
    }

    resetGroupForm() {
        this.groupNameInput.value = '';
        this.groupNameError.textContent = '';
        this.availableUsersSearch.value = '';
        this.selectedUsersSearch.value = '';
        this.clearAvailableSearch.style.display = 'none';
        this.clearSelectedSearch.style.display = 'none';
        this.availableUsers = [];
        this.selectedUsers = [];
        this.filteredAvailableUsers = [];
        this.filteredSelectedUsers = [];
        this.updateCreateButtonState();
        this.renderUserLists();
    }

    updateCreateButtonState() {
        const groupName = this.groupNameInput?.value.trim();
        const hasSelectedUsers = this.selectedUsers.length > 0;
        const isValid = groupName && groupName.length >= 2 && hasSelectedUsers;
        // console.log('groupName', groupName, 'hasSelectedUsers', hasSelectedUsers, 'isValid', isValid);
        if (this.createGroupBtn) {
            this.createGroupBtn.disabled = !isValid;
        }
    }

    openNewGroupModal() {
        this.setupNewGroupModal();
        this.newGroupModal.style.display = 'flex';
        
        // Reset form
        this.groupNameInput.value = '';
        this.groupNameError.textContent = '';
        this.availableUsersSearch.value = '';
        this.selectedUsersSearch.value = '';
        
        // Reset user selections
        this.selectedUsers = [];
        this.availableUsers = [];
        
        // Load users
        this.loadUsersForGroup();
        
        // Focus on group name input
        setTimeout(() => {
            this.groupNameInput.focus();
        }, 100);
    }

    loadUsersForGroup() {
        this.availableUsersList.innerHTML = `
            <div class="loading-users">
                <div class="spinner-small"></div>
                <p>Loading users...</p>
            </div>
        `;
        
        const requestData = {
            action: 'get_users',
            username: this.username,
            sessionid: this.sessionId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };
        this.sendJSON(requestData);
    }

    handleGetUsersResponse(data) {
        if (data.status === 'success' && data.users) {
            this.availableUsers = data.users.map(user => ({
                login: user.login,
                name: user.name,
                selected: false
            }));
            this.selectedUsers = [];
            this.filteredAvailableUsers = [...this.availableUsers];
            this.filteredSelectedUsers = [];
            this.renderUserLists();
            this.updateCreateButtonState();
        } else {
            this.showToast('Failed to load users', 'error');
            availableUsersList.innerHTML = `
                <div class="empty-selection">
                    <p>Failed to load users</p>
                </div>
            `;
        }
    }

    renderUserLists() {
        this.renderAvailableUsers(this.filteredAvailableUsers);
        this.renderSelectedUsers(this.filteredSelectedUsers);
    }
    
    renderAvailableUsers(users = this.availableUsers) {
        if (users.length === 0) {
            this.availableUsersList.innerHTML = `
                <div class="empty-selection">
                    <p>No users available</p>
                </div>
            `;
            return;
        }
        
        this.availableUsersList.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.draggable = true;
            userItem.dataset.login = user.login;
            
            userItem.innerHTML = `
                <div class="user-avatar-small">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <div class="user-info-small">
                    <div class="user-name-small">${user.name}</div>
                </div>
            `;
            
            userItem.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    this.toggleUserSelection(userItem, 'available');
                } else {
                    this.clearAllSelections('available');
                    this.toggleUserSelection(userItem, 'available');
                }
            });
            
            // Drag and drop
            // userItem.addEventListener('dragstart', (e) => {
            //     e.dataTransfer.setData('text/plain', user.login);
            //     e.dataTransfer.setData('source', 'available');
            // });

            userItem.addEventListener('dragstart', (e) => {
                // Get all selected users in the available list
                const selectedLogins = this.getSelectedItems('available');
                e.dataTransfer.setData('text/plain', JSON.stringify(selectedLogins));
                e.dataTransfer.setData('source', 'available');
            });
            
            this.availableUsersList.appendChild(userItem);
        });
    }
    
    renderSelectedUsers(users = this.selectedUsers) {
        if (users.length === 0) {
            this.selectedUsersList.innerHTML = `
                <div class="empty-selection">
                    <p>No users selected</p>
                </div>
            `;
            return;
        }
        
        this.selectedUsersList.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.draggable = true;
            userItem.dataset.login = user.login;
            
            userItem.innerHTML = `
                <div class="user-avatar-small">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <div class="user-info-small">
                    <div class="user-name-small">${user.name}</div>
                </div>
            `;
            
            userItem.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    this.toggleUserSelection(userItem, 'selected');
                } else {
                    this.clearAllSelections('selected');
                    this.toggleUserSelection(userItem, 'selected');
                }
            });
            
            // Drag and drop
            // userItem.addEventListener('dragstart', (e) => {
            //     e.dataTransfer.setData('text/plain', user.login);
            //     e.dataTransfer.setData('source', 'selected');
            // });

            userItem.addEventListener('dragstart', (e) => {
                // Get all selected users in the selected list
                const selectedLogins = this.getSelectedItems('selected');
                e.dataTransfer.setData('text/plain', JSON.stringify(selectedLogins));
                e.dataTransfer.setData('source', 'selected');
            });

            this.selectedUsersList.appendChild(userItem);
        });
    }

    toggleUserSelection(userItem, listType) {
        userItem.classList.toggle('selected');
    }
    
    clearAllSelections(listType) {
        const container = listType === 'available' ? availableUsersList : selectedUsersList;
        container.querySelectorAll('.user-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }

    getSelectedItems(listType) {
        const container = listType === 'available' ? availableUsersList : selectedUsersList;
        return Array.from(container.querySelectorAll('.user-item.selected')).map(item => item.dataset.login);
    }

    filterUsers() {
        const availableQuery = this.availableUsersSearch.value.toLowerCase();
        const selectedQuery = this.selectedUsersSearch.value.toLowerCase();
        
        this.filteredAvailableUsers = this.availableUsers.filter(user => 
            user.name.toLowerCase().includes(availableQuery) ||
            user.login.toLowerCase().includes(availableQuery)
        );
        
        this.filteredSelectedUsers = this.selectedUsers.filter(user => 
            user.name.toLowerCase().includes(selectedQuery) ||
            user.login.toLowerCase().includes(selectedQuery)
        );
        
        this.renderUserLists();
    }

    moveUsersToSelected(logins) {
        logins.forEach(login => {
            const userIndex = this.availableUsers.findIndex(u => u.login === login);
            if (userIndex !== -1) {
                const user = this.availableUsers.splice(userIndex, 1)[0];
                this.selectedUsers.push(user);
            }
        });
        this.filterUsers();
        this.renderUserLists();
        this.updateCreateButtonState();
    }

    moveUsersToAvailable(logins) {
        logins.forEach(login => {
            const userIndex = this.selectedUsers.findIndex(u => u.login === login);
            if (userIndex !== -1) {
                const user = this.selectedUsers.splice(userIndex, 1)[0];
                this.availableUsers.push(user);
            }
        });
        this.filterUsers();
        this.renderUserLists();
        this.updateCreateButtonState();
    }

    /**
     * Handle active sessions action
     */
    handleActiveSessions() {
        this.settingsDropdown.classList.remove('show');
        // this.showToast('Active sessions feature coming soon!', 'info');
        this.showActiveSessionsModal();
        this.sendActiveSessions();
    }

    /**
     * Handle logout
     */
    handleLogout() {
        this.settingsDropdown.classList.remove('show');
        
        // Disconnect and reset
        this.disconnect();
        this.resetApplication();
        this.showLoginModal();
        this.showToast('Logged out successfully', 'success');
    }

    /**
     * Reset application state
     */
    resetApplication() {
        this.username = '';
        this.userProfile = null;
        this.sessionId = '';
        this.currentRoomId = '';
        this.currentChatName = '';
        this.chats = [];
        this.filteredChats = [];
        this.messages = [];
        this.searchQuery = '';
        this.currentFilter = 'all';
        this.selectedFiles = [];
        
        // Reset UI
        this.usernameInput.value = '';
        this.loginBtn.disabled = false;
        this.loginBtn.textContent = 'Connect';
        this.loginError.textContent = '';
        this.searchInput.value = '';
        this.clearSearchBtn.style.display = 'none';
        this.selectedFiles = [];
        this.renderFileList();
        this.hideNotificationPanel();
        this.hideActiveSessionsModal();
        this.notificationPanel.querySelector('.notification-panel-content').innerHTML = '';

        this.uploadProgress.clear();     // Clears all upload progress entries
        this.downloadProgress.clear();   // Clears all download progress entries
        this.activeUploads.clear();      // Clears all active uploads
        this.activeDownloads.clear();    // Clears all active downloads

        // Reset filter tabs
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter == 'all');
        });
        
        this.disableChat();
        this.resetWelcomeScreen();
    }

    /**
     * Reset welcome screen
     */
    resetWelcomeScreen() {
        document.querySelector('.message-input-container').style.display = 'none';
        this.chatStatusDot.className = `chat-status-dot`;
        this.chatTitle.textContent = `Select a chat`;
        this.chatStatus.textContent = `Choose a conversation to start messaging`;
        this.messagesContainer.innerHTML = `
            <div class="welcome-container" id="welcomeContainer"><div class="welcome-screen" id="welcomeScreen">
                <div class="welcome-icon">💬</div>
                <h3>Welcome to OMS Chat</h3>
                <p>Hi <span id="welcomeUsername"></span>! Select a conversation to start chatting</p>
                <div class="connection-info">
                    <div class="connection-indicator">
                        <span class="connection-dot"></span>
                        <span>Connected</span>
                    </div>
                    <div class="chat-count">
                        <span class="chat-count-icon">👥</span>
                        <span id="totalChatsCount">0 conversations</span>
                    </div>
                </div>
            </div></div>

            <!-- Post-login welcome page -->
            <div class="post-login-welcome" id="postLoginWelcome" style="display: none;">
                <div class="welcome-animation">
                    <div class="welcome-logo">💬</div>
                    <div class="welcome-pulse"></div>
                </div>
                <h2>Welcome to OMS Chat!</h2>
                <p>Hi <span id="postLoginUsername"></span>! You're now connected and ready to chat.</p>
                <div class="welcome-stats">
                    <div class="stat-item">
                        <div class="stat-icon">👥</div>
                        <div class="stat-text">
                            <span class="stat-number" id="welcomeTotalChats">0</span>
                            <span class="stat-label">Conversations</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">📱</div>
                        <div class="stat-text">
                            <span class="stat-number" id="welcomeOnlineChats">0</span>
                            <span class="stat-label">Online</span>
                        </div>
                    </div>
                </div>
                <button class="welcome-continue-btn" id="welcomeContinueBtn">Start Chatting</button>
            </div>
        `;
        
        // Re-initialize elements
        this.welcomeUsername = document.getElementById('welcomeUsername');
        this.totalChatsCount = document.getElementById('totalChatsCount');
        this.postLoginWelcome = document.getElementById('postLoginWelcome');
        this.postLoginUsername = document.getElementById('postLoginUsername');
        this.welcomeContinueBtn = document.getElementById('welcomeContinueBtn');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.welcomeTotalChats = document.getElementById('welcomeTotalChats');
        this.welcomeOnlineChats = document.getElementById('welcomeOnlineChats');
        
        // Re-attach event listener
        if (this.welcomeContinueBtn) {
            this.welcomeContinueBtn.addEventListener('click', () => this.hidePostLoginWelcome());
        }
    }

    /**
     * Send JSON data through WebSocket
     */
    sendJSON(data) {
        if (this.ws && this.ws.readyState == WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            console.log('Sent:', data);
        } else {
            console.error('WebSocket not connected, readyState:', this.ws ? this.ws.readyState : 'null');
            this.showToast('Connection lost. Reconnecting...', 'warning');
            this.handleConnectionError();
        }
    }

    /**
     * Handle disconnect
     */
    handleDisconnect() {
        console.log('Disconnected from WebSocket server');
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected', false);
        this.disableChat();
        
        if (this.username && this.sessionId) {
            console.log('handleDisconnect()');
            this.attemptReconnect();
        }
    }

    /**
     * Handle WebSocket error
     */
    handleError(error) {
        console.error('WebSocket error:', error);
        this.handleConnectionError();
    }

    /**
     * Handle connection error
     */
    handleConnectionError() {
        this.isConnected = false;
        this.updateConnectionStatus('Connection Error', false);
        this.disableChat();
        
        // Only attempt reconnect if user is logged in
        if (this.username && this.sessionId) {
            this.attemptReconnect();
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showToast('Maximum reconnection attempts reached', 'error');
            this.handleLogout()
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        this.showToast(`Reconnecting in ${delay / 1000} seconds... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warning');
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(text, isConnected) {
        const statusDot = this.connectionStatus.querySelector('.status-dot');
        const statusText = this.connectionStatus.querySelector('.status-text');
        
        statusText.textContent = text;
        
        if (isConnected) {
            statusDot.classList.add('connected');
        } else {
            statusDot.classList.remove('connected');
        }
    }

    /**
     * Disable chat functionality
     */
    disableChat() {
        this.messageInput.disabled = true;
        this.attachBtn.disabled = true;
        this.messageInput.placeholder = 'Reconnecting...';
        this.updateSendButtonState();
    }

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        const messagesList = document.getElementById('messagesContainer');
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    downloadFile(fileId, fileName) {
        if (this.activeDownloads.has(fileId) || this.uploadProgress.has(fileId)) {
            return; // Already downloading or uploading
        }

        console.log('Starting download for file:', fileName, 'ID:', fileId);
        
        // Add to active downloads
        this.activeDownloads.add(fileId);
        this.updateDownloadButtonStates();
        
        // Show notification panel
        this.showNotificationPanel();
        
        // Send get_max_chunkindex request
        const requestData = {
            action: 'get_max_chunkindex',
            username: this.username,
            sessionid: this.sessionId,
            fileId: fileId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };
        
        this.sendJSON(requestData);
    }

    handleMaxChunkIndexResponse(responseData) {
        const maxChunkData = responseData.phpOutput.get_max_chunkindex;
        
        if (maxChunkData.status === 'success' && maxChunkData.max_chunkindex.length > 0) {
            const fileInfo = maxChunkData.max_chunkindex[0];
            const fileId = parseInt(fileInfo.FileId);
            const fileName = fileInfo.FileName;
            const maxChunk = parseInt(fileInfo.maxchunk);
            const totalChunks = maxChunk + 1;
            const fileSize = fileInfo.FileSize;
            const fileBytes = fileInfo.fileBytes;
            
            console.log('Max chunk response:', fileInfo);
            
            if (maxChunkData.code === 2) {
                // Initialize download progress
                this.downloadProgress.set(fileId, {
                    fileId: fileId,
                    fileName: fileName,
                    roomName: this.currentChatName,
                    fileSize: fileSize,
                    totalChunks: totalChunks,
                    currentChunk: totalChunks,
                    percentage: 100
                });
                // File already saved
                console.log('File already saved:', fileName);
                this.showNotificationToast('File ready to download: ' + fileName, 'info');
                this.updateDownloadProgressDisplay();
                this.downloadProgress.delete(fileId);
                this.activeDownloads.delete(fileId);
                this.updateDownloadButtonStates();
                return;
            }
            
            // Initialize download progress
            this.downloadProgress.set(fileId, {
                fileId: fileId,
                fileName: fileName,
                roomName: this.currentChatName,
                fileSize: fileSize,
                fileBytes: fileBytes,
                totalChunks: totalChunks,
                ConcurrentChunk: this.maxConcurrentDownloads - 1,
                currentChunk: 0,
                percentage: 0
            });
            
            this.updateDownloadProgressDisplay();
            
            // Launch the first batch:
            for (let i = 0; i < this.maxConcurrentDownloads; i++) {
                // Start chunk assembly from chunk 0
                this.assembleNextChunk(fileId, fileName, i, totalChunks, fileBytes);
            }
            // Start chunk assembly from chunk 0
            // this.assembleNextChunk(fileId, fileName, i, totalChunks, fileBytes);
        }
    }

    assembleNextChunk(fileId, fileName, chunkIndex, totalChunks, fileBytes) {
        console.log(`Assembling chunk ${chunkIndex} of ${totalChunks} for file: ${fileName}`);
        
        const requestData = {
            action: 'chunk_assemble',
            username: this.username,
            sessionid: this.sessionId,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
            fileName: fileName,
            fileBytes: fileBytes,
            fileId: fileId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };

        // Launch the first batch:
        // for (let i = 0; i < this.maxConcurrentDownloads; i++) {
        //     requestData.chunkIndex = i;
        //     this.sendJSON(requestData);
        // }
        this.sendJSON(requestData);
    }

    requestNextChunk(fileId, fileName, chunkIndex, totalChunks, fileBytes) {
        console.log(`Assembling chunk ${chunkIndex} of ${totalChunks} for file: ${fileName}`);
        
        const requestData = {
            action: 'chunk_assemble',
            username: this.username,
            sessionid: this.sessionId,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
            fileName: fileName,
            fileBytes: fileBytes,
            fileId: fileId,
            batchId: this.generateBatchId(),
            requestId: this.generateBatchId()
        };

        this.sendJSON(requestData);
    }

    /**
     * Handle chunk assemble response
     */
    handleChunkAssembleResponse(responseData) {
        const assembleData = responseData.phpOutput.chunk_assemble ?? responseData.phpOutput.chunk_append;
        const fileId = parseInt(assembleData.fileId);
        
        if (this.downloadProgress.has(fileId) && assembleData.status === 'success') {
            const progress = this.downloadProgress.get(fileId);
            const chunkIndex = progress.currentChunk;
            const totalChunks = progress.totalChunks;
            const ConcurrentChunk = progress.ConcurrentChunk;
            const fileName = progress.fileName;
            const fileBytes = progress.fileBytes;
            
            // console.log('Chunk assemble response:', this.downloadProgress);
            console.log('chunkIndex:', chunkIndex, 'ConcurrentChunk:', ConcurrentChunk);
            
            if (chunkIndex == totalChunks) {
                // Final assembly complete
                console.log('Download completed for file:', fileName);
                this.showNotificationToast('Download complete: ' + fileName, 'downloaded successfully');
                // Clean up
                // this.downloadProgress.delete(fileId);
                // this.activeDownloads.delete(fileId);
                this.updateDownloadProgressDisplay();
                this.updateDownloadButtonStates();
            } 
            else 
            if (chunkIndex < (totalChunks - this.maxConcurrentDownloads)) {
                this.updateDownloadProgressDisplay();
                progress.currentChunk++;
                progress.ConcurrentChunk++;
                progress.percentage = Math.round((progress.currentChunk / totalChunks) * 100);
                // Continue with next chunk
                this.assembleNextChunk(fileId, fileName, progress.ConcurrentChunk, totalChunks, fileBytes);
            } 
            else 
            if (chunkIndex < totalChunks) {
                this.updateDownloadProgressDisplay();
                progress.currentChunk++;
                progress.ConcurrentChunk++;
                progress.percentage = Math.round((progress.currentChunk / totalChunks) * 100);
                // Continue with last chunk
                if (chunkIndex == (totalChunks - 1)) {
                    this.assembleNextChunk(fileId, fileName, chunkIndex + 1, totalChunks, fileBytes);
                }
            }
            else 
            {
                console.log('Something is wrong:', fileName);
            }
        } else {
            console.error('Chunk assemble failed:', assembleData);
            // const fileId = parseInt(assembleData.fileId);
            this.showToast('Download failed for file: ' + assembleData.fileName, 'error');
            
            // Clean up on error
            this.downloadProgress.delete(fileId);
            this.activeDownloads.delete(fileId);
            this.updateDownloadProgressDisplay();
            this.updateDownloadButtonStates();
        }
    }

    updateDownloadProgressDisplay() {
        if (!this.notificationPanel) return;
        
        const content = this.notificationPanel.querySelector('.notification-panel-content');
        if (!content) return;
        
        // Remove existing download progress items
        // const existingDownloads = panelContent.querySelectorAll('.download-progress-item');
        // existingDownloads.forEach(item => item.remove());
        
        // Add current download progress items
        this.downloadProgress.forEach((progress, fileId) => {
            // Check if progress item already exists
            let progressItem = content.querySelector(`[data-file-id="${fileId}"]`);

            if (!progressItem) {
                // Create new progress item
                progressItem = document.createElement('div');
                progressItem.className = 'download-progress-item';
                progressItem.dataset.fileId = fileId;
                content.appendChild(progressItem);
            }

            if (progress.currentChunk >= progress.totalChunks) {
                progressItem.innerHTML = `
                    <div class="upload-info">
                        <div class="upload-header">
                            <div class="upload-icon">📥</div>
                            <div class="upload-details">
                                <div class="upload-filename">${progress.fileName}</div>
                                <div class="upload-room">Room : ${progress.roomName}</div>
                            </div>
                            <div class="upload-percentage">${progress.percentage}%</div>
                        </div>
                        
                            <a href="#" class="download-link" onclick="window.chatApp.downloadFilePOST('${fileId}', '${this.username}', '${this.sessionId}'); return false;">Click here to download</a>
                        
                        <div class="upload-stats">
                            <span>Chunk ${progress.currentChunk}/${progress.totalChunks}</span>
                            <span>${progress.fileSize}</span>
                        </div>
                    </div>
                `;
            } else {
                progressItem.innerHTML = `
                    <div class="upload-info">
                        <div class="upload-header">
                            <div class="upload-icon">📥</div>
                            <div class="upload-details">
                                <div class="upload-filename">${progress.fileName}</div>
                                <div class="upload-room">Room : ${progress.roomName}</div>
                            </div>
                            <div class="upload-percentage">${progress.percentage}%</div>
                        </div>
                        <div class="upload-progress-bar">
                            <div class="upload-progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <div class="upload-stats">
                            <span>Chunk ${progress.currentChunk}/${progress.totalChunks}</span>
                            <span>${progress.fileSize}</span>
                        </div>
                    </div>
                `;
            }
            content.appendChild(progressItem);
        });
    }

    // updateDownloadButtonStates() {
    //     // Update all download buttons based on current state
    //     const downloadButtons = document.querySelectorAll('.message-file-download');
    //     downloadButtons.forEach(button => {
    //         const onclick = button.getAttribute('onclick');
    //         if (onclick) {
    //             const match = onclick.match(/downloadFile\((\d+),/);
    //             if (match) {
    //                 const fileId = parseInt(match[1]);
    //                 const isDisabled = this.downloadProgress.has(fileId) || this.uploadProgress.has(fileId);
    //                 button.disabled = isDisabled;
    //             }
    //         }
    //     });
    // }
    updateDownloadButtonStates() {
        const downloadButtons = document.querySelectorAll('.message-file-download');
        downloadButtons.forEach(button => {
            const fileId = parseInt(button.getAttribute('data-file-id'));
            const isDisabled = this.downloadProgress.has(fileId) || this.uploadProgress.has(fileId);
            button.disabled = isDisabled;
        });
    }

    downloadFilePOST(fileId, username, sessionid) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'http://localhost:5173/chatapi.php';
        form.target = '_blank'; // Opens in new tab (like <a target="_blank">)
      
        form.style.display = 'none';
      
        const jsonPayload = {
          action: 'file_download',
          fileId,
          username,
          sessionid
        };
      
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'json';
        input.value = JSON.stringify(jsonPayload);
        console.log('jsonPayload', jsonPayload);
        form.appendChild(input);
        console.log('form', form);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    stringToBase64(str) {
        return btoa(new TextEncoder().encode(str)
            .reduce((data, byte) => data + String.fromCharCode(byte), ''));
    }

    base64ToString(base64) {
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }
}

// Global function to open OAuth window
function openOAuthWindow(provider) {
    const width = 500;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    window.open(`oauth.html?provider=${provider}`, `OAuth ${provider}`, features);
}

// Initialize the chat application when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new WebSocketChat();
});
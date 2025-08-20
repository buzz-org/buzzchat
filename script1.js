// WebSocket Manager
class WebSocketManager {
    constructor(contactManager) {
        this.contactManager = contactManager;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000;
        this.init();
    }

    init() {
        console.log('WebSocketManager: Initializing');
        this.connect();
    }

    connect() {
        console.log('WebSocketManager: Attempting to connect to ws://localhost:3333');
        this.ws = new WebSocket('ws://localhost:3333');
        
        this.ws.onopen = () => {
            console.log('WebSocketManager: WebSocket connected successfully');
            this.reconnectAttempts = 0;
            // Initialize subscription only if user is logged in
            if (this.contactManager.currentUser) {
                console.log('WebSocketManager: Sending subscribe action for user:', this.contactManager.currentUser);
                // this.send({ action: 'subscribe', user: this.contactManager.currentUser });
            } else {
                console.warn('WebSocketManager: No user logged in, skipping subscribe');
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocketManager: Received message:', data);
                if (data.phpOutput) {
                    const response = typeof data.phpOutput === 'string' ? JSON.parse(data.phpOutput) : data.phpOutput;
                    console.log('WebSocketManager: Parsed PHP response:', response);
                    if (response.action === 'new_message') {
                        console.log('WebSocketManager: Handling new message for contact:', response.contact);
                        this.handleNewMessage(response);
                    } else {
                        console.log('WebSocketManager: Handling response for action:', data.originalData?.action);
                        this.handleResponse(response, data.originalData);
                    }
                } else {
                    console.warn('WebSocketManager: No phpOutput in message:', data);
                }
            } catch (error) {
                console.error('WebSocketManager: Error processing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocketManager: WebSocket disconnected');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                console.log(`WebSocketManager: Reconnecting attempt ${this.reconnectAttempts + 1}`);
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, this.reconnectInterval);
            } else {
                console.warn('WebSocketManager: Max reconnect attempts reached');
                this.contactManager.showToast('WebSocket connection failed after retries');
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocketManager: WebSocket error:', error);
            this.contactManager.showToast('WebSocket error occurred');
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const payload = { 
                ...data, 
                batchId: Date.now().toString(),
                user: this.contactManager.currentUser // Include user in every request
            };
            console.log('WebSocketManager: Sending payload:', payload);
            this.ws.send(JSON.stringify(payload));
        } else {
            console.warn('WebSocketManager: WebSocket not connected, cannot send:', data);
            this.contactManager.showToast('Connection lost, please try again');
        }
    }

    handleNewMessage(data) {
        const { contact, message } = data;
        console.log('WebSocketManager: New message received for contact:', contact, 'message:', message);
        if (this.contactManager.currentContact === contact) {
            console.log('WebSocketManager: Updating chat content for current contact:', contact);
            this.contactManager.loadMessages('', contact);
        } else {
            console.log('WebSocketManager: Not current contact, skipping message load');
        }
        console.log('WebSocketManager: Refreshing conversation list');
        this.contactManager.loadConversations();
    }

    handleResponse(response, originalData) {
        console.log('WebSocketManager: Handling response:', response, 'for original data:', originalData);
        if (response.success) {
            switch (originalData.action) {
                case 'login':
                    console.log('WebSocketManager: Login successful, setting user:', originalData.login);
                    this.contactManager.setCurrentUser(originalData.login);
                    const loginContainer = document.getElementById('loginContainer');
                    const chatContainer = document.getElementById('chatContainer');
                    if (loginContainer && chatContainer) {
                        console.log('WebSocketManager: Toggling UI - hiding login, showing chat');
                        loginContainer.style.display = 'none';
                        chatContainer.style.display = 'block';
                        this.contactManager.loadConversations();
                    } else {
                        console.error('WebSocketManager: UI elements missing - loginContainer:', !!loginContainer, 'chatContainer:', !!chatContainer);
                        this.contactManager.showToast('UI error: Cannot find login or chat containers');
                    }
                    // Send subscribe action after successful login
                    console.log('WebSocketManager: Sending subscribe action after login');
                    // this.send({ action: 'subscribe', user: this.contactManager.currentUser });
                    break;
                case 'send_message':
                case 'get_conversations':
                case 'get_messages':
                case 'create_group':
                case 'logout':
                    console.log('WebSocketManager: Forwarding response for action:', originalData.action);
                    this.contactManager.handleResponse(response, originalData);
                    break;
                default:
                    console.warn('WebSocketManager: Unhandled action in response:', originalData.action);
            }
        } else {
            console.warn('WebSocketManager: Response failed:', response.message);
            this.contactManager.showToast(response.message);
        }
    }
}

// Theme Management
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.themeToggle = document.getElementById('themeToggle');
        this.sunIcon = this.themeToggle?.querySelector('.sun-icon');
        this.moonIcon = this.themeToggle?.querySelector('.moon-icon');
        
        this.init();
    }
    
    init() {
        console.log('ThemeManager: Initializing');
        if (this.themeToggle) {
            this.applyTheme(this.currentTheme);
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        } else {
            console.warn('ThemeManager: Theme toggle element not found');
        }
    }
    
    applyTheme(theme) {
        console.log('ThemeManager: Applying theme:', theme);
        document.documentElement.setAttribute('data-theme', theme);
        
        if (this.sunIcon && this.moonIcon) {
            if (theme === 'light') {
                this.sunIcon.style.display = 'none';
                this.moonIcon.style.display = 'block';
            } else {
                this.sunIcon.style.display = 'block';
                this.moonIcon.style.display = 'none';
            }
        } else {
            console.warn('ThemeManager: Sun or moon icon not found - sunIcon:', !!this.sunIcon, 'moonIcon:', !!this.moonIcon);
        }
        
        this.currentTheme = theme;
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        console.log('ThemeManager: Toggling to theme:', newTheme);
        this.applyTheme(newTheme);
    }
}

// Contact Management
class ContactManager {
    constructor() {
        this.contacts = {};
        this.currentContact = '';
        this.currentUser = sessionStorage.getItem('user') || '';
        console.log('ContactManager: Initializing with currentUser:', this.currentUser);
        this.websocketManager = new WebSocketManager(this);
        this.init();
    }
    
    init() {
        console.log('ContactManager: Running init');
        const loginContainer = document.getElementById('loginContainer');
        const chatContainer = document.getElementById('chatContainer');
        if (!loginContainer || !chatContainer) {
            console.error('ContactManager: UI elements missing - loginContainer:', !!loginContainer, 'chatContainer:', !!chatContainer);
            this.showToast('UI error: Cannot find login or chat containers');
            return;
        }
        if (this.currentUser) {
            console.log('ContactManager: User found in sessionStorage, showing chat interface');
            loginContainer.style.display = 'none';
            chatContainer.style.display = 'block';
            this.loadConversations();
        } else {
            console.log('ContactManager: No user in sessionStorage, showing login form');
            loginContainer.style.display = 'block';
            chatContainer.style.display = 'none';
        }
    }
    
    async loadConversations() {
        try {
            console.log('ContactManager: Sending WebSocket request for conversations');
            this.websocketManager.send({ action: 'get_conversations' });
        } catch (error) {
            console.error('ContactManager: Error loading conversations:', error);
            this.showToast('Error loading conversations');
        }
    }
    
    handleResponse(response, originalData) {
        console.log('ContactManager: Handling response for action:', originalData.action, 'response:', response);
        switch (originalData.action) {
            case 'get_conversations':
                if (response.success) {
                    console.log('ContactManager: Conversations loaded successfully:', response.contacts);
                    this.contacts = response.contacts;
                    this.renderConversations(response.contacts);
                } else {
                    console.error('ContactManager: Failed to load conversations:', response.message);
                    this.showToast(response.message);
                }
                break;
            case 'get_messages':
                if (response.success) {
                    console.log('ContactManager: Messages loaded successfully:', response.messages);
                    this.renderMessages(response.messages);
                } else {
                    console.error('ContactManager: Failed to load messages:', response.message);
                    this.showToast(response.message);
                }
                break;
            case 'send_message':
                if (response.success) {
                    console.log('ContactManager: Message sent successfully');
                    this.loadConversations(); // Refresh conversation order
                } else {
                    console.error('ContactManager: Failed to send message:', response.message);
                    this.showToast(response.message);
                }
                break;
            case 'create_group':
                if (response.success) {
                    console.log('ContactManager: Group created successfully');
                    this.loadConversations();
                } else {
                    console.error('ContactManager: Failed to create group:', response.message);
                    this.showToast(response.message);
                }
                break;
            case 'logout':
                if (response.success) {
                    console.log('ContactManager: Logout successful');
                    sessionStorage.removeItem('user');
                    this.currentUser = '';
                    const loginContainer = document.getElementById('loginContainer');
                    const chatContainer = document.getElementById('chatContainer');
                    if (loginContainer && chatContainer) {
                        console.log('ContactManager: Toggling UI - showing login, hiding chat');
                        loginContainer.style.display = 'block';
                        chatContainer.style.display = 'none';
                    } else {
                        console.error('ContactManager: UI elements missing on logout - loginContainer:', !!loginContainer, 'chatContainer:', !!chatContainer);
                        this.showToast('UI error: Cannot find login or chat containers');
                    }
                } else {
                    console.error('ContactManager: Logout failed:', response.message);
                    this.showToast(response.message);
                }
                break;
            default:
                console.warn('ContactManager: Unhandled action:', originalData.action);
        }
    }
    
    renderConversations(contacts) {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) {
            console.error('ContactManager: Conversations list element not found');
            this.showToast('UI error: Conversations list not found');
            return;
        }
        
        console.log('ContactManager: Rendering conversations, count:', contacts.length);
        conversationsList.innerHTML = '';
        
        contacts.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.setAttribute('data-contact', contact.login);
            item.setAttribute('data-name', contact.user);
            item.innerHTML = `
                <div class="avatar current-avatar ${contact.avatarClass}">
                    <span>${contact.avatar}</span>
                </div>
                <div class="conversation-info">
                    <div class="name">${contact.name}</div>
                    <div class="last-message">${contact.lastMessage}</div>
                </div>
                ${contact.unreadCount > 0 ? `<div class="badge">${contact.unreadCount}</div>` : ''}
            `;
            conversationsList.appendChild(item);
        });
        
        this.bindConversationEvents();
    }
    
    bindConversationEvents() {
        const conversationItems = document.querySelectorAll('.conversation-item');
        console.log('ContactManager: Binding click events to', conversationItems.length, 'conversation items');
        conversationItems.forEach(item => {
            item.removeEventListener('click', this.handleConversationClick);
            item.addEventListener('click', this.handleConversationClick.bind(this));
        });
    }
    
    handleConversationClick(event) {
        const contactuser = event.currentTarget.getAttribute('data-name');
        const item = event.currentTarget;
        const contactlogin = item.querySelector('.name').textContent.trim();
        const contactName = event.currentTarget.getAttribute('data-contact');
        console.log('ContactManager: Conversation item clicked, contact:', contactName);
        this.selectContact(contactuser, contactlogin, contactName);
    }
    
    selectContact(contactuser, contactlogin, contactName) {
        console.log('ContactManager: Selecting contact:', contactName);
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-contact="${contactName}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
            console.log('ContactManager: Active class added to contact:', contactName);
        } else {
            console.warn('ContactManager: Selected conversation item not found for:', contactName);
        }
        
        this.currentContact = contactName;
        this.updateMainChat(contactuser, contactlogin, contactName);
    }
    
    async updateMainChat(contactuser, contactlogin, contactName) {
        console.log('ContactManager: Updating main chat for contact:', this.contacts);
        const contact = this.contacts.find(c => c.login ==  contactName);
        if (!contact) {
            console.warn('ContactManager: Contact not found:', contactName);
            this.showToast('Contact not found');
            // return;
        }
        
        const contactNameEl = document.querySelector('.contact-details .contact-name');
        const contactStatusEl = document.querySelector('.contact-details .contact-status');
        const chatBox = document.getElementById('chatBox');
        const spanInside = chatBox?.querySelector('span');
        const contactPlaceholder = document.querySelector('.contact-name-placeholder');
        const messageInputPlaceholder = document.querySelector('.message-input');
        
        if (contactNameEl) contactNameEl.textContent = contactlogin;
        if (contactStatusEl) {
            contactStatusEl.textContent = contact.status;
            if (contact.status === 'Online') {
                contactStatusEl.style.color = 'var(--online-status)';
            } else if (contact.status === 'Away') {
                contactStatusEl.style.color = '#f39c12';
            } else {
                contactStatusEl.style.color = 'var(--text-muted)';
            }
        }
        if (chatBox && spanInside) {    
            spanInside.textContent = contact.avatar;
            chatBox.className = `avatar current-avatar ${contact.avatarClass}`;
        }
        if (contactPlaceholder) contactPlaceholder.textContent = contactName;
        if (messageInputPlaceholder) messageInputPlaceholder.placeholder = `Message ${contactName}...`;
        
        if (!contactNameEl || !contactStatusEl || !chatBox || !spanInside || !contactPlaceholder || !messageInputPlaceholder) {
            console.warn('ContactManager: Some chat interface elements missing - contactNameEl:', !!contactNameEl, 'contactStatusEl:', !!contactStatusEl, 'chatBox:', !!chatBox, 'spanInside:', !!spanInside, 'contactPlaceholder:', !!contactPlaceholder, 'messageInputPlaceholder:', !!messageInputPlaceholder);
        } else {
            console.log('ContactManager: All chat interface elements found, updating UI');
        }

        await this.loadMessages(contactuser, contactName);
    }
    
    async loadMessages(contactuser, contactName) {
        console.log('ContactManager: Initiating WebSocket request for messages, contact:', contactName);
        this.websocketManager.send({ action: 'get_messages', contact: contactName, receiver: contactuser });
    }
    
    renderMessages(messages) {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) {
            console.error('ContactManager: Chat content element not found');
            this.showToast('UI error: Chat content not found');
            return;
        }
        
        console.log('ContactManager: Rendering messages, count:', messages.length);
        chatContent.innerHTML = '';
        
        if (messages.length == 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div class="empty-text">No messages yet</div>
                <div class="empty-subtext">Start a conversation with <span class="contact-name-placeholder">${this.currentContact}</span></div>
            `;
            chatContent.appendChild(emptyState);
            console.log('ContactManager: Rendered empty state for contact:', this.currentContact);
            return;
        }
        
        messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.User === this.currentUser ? 'sent' : 'received'}`;
            messageEl.innerHTML = `
                <div>${message.MsgTxt}</div>
                <div class="message-timestamp">${new Date(message.Sent_At).toLocaleTimeString()}</div>
            `;
            chatContent.appendChild(messageEl);
        });

        chatContent.scrollTop = chatContent.scrollHeight;
        console.log('ContactManager: Messages rendered and chat scrolled to bottom');
    }
    
    setCurrentUser(user) {
        console.log('ContactManager: Setting current user:', user);
        this.currentUser = user;
        sessionStorage.setItem('user', user);
        console.log('ContactManager: User saved to sessionStorage:', sessionStorage.getItem('user'));
    }
    
    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            console.log('ContactManager: Showing toast:', message);
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        } else {
            console.warn('ContactManager: Toast element not found, message:', message);
        }
    }
}

// Group Management
class GroupManager {
    constructor(contactManager) {
        this.contactManager = contactManager;
        this.groupModal = document.getElementById('groupModal');
        this.groupNameInput = document.getElementById('groupName');
        this.userList = document.getElementById('userList');
        this.createGroupBtn = document.querySelector('.create-group-btn');
        this.createGroupSubmit = document.querySelector('.create-group-submit');
        this.cancelBtn = document.querySelector('.cancel-btn');
        this.init();
    }

    init() {
        console.log('GroupManager: Initializing');
        if (this.createGroupBtn) {
            this.createGroupBtn.addEventListener('click', () => this.openModal());
        } else {
            console.warn('GroupManager: Create group button not found');
        }
        if (this.createGroupSubmit) {
            this.createGroupSubmit.addEventListener('click', () => this.createGroup());
        } else {
            console.warn('GroupManager: Create group submit button not found');
        }
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.closeModal());
        } else {
            console.warn('GroupManager: Cancel button not found');
        }
    }

    async openModal() {
        console.log('GroupManager: Opening group modal');
        try {
            this.contactManager.websocketManager.send({ action: 'get_users' });
        } catch (error) {
            console.error('GroupManager: Error fetching users:', error);
            this.contactManager.showToast('Error fetching users');
        }
    }

    renderUserList(users) {
        console.log('GroupManager: Rendering user list, count:', users.length);
        this.userList.innerHTML = '';
        users.forEach(user => {
            if (user.login !== this.contactManager.currentUser) {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <input type="checkbox" value="${user.login}">
                    <span>${user.name}</span>
                `;
                this.userList.appendChild(userItem);
            }
        });
    }

    async createGroup() {
        const groupName = this.groupNameInput.value.trim();
        const selectedUsers = Array.from(this.userList.querySelectorAll('input:checked')).map(input => input.value);
        selectedUsers.push(this.contactManager.currentUser);

        console.log('GroupManager: Creating group, name:', groupName, 'users:', selectedUsers);
        if (!groupName) {
            this.contactManager.showToast('Group name is required');
            return;
        }
        if (selectedUsers.length < 2) {
            this.contactManager.showToast('Select at least one user');
            return;
        }

        try {
            this.contactManager.websocketManager.send({
                action: 'create_group',
                groupName: groupName,
                users: selectedUsers
            });
            this.closeModal();
        } catch (error) {
            console.error('GroupManager: Error creating group:', error);
            this.contactManager.showToast('Error creating group');
        }
    }

    closeModal() {
        console.log('GroupManager: Closing group modal');
        this.groupModal.style.display = 'none';
        this.groupNameInput.value = '';
        this.userList.innerHTML = '';
    }
}

// Search Functionality
class SearchManager {
    constructor() {
        this.searchInput = document.querySelector('.search-box input');
        this.clearSearch = document.querySelector('.clear-search');
        this.conversationItems = document.querySelectorAll('.conversation-item');
        this.init();
    }
    
    init() {
        console.log('SearchManager: Initializing');
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterConversations(e.target.value);
            });
            this.clearSearch.addEventListener('click', () => {
                this.searchInput.value = '';
                this.filterConversations('');
                this.clearSearch.style.display = 'none';
            });
        } else {
            console.warn('SearchManager: Search input or clear button not found');
        }
    }
    
    filterConversations(query) {
        this.conversationItems = document.querySelectorAll('.conversation-item');
        const lowercaseQuery = query.toLowerCase();
        
        console.log('SearchManager: Filtering conversations, query:', query);
        this.conversationItems.forEach(item => {
            const contactName = item.querySelector('.name').textContent.toLowerCase();
            const lastMessage = item.querySelector('.last-message').textContent.toLowerCase();
            
            if (contactName.includes(lowercaseQuery) || lastMessage.includes(lowercaseQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

// Message Input Manager
class MessageInputManager {
    constructor(contactManager) {
        this.contactManager = contactManager;
        this.messageInput = document.querySelector('.message-input');
        this.sendButton = document.querySelector('.send-btn');
        this.emojiButton = document.querySelector('.emoji-btn');
        this.init();
    }
    
    init() {
        console.log('MessageInputManager: Initializing');
        if (this.messageInput && this.sendButton && this.emojiButton) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            this.sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
            
            this.emojiButton.addEventListener('click', () => {
                this.toggleEmojiPicker();
            });
            
            this.messageInput.addEventListener('input', () => {
                this.adjustInputHeight();
            });
        } else {
            console.warn('MessageInputManager: Elements not found - messageInput:', !!this.messageInput, 'sendButton:', !!this.sendButton, 'emojiButton:', !!this.emojiButton);
        }
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (message && this.contactManager.currentContact) {
            console.log('MessageInputManager: Sending message to:', this.contactManager.currentContact, 'content:', message);
            try {
                this.contactManager.websocketManager.send({
                    action: 'send_message',
                    receiver: this.contactManager.currentContact,
                    message: message
                });
                this.messageInput.value = '';
                this.adjustInputHeight();
            } catch (error) {
                console.error('MessageInputManager: Error sending message:', error);
                this.contactManager.showToast('Error sending message');
            }
        } else {
            console.warn('MessageInputManager: Cannot send message - no content or no contact selected');
        }
    }
    
    toggleEmojiPicker() {
        console.log('MessageInputManager: Emoji picker would open here');
    }
    
    adjustInputHeight() {
        const input = this.messageInput;
        if (input) {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        } else {
            console.warn('MessageInputManager: Message input not found for height adjustment');
        }
    }
}

// Animation Manager
class AnimationManager {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('AnimationManager: Initializing');
        this.addHoverEffects();
        this.addClickEffects();
    }
    
    addHoverEffects() {
        const buttons = document.querySelectorAll('button');
        console.log('AnimationManager: Adding hover effects to', buttons.length, 'buttons');
        buttons.forEach(button => {
            button.removeEventListener('mouseenter', this.handleMouseEnter);
            button.removeEventListener('mouseleave', this.handleMouseLeave);
            button.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
            button.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        });
    }
    
    handleMouseEnter(event) {
        event.currentTarget.style.transform = 'scale(1.05)';
    }
    
    handleMouseLeave(event) {
        event.currentTarget.style.transform = 'scale(1)';
    }
    
    addClickEffects() {
        const conversationItems = document.querySelectorAll('.conversation-item');
        console.log('AnimationManager: Adding click effects to', conversationItems.length, 'conversation items');
        conversationItems.forEach(item => {
            item.removeEventListener('click', this.handleClickEffect);
            item.addEventListener('click', this.handleClickEffect.bind(this));
        });
    }
    
    handleClickEffect(event) {
        const item = event.currentTarget;
        item.style.transform = 'scale(0.98)';
        setTimeout(() => {
            item.style.transform = 'scale(1)';
        }, 100);
    }
}

// Login Manager
class LoginManager {
    constructor(contactManager) {
        this.contactManager = contactManager;
        this.loginForm = document.getElementById('loginForm');
        this.passwordInput = document.getElementById('password');
        this.eyeIcon = document.getElementById('eyeIcon');
        this.init();
    }
    
    init() {
        console.log('LoginManager: Initializing');
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        } else {
            console.error('LoginManager: Login form not found');
        }
        if (this.eyeIcon) {
            this.eyeIcon.addEventListener('click', () => this.togglePasswordVisibility());
        } else {
            console.warn('LoginManager: Eye icon not found');
        }
    }
    
    async handleLogin() {
        const login = document.getElementById('login').value;
        const password = this.passwordInput.value;
        
        console.log('LoginManager: Attempting login for user:', login);
        if (!login || !password) {
            console.warn('LoginManager: Missing login or password');
            this.contactManager.showToast('Please enter username and password');
            return;
        }

        try {
            this.contactManager.websocketManager.send({
                action: 'login',
                login: login,
                password: password
            });
        } catch (error) {
            console.error('LoginManager: Error during login:', error);
            this.contactManager.showToast('Error during login');
        }
    }
    
    togglePasswordVisibility() {
        console.log('LoginManager: Toggling password visibility');
        if (this.passwordInput.type === 'password') {
            this.passwordInput.type = 'text';
            this.eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M3 3l18 18"></path>
            `;
        } else {
            this.passwordInput.type = 'password';
            this.eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application: DOM fully loaded, initializing');
    const themeManager = new ThemeManager();
    const contactManager = new ContactManager();
    const searchManager = new SearchManager();
    const messageInputManager = new MessageInputManager(contactManager);
    const animationManager = new AnimationManager();
    const loginManager = new LoginManager(contactManager);
    const groupManager = new GroupManager(contactManager);
    
    const menuBtn = document.querySelector('.menu-btn');
    const menuDropdown = document.querySelector('.menu-dropdown');
    const logoutBtn = document.querySelector('.logout-btn');
    
    if (menuBtn && menuDropdown) {
        console.log('Application: Binding menu button events');
        menuBtn.addEventListener('click', () => {
            console.log('Application: Menu button clicked, toggling dropdown');
            menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
                console.log('Application: Clicked outside menu, hiding dropdown');
                menuDropdown.style.display = 'none';
            }
        });
    } else {
        console.warn('Application: Menu button or dropdown not found - menuBtn:', !!menuBtn, 'menuDropdown:', !!menuDropdown);
    }
    
    if (logoutBtn) {
        console.log('Application: Binding logout button event');
        logoutBtn.addEventListener('click', () => {
            console.log('Application: Logout button clicked');
            contactManager.websocketManager.send({ action: 'logout' });
        });
    } else {
        console.warn('Application: Logout button not found');
    }
});
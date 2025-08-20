// Theme Management
class ThemeManager {
    constructor() {
        this.currentTheme = 'dark'; // Start with dark theme
        this.themeToggle = document.getElementById('themeToggle');
        this.sunIcon = this.themeToggle.querySelector('.sun-icon');
        this.moonIcon = this.themeToggle.querySelector('.moon-icon');
        
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    applyTheme(theme) {
        // Apply theme to document root instead of body
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'light') {
            this.sunIcon.style.display = 'none';
            this.moonIcon.style.display = 'block';
        } else {
            this.sunIcon.style.display = 'block';
            this.moonIcon.style.display = 'none';
        }
        
        this.currentTheme = theme;
        console.log(`Theme switched to: ${theme}`);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }
}

// Contact Management
class ContactManager {
    constructor() {
        this.contacts = {
            'Sarah Johnson': {
                avatar: 'S',
                status: 'Online',
                avatarClass: 'avatar-sarah',
                lastMessage: 'Hey, how are you?',
                unreadCount: 2
            },
            'Team Alpha': {
                avatar: 'T',
                status: 'Offline',
                avatarClass: 'avatar-team',
                lastMessage: 'Meeting at 3 PM',
                unreadCount: 0
            },
            'Mike Chen': {
                avatar: 'M',
                status: 'Online',
                avatarClass: 'avatar-mike',
                lastMessage: 'Thanks for the help!',
                unreadCount: 1
            },
            'Design Team': {
                avatar: 'D',
                status: 'Away',
                avatarClass: 'avatar-design',
                lastMessage: 'New mockups ready',
                unreadCount: 3
            }
        };
        
        this.currentContact = 'Sarah Johnson';
        this.init();
    }
    
    init() {
        this.bindConversationEvents();
        this.updateMainChat(this.currentContact);
    }
    
    bindConversationEvents() {
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.addEventListener('click', () => {
                const contactName = item.getAttribute('data-contact');
                this.selectContact(contactName);
            });
        });
    }
    
    selectContact(contactName) {
        // Remove active class from all items
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected item
        const selectedItem = document.querySelector(`[data-contact="${contactName}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        this.currentContact = contactName;
        this.updateMainChat(contactName);
    }
    
    updateMainChat(contactName) {
        const contact = this.contacts[contactName];
        if (!contact) return;
        
        // Update header
        const contactNameEl = document.querySelector('.contact-details .contact-name');
        const contactStatusEl = document.querySelector('.contact-details .contact-status');
        const currentAvatarEl = document.querySelector('.current-avatar');
        const avatarSpan = currentAvatarEl.querySelector('span');
        
        contactNameEl.textContent = contactName;
        contactStatusEl.textContent = contact.status;
        avatarSpan.textContent = contact.avatar;
        
        // Update avatar class
        currentAvatarEl.className = `avatar current-avatar ${contact.avatarClass}`;
        
        // Update empty state
        const contactPlaceholder = document.querySelector('.contact-name-placeholder');
        const messageInputPlaceholder = document.querySelector('.message-input');
        
        contactPlaceholder.textContent = contactName;
        messageInputPlaceholder.placeholder = `Message ${contactName}...`;
        
        // Update status color
        if (contact.status === 'Online') {
            contactStatusEl.style.color = 'var(--online-status)';
        } else if (contact.status === 'Away') {
            contactStatusEl.style.color = '#f39c12';
        } else {
            contactStatusEl.style.color = 'var(--text-muted)';
        }
    }
}

// Search Functionality
class SearchManager {
    constructor() {
        this.searchInput = document.querySelector('.search-box input');
        this.conversationItems = document.querySelectorAll('.conversation-item');
        this.init();
    }
    
    init() {
        this.searchInput.addEventListener('input', (e) => {
            this.filterConversations(e.target.value);
        });
    }
    
    filterConversations(query) {
        const lowercaseQuery = query.toLowerCase();
        
        this.conversationItems.forEach(item => {
            const contactName = item.getAttribute('data-contact').toLowerCase();
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
    constructor() {
        this.messageInput = document.querySelector('.message-input');
        this.sendButton = document.querySelector('.send-btn');
        this.emojiButton = document.querySelector('.emoji-btn');
        this.init();
    }
    
    init() {
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
        
        // Auto-resize input
        this.messageInput.addEventListener('input', () => {
            this.adjustInputHeight();
        });
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (message) {
            console.log(`Sending message: "${message}"`);
            this.messageInput.value = '';
            this.adjustInputHeight();
            
            // Here you would typically send the message to a backend
            // For demo purposes, we'll just log it
        }
    }
    
    toggleEmojiPicker() {
        // Placeholder for emoji picker functionality
        console.log('Emoji picker would open here');
    }
    
    adjustInputHeight() {
        const input = this.messageInput;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
}

// Animation Manager
class AnimationManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.addHoverEffects();
        this.addClickEffects();
    }
    
    addHoverEffects() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.05)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });
        });
    }
    
    addClickEffects() {
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.addEventListener('click', () => {
                item.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    item.style.transform = 'scale(1)';
                }, 100);
            });
        });
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    const themeManager = new ThemeManager();
    const contactManager = new ContactManager();
    const searchManager = new SearchManager();
    const messageInputManager = new MessageInputManager();
    const animationManager = new AnimationManager();
    
    // Add some visual feedback for settings button
    const settingsBtn = document.querySelector('.settings-btn');
    settingsBtn.addEventListener('click', () => {
        console.log('Settings clicked');
        // Add a subtle rotation animation
        settingsBtn.style.transform = 'rotate(90deg)';
        setTimeout(() => {
            settingsBtn.style.transform = 'rotate(0deg)';
        }, 200);
    });
    
    // Add typing indicator functionality
    console.log('Application initialized successfully');
});
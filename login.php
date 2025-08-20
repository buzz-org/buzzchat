<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMS Chat</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body data-theme="light">
    <div class="login-container" id="loginContainer">
        <form class="login-form" id="loginForm">
            <h2 style="color: var(--text-primary); margin-bottom: 16px;">Login</h2>
            <input type="text" id="login" placeholder="Username" required>
            <div class="password-container">
                <input type="password" id="password" placeholder="Password" required>
                <svg class="eye-icon" id="eyeIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
    <div class="container" id="chatContainer" style="display: none;">
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>Messages</h1>
                <div class="header-icons">
                    <button class="theme-toggle" id="themeToggle">
                        <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                        <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    </button>
                    <div class="menu-container">
                        <button class="menu-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                        </button>
                        <div class="menu-dropdown" style="display: none; position: absolute; right: 10px; top: 50px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; box-shadow: var(--shadow);">
                            <button class="create-group-btn" style="padding: 10px 20px; background: none; border: none; color: var(--text-primary); cursor: pointer; width: 100%; text-align: left;">Create Group</button>
                            <button class="logout-btn" style="padding: 10px 20px; background: none; border: none; color: var(--text-primary); cursor: pointer; width: 100%; text-align: left;">Logout</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="search-container">
                <div class="search-box">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" placeholder="Search conversations...">
                    <svg class="clear-search" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            </div>
            <div class="conversations-list" id="conversationsList">
                <!-- Conversations will be populated dynamically -->
            </div>
        </div>
        <div class="main-chat">
            <div class="chat-header">
                <div class="contact-info">
                    <div id="chatBox" class="avatar">
                        <span></span>
                    </div>
                    <div class="contact-details">
                        <div class="contact-name"></div>
                        <div class="contact-status"></div>
                    </div>
                </div>
            </div>
            <div class="chat-content" id="chatContent" style="display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
                <!-- Messages will be populated dynamically -->
            </div>
            <div class="message-input-container">
                <div class="message-input-wrapper">
                    <button class="emoji-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14a4 4 0 0 0 8 0"></path>
                            <circle cx="9" cy="9" r="1"></circle>
                            <circle cx="15" cy="9" r="1"></circle>
                        </svg>
                    </button>
                    <textarea class="message-input" placeholder="Message..."></textarea>
                    <button class="send-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        <div class="toast" id="toast"></div>
        <div class="modal" id="groupModal">
            <div class="modal-content">
                <h2>Create Group</h2>
                <input type="text" id="groupName" placeholder="Group Name" required>
                <div class="user-list" id="userList">
                    <!-- Users will be populated dynamically -->
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button class="cancel-btn">Cancel</button>
                    <button class="create-group-submit">Create Group</button>
                </div>
            </div>
        </div>
    </div>
    <script src="script1.js"></script>
</body>
</html>
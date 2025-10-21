const urlParams = new URLSearchParams(window.location.search);
const provider = parseInt(urlParams.get('provider')) || 0;

function initializePage() {
    if (provider === 1) {
        showManualSignupForm();
    } else if (provider === 2) {
        initializeGoogleSignIn();
    } else if (provider === 3) {
        initializeMicrosoftSignIn();
    }
}

async function initializeMicrosoftSignIn() {
    const url = new URL(window.location.href);
    // const accessToken = hash.get("access_token");
    const authCode = url.searchParams.get("code");

    if (authCode) {
        console.log("Authorization Code:", authCode);
        // Normally you'd send this to your backend for token exchange
        // showError("Received authorization code. Exchange on server side.", "success");
        return;
    }

    const oauth2Endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

    // Construct the full redirect URL
    const params = new URLSearchParams({
        client_id: "your_clientid",
        response_type: "code",
        redirect_uri: "http://localhost:5173/oauth.html",
        response_mode: "query",
        scope: "openid profile email User.Read",
        // state: "12345"
    });
    
    // Redirect the browser to Google OAuth login
    window.location.href = `${oauth2Endpoint}?${params.toString()}`;
    // console.log(`${oauth2Endpoint}?${params.toString()}`);    
}

async function initializeGoogleSignIn() {
    const url = new URL(window.location.href);
    // const accessToken = hash.get("access_token");
    const authCode = url.searchParams.get("code");

    if (authCode) {
        console.log("Authorization Code:", authCode);
        // Normally you'd send this to your backend for token exchange
        // showError("Received authorization code. Exchange on server side.", "success");
        return;
    }

    const oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

    // Construct the full redirect URL
    const params = new URLSearchParams({
        client_id: "your_clientid",
        redirect_uri: "http://localhost:5173/oauth.html",
        response_type: "code",
        scope: "email profile openid",
        include_granted_scopes: "true",
        state: "pass-through-value"
    });

    // Redirect the browser to Google OAuth login
    window.location.href = `${oauth2Endpoint}?${params.toString()}`;
    // console.log(`${oauth2Endpoint}?${params.toString()}`);
}

function showSignupFormWithOAuthData() {
    document.getElementById('oauthButtonContainer').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('oauthInfo').classList.remove('hidden');

    document.getElementById('displayEmail').textContent = userData.email;
    document.getElementById('displayName').textContent = userData.name;
    document.getElementById('usernameInput').value = userData.username;

    if (userData.profilePicture) {
        const preview = document.getElementById('profilePicturePreview');
        preview.innerHTML = `<img src="${userData.profilePicture}" alt="Profile">`;
    }

    document.getElementById('emailGroup').classList.add('hidden');
    document.getElementById('nameGroup').classList.add('hidden');
}

function showManualSignupForm() {
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('emailGroup').classList.remove('hidden');
    document.getElementById('nameGroup').classList.remove('hidden');
}

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('profilePictureInput').click();
});

document.getElementById('profilePictureInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            userData.profilePicture = event.target.result;
            const preview = document.getElementById('profilePicturePreview');
            preview.innerHTML = `<img src="${event.target.result}" alt="Profile">`;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('emailInput').addEventListener('input', (e) => {
    const email = e.target.value;
    if (email.includes('@')) {
        const username = email.split('@')[0];
        document.getElementById('usernameInput').value = username;
        userData.username = username;
    }
});

document.getElementById('sendOtpBtn').addEventListener('click', () => {
    const email = document.getElementById('emailInput').value;
    if (!email || !email.includes('@')) {
        showError('Please enter a valid email address');
        return;
    }

    userData.email = email;

    console.log('Sending OTP to:', email);

    document.getElementById('otpGroup').classList.remove('hidden');
    document.getElementById('sendOtpBtn').textContent = 'Resend OTP';
    showError('OTP sent to your email (demo mode)', 'success');
});

document.getElementById('passwordToggleBtn').addEventListener('click', function() {
    togglePasswordVisibility('passwordInput', this);
});

document.getElementById('confirmPasswordToggleBtn').addEventListener('click', function() {
    togglePasswordVisibility('confirmPasswordInput', this);
});

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const eyeIcon = button.querySelector('.eye-icon');
    const eyeOffIcon = button.querySelector('.eye-off-icon');

    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.style.display = 'none';
        eyeOffIcon.style.display = 'block';
    } else {
        input.type = 'password';
        eyeIcon.style.display = 'block';
        eyeOffIcon.style.display = 'none';
    }
}

document.getElementById('registrationForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const password = document.getElementById('passwordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }

    if (provider === 1) {
        const name = document.getElementById('nameInput').value;
        if (!name) {
            showError('Please enter your full name');
            return;
        }
        userData.name = name;

        if (!document.getElementById('otpGroup').classList.contains('hidden')) {
            const otp = document.getElementById('otpInput').value;
            if (!otp || otp.length !== 6) {
                showError('Please enter a valid 6-digit OTP');
                return;
            }
        }
    }

    userData.password = password;

    console.log('Registration data:', userData);

    showError('Registration successful! Redirecting...', 'success');

    setTimeout(() => {
        window.close();
    }, 2000);
});

document.getElementById('closeBtn').addEventListener('click', () => {
    // window.close();
});

document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

function showError(message, type = 'error') {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.color = type === 'success' ? 'var(--success-color)' : 'var(--error-color)';
}

initializePage();

// Import all secure modules
import { supabaseClient } from './config.js'; // Assuming config.js is in pmfby/js/
import { SecurityUtils } from './security.js'; // Assuming security.js is in pmfby/js/
import { authManager } from './auth.js';     // Assuming auth.js is in pmfby/js/
import { errorHandler } from './error-handler.js'; // Assuming error-handler.js is in pmfby/js/
import { secureDB } from './database.js'; // Needed for loadDistricts

// CAPTCHA functionality
let currentCaptcha = '';
let tempLoginData = {};

function generateCaptcha() {
    let captcha = '';
    for (let i = 0; i < 6; i++) {
        captcha += Math.floor(Math.random() * 10).toString();
    }
    return captcha;
}

function drawCaptcha() {
    currentCaptcha = generateCaptcha();
    const captchaDisplay = document.getElementById('captchaDisplay');
    if(captchaDisplay) captchaDisplay.textContent = currentCaptcha;
}

// Hash password with SHA-256 (using Web Crypto API)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Load districts from Supabase using secureDB
async function loadDistricts() {
    try {
        const districtSelect = document.getElementById('district');
        if (!districtSelect) return;
        
        // Use secureDB to fetch districts, configured with isPublic: true
        const districts = await secureDB.getDistricts(); 
        
        // Clear existing options except the first one
        while (districtSelect.options.length > 1) {
            districtSelect.remove(1);
        }
        
        if (districts) {
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district.id;
                option.textContent = district.name;
                districtSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        errorHandler.showError('जिला लोड करने में त्रुटि'); // Use error handler
        const districtSelect = document.getElementById('district');
        if (districtSelect) {
            const errorOption = document.createElement('option');
            errorOption.value = "";
            errorOption.textContent = "जिला लोड करने में त्रुटि";
            errorOption.style.color = "#C62828";
            districtSelect.appendChild(errorOption);
        }
    }
}

// Hide messages on the login page
function hideMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

// CAPTCHA event listeners
document.getElementById('refreshCaptcha')?.addEventListener('click', function() {
    drawCaptcha();
    const captchaInput = document.getElementById('captchaInput');
    if (captchaInput) captchaInput.value = ''; // Clear input
    hideMessages(); // Clear any error
});

document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    tempLoginData = {
        username: document.getElementById('username')?.value.trim(),
        password: document.getElementById('password')?.value,
        districtId: document.getElementById('district')?.value,
    };

    // Validate form data including the visible district and CAPTCHA input
    if (!tempLoginData.username || !tempLoginData.password || !tempLoginData.districtId || !document.getElementById('captchaInput')?.value.trim()) {
        errorHandler.showError('कृपया सभी आवश्यक फील्ड भरें'); // Use errorHandler.showError
        return;
    }
    
    // CAPTCHA verification (using your numerical logic)
    const userInputCaptcha = document.getElementById('captchaInput')?.value;
    if (userInputCaptcha !== currentCaptcha) {
        errorHandler.showError('गलत कैप्चा! कृपया पुनः प्रयास करें।'); // Use errorHandler.showError
        drawCaptcha(); // Generate new CAPTCHA
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) captchaInput.value = ''; // Clear input
        return; // Stop here if CAPTCHA is wrong
    }

    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" style="width: 1rem; height: 1rem;"></span> Login...';
        loginBtn.disabled = true;
    }
    hideMessages(); // Clear messages before login attempt

    // Proceed with actual login process
    proceedWithLogin();
});

// Actual login process after CAPTCHA verification
async function proceedWithLogin() {
    try {
        const { username, password, districtId } = tempLoginData;
        
        const hashedPassword = await hashPassword(password);
        
        // --- STEP 1: Custom user verification (isPublic: true to bypass auth check) ---
        const users = await secureDB.secureSelect('test_users', {
            select: `
                id, username, email, password_hash, full_name, role, is_active, district_id,
                districts (
                    id, name
                )
            `,
            filters: { username: username, is_active: true },
            single: true, // Expect a single user
            isPublic: true // CRUCIAL: Allow this initial select to bypass auth check
        });

        if (!users) { 
            throw new Error('अमान्य यूजरनेम या पासवर्ड');
        }

        if (users.password_hash !== hashedPassword) {
            throw new Error('अमान्य यूजरनेम या पासवर्ड');
        }

        if (users.district_id && users.district_id !== districtId) { // Correct comparison for UUIDs
            throw new Error('आपके द्वारा चयनित जिला आपके UserName से मेल नहीं खाता');
        }

        // --- STEP 2: Custom Supabase Session Creation (Bypassing email/phone requirement) ---
        // Instead of signInWithPassword, we create a session directly.
        // This requires a JWT token. You could generate this on a secure backend
        // or for simplicity, we'll create a dummy one for the client,
        // but the security of this token is critical.
        // For a truly secure system, this JWT should be issued by a backend server
        // after it verifies the username/password.

        // For now, we'll create a dummy session object to satisfy Supabase's internal state.
        // THIS IS A TEMPORARY WORKAROUND FOR CLIENT-SIDE ONLY AUTH WITH CUSTOM USER TABLE.
        // IN PRODUCTION, YOU MUST USE A SECURE BACKEND TO ISSUE JWT TOKENS.
        const dummyAccessToken = "dummy_access_token_from_custom_auth"; // This token won't be valid for RLS
        const dummyRefreshToken = "dummy_refresh_token_from_custom_auth"; // This token won't be valid for RLS
        const expiresIn = 3600; // 1 hour
        const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds

        const session = {
            access_token: dummyAccessToken,
            refresh_token: dummyRefreshToken,
            expires_in: expiresIn,
            token_type: 'bearer',
            user: {
                id: users.id, // Use the actual user ID from your custom table
                email: users.email || `${users.username}@custom.auth`, // Use actual email or a dummy one
                user_metadata: {
                    full_name: users.full_name,
                    username: users.username,
                    role: users.role,
                    district_id: users.district_id
                },
                app_metadata: {
                    provider: 'custom'
                },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                confirmed_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
                role: users.role, // Important for RLS if you're using auth.role()
            },
            expires_at: now + expiresIn,
        };

        const { error: setSessionError } = await supabaseClient.auth.setSession(session);

        if (setSessionError) {
            console.error("Supabase auth.setSession error:", setSessionError);
            throw new Error("लॉगिन में आंतरिक त्रुटि (सेशन): " + setSessionError.message);
        }
        // --- END CUSTOM SESSION CREATION ---

        // --- STEP 3: IMMEDIATELY UPDATE authManager's internal state ---
        await authManager.checkExistingSession(); 
        
        // --- STEP 4: Perform authenticated database updates ---
        await secureDB.secureUpdate('test_users', users.id, {
            last_login: new Date().toISOString(),
            is_online: true,
            last_activity: new Date().toISOString()
        });

        // --- STEP 5: Store user data and redirect ---
        sessionStorage.setItem('userId', users.id);
        sessionStorage.setItem('username', users.username);
        sessionStorage.setItem('fullName', users.full_name);
        sessionStorage.setItem('role', users.role);
        sessionStorage.setItem('districtId', users.district_id);
        sessionStorage.setItem('districtName', users.districts ? users.districts.name : 'Unknown District');

        sessionStorage.setItem('authVerified', 'true');
        sessionStorage.setItem('authTimestamp', Date.now().toString());

        errorHandler.showSuccess('लॉगिन सफल! रीडायरेक्ट हो रहा है...');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        errorHandler.showError(error.message || 'लॉगिन में त्रुटि हुई। कृपया पुनः प्रयास करें।'); 
        
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = 'Login';
            loginBtn.disabled = false;
        }
        
        drawCaptcha(); 
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) captchaInput.value = ''; 
        tempLoginData = {};
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    sessionStorage.removeItem('redirectCount');

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session && session.user && session.user.id) {
        console.log('User already logged in via Supabase session, redirecting to dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }

    drawCaptcha();
    loadDistricts(); 
});

// Expose functions to window scope if needed (e.g., for inline event handlers, though generally avoided)
window.drawCaptcha = drawCaptcha;
window.proceedWithLogin = proceedWithLogin;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                संचालनालय कृषि छत्तीसगढ़                      ║
║                Agriculture Department Portal                  ║
║                                                              ║
║  ✨ EXACT IMAGE LOOK REPLICATED                             ║
║  🎨 Warli Art Background Visible                            ║
║  🔢 Your Numerical CAPTCHA Logic Retained                   ║
║  🔒 Your Supabase Login Algorithm Integrated                ║
║  ✔️ District Selection VISIBLE & FUNCTIONAL                 ║
║  ✔️ Text & Link Changes Applied                             ║
║  ✔️ INPUT FIELDS NOW HAVE PISTACHIO COLOR                   ║
║  📱 Fully Responsive Design                                 ║
║  🚀 Redirects to: dashboard.html                            ║
║                                                              ║
║  Visual & Functional Details:                                ║
║  ✅ Left title: "संचालनालय कृषि छत्तीसगढ़"                   ║
║  ✅ Welcome text: "Welcome to Login"                        ║
║  ✅ Bottom links "Go to Website/Portal" REMOVED             ║
║  ✅ District dropdown is now VISIBLE and functional         ║
║  ✅ Username, Password, Captcha fields have pistachio background #F0FFF0
║  ✅ Focus state reverts to white for clear typing           ║
║  ✅ All existing JS login/captcha logic preserved           ║
╚══════════════════════════════════════════════════════════════╝
`);

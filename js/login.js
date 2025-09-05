// pmfby/js/login.js

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
        
        // Use secureDB to fetch districts, allowing public access for login page
        // secureDB.getDistricts() is configured with isPublic: true
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
        
        // Use secureDB for user authentication via a select query
        // isPublic: true is added here to bypass the auth check during login
        const users = await secureDB.secureSelect('test_users', {
            select: `
                id, username, email, password_hash, full_name, role, is_active, district_id,
                districts (
                    id, name
                )
            `,
            filters: { username: username, is_active: true },
            single: true, // Expect a single user
            isPublic: true // <--- CRUCIAL: Allow this select to bypass auth check
        });

        if (!users) { // secureSelect returns null if no data
            throw new Error('अमान्य यूजरनेम या पासवर्ड');
        }

        if (users.password_hash !== hashedPassword) {
            throw new Error('अमान्य यूजरनेम या पासवर्ड');
        }

        // District verification using the selected dropdown value
         if (users.district_id && users.district_id !== districtId) {
                    throw new Error('आपके द्वारा चयनित जिला आपके UserName से मेल नहीं खाता');
        }
        // Update user status in your database
        await secureDB.secureUpdate('test_users', users.id, {
            last_login: new Date().toISOString(),
            is_online: true,
            last_activity: new Date().toISOString()
        });

        // --- CRUCIAL STEP: Authenticate with Supabase's built-in auth ---
        // This is the missing piece! Your custom login verified the user,
        // but Supabase's auth system wasn't told about it.
        // We use the 'email' from the fetched user data, not the 'username'
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: users.email, // Use the user's actual email from the database
            password: password // Use the raw password here for Supabase auth
        });

        if (authError) {
            console.error("Supabase auth.signInWithPassword error:", authError);
            throw new Error("लॉगिन में आंतरिक त्रुटि: " + authError.message);
        }
        // --- END CRUCIAL STEP ---

        // Now authManager can pick up the session
        await authManager.checkExistingSession(); // This will populate authManager.currentUser

        // Store user data in sessionStorage for immediate use
        sessionStorage.setItem('userId', users.id);
        sessionStorage.setItem('username', users.username);
        sessionStorage.setItem('fullName', users.full_name);
        sessionStorage.setItem('role', users.role);
        sessionStorage.setItem('districtId', users.district_id);
        sessionStorage.setItem('districtName', users.districts ? users.districts.name : 'Unknown District');

        // Set authVerified flag for smooth transition to dashboard
        sessionStorage.setItem('authVerified', 'true');
        sessionStorage.setItem('authTimestamp', Date.now().toString());

        errorHandler.showSuccess('लॉगिन सफल! रीडायरेक्ट हो रहा है...'); // Use errorHandler.showSuccess

        // Redirect to dashboard after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        errorHandler.showError(error.message || 'लॉगिन में त्रुटि हुई। कृपया पुनः प्रयास करें।'); // Use errorHandler.showError
        
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = 'Login';
            loginBtn.disabled = false;
        }
        
        drawCaptcha(); // Refresh CAPTCHA on login failure
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) captchaInput.value = ''; // Clear CAPTCHA input
        tempLoginData = {};
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Clear any redirect counters from previous sessions
    sessionStorage.removeItem('redirectCount');

    // Check if already logged in via Supabase session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session && session.user && session.user.id) {
        console.log('User already logged in via Supabase session, redirecting to dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }

    drawCaptcha();
    loadDistricts(); // Load districts when the page loads
});

// Expose functions to window scope if needed (e.g., for inline event handlers, though generally avoided)
window.drawCaptcha = drawCaptcha;
window.proceedWithLogin = proceedWithLogin;

// Console welcome message (optional, can be removed)
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

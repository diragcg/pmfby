// pmfby/js/login.js

// Import all secure modules
import { supabaseClient } from './config.js';
import { SecurityUtils } from './security.js';
import { authManager } from './auth.js';     
import { errorHandler } from './error-handler.js';
import { secureDB } from './database.js'; 

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
        
        const districts = await secureDB.getDistricts(); 
        
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
        errorHandler.showError('जिला लोड करने में त्रुटि'); 
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
    if (captchaInput) captchaInput.value = ''; 
    hideMessages(); 
});

document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    tempLoginData = {
        username: document.getElementById('username')?.value.trim(),
        password: document.getElementById('password')?.value,
        districtId: document.getElementById('district')?.value,
    };

    if (!tempLoginData.username || !tempLoginData.password || !tempLoginData.districtId || !document.getElementById('captchaInput')?.value.trim()) {
        errorHandler.showError('कृपया सभी आवश्यक फील्ड भरें'); 
        return;
    }
    
    const userInputCaptcha = document.getElementById('captchaInput')?.value;
    if (userInputCaptcha !== currentCaptcha) {
        errorHandler.showError('गलत कैप्चा! कृपया पुनः प्रयास करें।'); 
        drawCaptcha(); 
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) captchaInput.value = ''; 
        return; 
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" style="width: 1rem; height: 1rem;"></span> Login...';
        loginBtn.disabled = true;
    }
    hideMessages(); 

    proceedWithLogin();
});

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
            single: true, 
            isPublic: true 
        });

        if (!users) { 
            throw new Error('अमान्य यूजरनेम या पासवर्ड');
        }

        if (users.password_hash !== hashedPassword) {
            throw new Error('अमान्य यूजरनेम या पासवर्ड');
        }

        if (users.district_id && users.district_id !== districtId) { 
            throw new Error('आपके द्वारा चयनित जिला आपके UserName से मेल नहीं खाता');
        }
        
        if (!users.email || users.email.trim() === '') {
            throw new Error('लॉगिन के लिए यूजर का ईमेल एड्रेस उपलब्ध नहीं है। कृपया एडमिन से संपर्क करें।');
        }

        // --- STEP 2: Manually populate sessionStorage for client-side state ---
        sessionStorage.setItem('userId', users.id);
        sessionStorage.setItem('username', users.username);
        sessionStorage.setItem('fullName', users.full_name);
        sessionStorage.setItem('role', users.role);
        sessionStorage.setItem('districtId', users.district_id);
        sessionStorage.setItem('districtName', users.districts ? users.districts.name : 'Unknown District');
        sessionStorage.setItem('authVerified', 'true');
        sessionStorage.setItem('authTimestamp', Date.now().toString());

        // --- STEP 3: SYNCHRONOUSLY UPDATE authManager's internal state ---
        // This is the critical change. We pass the data directly to setAuthManagerState.
        authManager.setAuthManagerState({
            id: users.id,
            username: users.username,
            fullName: users.full_name,
            role: users.role,
            districtId: users.district_id,
            districtName: users.districts ? users.districts.name : 'Unknown District'
        });
        
        // --- STEP 4: Perform authenticated database updates (now authManager is ready) ---
        // This will now pass the authManager.requireAuth() check
        await secureDB.secureUpdate('test_users', users.id, {
            last_login: new Date().toISOString(),
            is_online: true,
            last_activity: new Date().toISOString()
        });

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

    // Check if authenticated via sessionStorage and redirect if so
    await authManager.loadSessionFromStorage(); // This will set authManager's state
    if (authManager.isUserAuthenticated()) {
        console.log('User already logged in via sessionStorage, redirecting to dashboard.');
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

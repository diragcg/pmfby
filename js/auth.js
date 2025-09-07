// pmfby/js/auth.js

import { supabaseClient } from './config.js';
import { SecurityUtils } from './security.js'; 
import { errorHandler } from './error-handler.js'; // Ensure errorHandler is imported

class AuthManager {
    constructor() {
        this.currentUser = null; 
        this.isAuthenticated = false;
        this.sessionTimeout = 30 * 60 * 1000; 
        this.init();
    }

    async init() {
        try {
            await this.loadSessionFromStorage();
            this.setupInactivityLogout();
            
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    }

    async loadSessionFromStorage() {
        const userId = sessionStorage.getItem('userId');
        const username = sessionStorage.getItem('username');
        const fullName = sessionStorage.getItem('fullName');
        const role = sessionStorage.getItem('role');
        const districtId = sessionStorage.getItem('districtId');
        const districtName = sessionStorage.getItem('districtName');
        const authVerified = sessionStorage.getItem('authVerified');
        const authTimestamp = sessionStorage.getItem('authTimestamp');

        if (userId && username && authVerified === 'true' && authTimestamp) {
            const timeDiff = Date.now() - parseInt(authTimestamp);
            if (timeDiff < this.sessionTimeout) { 
                this.setAuthManagerState({
                    id: userId,
                    username: username,
                    fullName: fullName,
                    role: role,
                    districtId: districtId,
                    districtName: districtName
                });
                console.log('✅ Session loaded from sessionStorage for:', username);
                return true;
            } else {
                console.log('⏰ SessionStorage expired, clearing...');
                this.clearUserData();
            }
        }
        console.log('❌ No valid session found in sessionStorage');
        this.setAuthManagerState(null); 
        return false;
    }
    
    setAuthManagerState(userDataFromSessionStorage) {
        if (userDataFromSessionStorage) {
            this.currentUser = {
                id: userDataFromSessionStorage.id,
                email: `${userDataFromSessionStorage.username}@custom.auth`, // Dummy email
                user_metadata: {
                    full_name: userDataFromSessionStorage.fullName,
                    username: userDataFromSessionStorage.username,
                    role: userDataFromSessionStorage.role,
                    district_id: userDataFromSessionStorage.districtId
                },
                profile: { // Mimic profile structure
                    id: userDataFromSessionStorage.id,
                    full_name: userDataFromSessionStorage.fullName,
                    username: userDataFromSessionStorage.username,
                    role: userDataFromSessionStorage.role,
                    district_id: userDataFromSessionStorage.districtId,
                    districts: { id: userDataFromSessionStorage.districtId, name: userDataFromSessionStorage.districtName }
                },
            };
            this.isAuthenticated = true;
        } else {
            this.currentUser = null;
            this.isAuthenticated = false;
        }
        this.updateUserDisplay();
        this.setupRoleBasedAccess();
    }

    // FIXED: Re-introduced verifyAuthentication as a wrapper for loadSessionFromStorage
    async verifyAuthentication() {
        return this.loadSessionFromStorage();
    }

    async checkExistingSession() { // This method is now effectively the same as verifyAuthentication
        return this.loadSessionFromStorage();
    }

    async logout() {
        console.log('🚪 Logging out user (client-side only)...');
        this.clearUserData();
        this.setAuthManagerState(null); 
        console.log('✅ Logout successful');
        this.redirectToLogin();
    }

    async updateUserStatus(isOnline) {
        console.warn('⚠️ updateUserStatus is a no-op in client-side-only mode.');
        sessionStorage.setItem('isOnline', isOnline.toString());
        sessionStorage.setItem('lastActivity', new Date().toISOString());
    }

    async updateLastActivity() {
        console.warn('⚠️ updateLastActivity is a no-op in client-side-only mode.');
        sessionStorage.setItem('lastActivity', new Date().toISOString());
    }

    setupSessionMonitoring() {
        console.warn('⚠️ Supabase.auth.onAuthStateChange is bypassed in client-side-only mode.');
    }

    setupInactivityLogout() {
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log('⏰ Session timeout due to inactivity');
                this.logout();
            }, this.sessionTimeout);
        };

        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        resetTimer();
    }

    updateUserDisplay() {
        const userDisplayElement = document.getElementById('user-display');
        if (userDisplayElement && this.currentUser) {
            const displayName = this.currentUser.profile?.full_name || 
                              this.currentUser.profile?.username || 
                              this.currentUser.email || 
                              'Unknown User';
            
            const districtName = this.currentUser.profile?.districts?.name || 'Unknown District';
            
            userDisplayElement.textContent = `${displayName} - ${districtName}`;
        } else if (userDisplayElement) {
            userDisplayElement.textContent = 'Guest'; 
        }
    }

    setupRoleBasedAccess() {
        const isAdmin = this.currentUser?.profile?.role === 'admin';
        
        const adminElements = document.querySelectorAll('.admin-only, #adminToolbar');
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'flex' : 'none'; 
        });

        window.isAdmin = isAdmin; 
        
        console.log('👤 User role (from sessionStorage):', this.currentUser?.profile?.role);
        console.log('🔑 Admin access (from sessionStorage):', isAdmin);
    }

    requireAuth() {
        if (!this.isAuthenticated || !this.currentUser) {
            console.warn('🚫 Authentication required (from sessionStorage check)');
            this.redirectToLogin();
            throw new Error('Authentication required');
        }
        return true;
    }

    hasRole(role) {
        return this.currentUser?.profile?.role === role;
    }

    clearUserData() {
        sessionStorage.clear();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('autosave_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('🗑️ User data cleared from sessionStorage.');
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        const publicPages = ['header.html', 'login.html', 'index.html', 'signup.html'];
        
        if (publicPages.includes(currentPage)) {
            return;
        }
        
        if (this.isAuthenticated && this.currentUser) {
            return;
        }
        
        const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
        if (redirectCount > 3) {
            console.error('🚨 Redirect loop detected, stopping redirects');
            sessionStorage.removeItem('redirectCount');
            errorHandler.showError('प्रमाणीकरण त्रुटि', 'लगातार रीडायरेक्ट का पता चला। कृपया ब्राउज़र कैश साफ़ करके पुनः प्रयास करें।');
            return;
        }
        
        sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());
        
        console.log('🔄 Redirecting to login...', { currentPage, redirectCount: redirectCount + 1 });
        
        setTimeout(() => {
            window.location.href = 'header.html';
        }, 1000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

const authManager = new AuthManager();
export { authManager };

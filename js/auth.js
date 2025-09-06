// pmfby/js/auth.js

import { supabaseClient } from './config.js';
import { SecurityUtils } from './security.js'; // Ensure this is imported if used

class AuthManager {
    constructor() {
        this.currentUser = null; // Will store user data from sessionStorage
        this.isAuthenticated = false;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    async init() {
        try {
            // Check for existing state in sessionStorage
            await this.loadSessionFromStorage();
            
            // Setup auto-logout on inactivity
            this.setupInactivityLogout();
            
        } catch (error) {
            console.error('Auth initialization error:', error);
            // No auto-redirect here during init
        }
    }

    // NEW: Load session state directly from sessionStorage
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
            // Consider session valid for a short period after verification
            if (timeDiff < this.sessionTimeout) { // Use sessionTimeout for storage validity
                this.currentUser = {
                    id: userId,
                    email: `${username}@custom.auth`, // Dummy email for internal consistency
                    user_metadata: {
                        full_name: fullName,
                        username: username,
                        role: role,
                        district_id: districtId
                    },
                    profile: { // Mimic profile structure for easier integration
                        id: userId,
                        full_name: fullName,
                        username: username,
                        role: role,
                        district_id: districtId,
                        districts: { id: districtId, name: districtName }
                    },
                    // Add other necessary fields
                };
                this.isAuthenticated = true;
                console.log('✅ Session loaded from sessionStorage for:', username);
                this.updateUserDisplay();
                this.setupRoleBasedAccess();
                return true;
            } else {
                console.log('⏰ SessionStorage expired, clearing...');
                this.clearUserData();
            }
        }
        console.log('❌ No valid session found in sessionStorage');
        return false;
    }

    // checkExistingSession is now just a wrapper for loadSessionFromStorage
    async checkExistingSession() {
        return this.loadSessionFromStorage();
    }

    // No longer interacts with Supabase.auth.signOut directly
    async logout() {
        console.log('🚪 Logging out user (client-side only)...');
        this.clearUserData();
        this.currentUser = null;
        this.isAuthenticated = false;
        console.log('✅ Logout successful');
        this.redirectToLogin();
    }

    // These functions now update sessionStorage directly
    async updateUserStatus(isOnline) {
        // In this insecure workaround, we don't update DB on online status
        // as we are bypassing Supabase Auth and RLS.
        // This function becomes a no-op or just updates sessionStorage flags.
        console.warn('⚠️ updateUserStatus is a no-op in client-side-only mode.');
        // If you still want to track this in sessionStorage:
        sessionStorage.setItem('isOnline', isOnline.toString());
        sessionStorage.setItem('lastActivity', new Date().toISOString());
    }

    async updateLastActivity() {
        // Similar to updateUserStatus, a no-op or sessionStorage update.
        console.warn('⚠️ updateLastActivity is a no-op in client-side-only mode.');
        sessionStorage.setItem('lastActivity', new Date().toISOString());
    }

    // setupSessionMonitoring is no longer needed as we don't rely on Supabase.auth.onAuthStateChange
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

        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        // Start the timer
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
        }
    }

    setupRoleBasedAccess() {
        const isAdmin = this.currentUser?.profile?.role === 'admin';
        
        const adminElements = document.querySelectorAll('.admin-only, #adminToolbar');
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'flex' : 'none'; // Use flex for toolbar
        });

        window.isAdmin = isAdmin; // Global flag for compatibility
        
        console.log('👤 User role (from sessionStorage):', this.currentUser?.profile?.role);
        console.log('🔑 Admin access (from sessionStorage):', isAdmin);
    }

    // requireAuth now checks sessionStorage state
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
        sessionStorage.clear(); // Clears all user-related data
        // Also clear specific localStorage items if any were used
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
            // Use errorHandler for user feedback
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

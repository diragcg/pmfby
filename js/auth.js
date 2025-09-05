import { supabaseClient } from './config.js';
import { SecurityUtils } from './security.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    async init() {
        try {
            // Check if user has valid session
            await this.checkExistingSession();
            
            // Setup session monitoring
            this.setupSessionMonitoring();
            
            // Setup auto-logout on inactivity
            this.setupInactivityLogout();
            
        } catch (error) {
            console.error('Auth initialization error:', error);
            // Don't auto-redirect during initialization
        }
    }

    // Check for existing valid session
    async checkExistingSession() {
        try {
            // Get session from Supabase
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) throw error;
            
            if (session && session.user) {
                // Validate session is not expired
                const now = new Date().getTime();
                const sessionTime = new Date(session.expires_at).getTime();
                
                if (now < sessionTime) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    
                    // Get additional user data from your database
                    await this.loadUserProfile();
                    
                    console.log('✅ Valid session found for:', this.currentUser.email);
                    return true;
                } else {
                    console.log('⏰ Session expired, clearing...');
                    await this.clearExpiredSession();
                }
            } else {
                console.log('❌ No valid session found');
            }
            
        } catch (error) {
            console.error('Session check error:', error);
        }
        
        return false;
    }

    // Clear expired session without redirect
    async clearExpiredSession() {
        try {
            await supabaseClient.auth.signOut();
            this.currentUser = null;
            this.isAuthenticated = false;
        } catch (error) {
            console.error('Error clearing expired session:', error);
        }
    }

    // Load user profile from your database
    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data: userProfile, error } = await supabaseClient
                .from('test_users')
                .select('id, full_name, role, username, districts(id, name)')
                .eq('email', this.currentUser.email)
                .single();

            if (error) throw error;

            if (userProfile) {
                this.currentUser.profile = userProfile;
                this.updateUserDisplay();
                this.setupRoleBasedAccess();
                
                // Update user's last activity
                await this.updateLastActivity();
            }

        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    // Secure login function
    async login(credentials) {
        try {
            // Sanitize input credentials
            const sanitizedCredentials = SecurityUtils.sanitizeFormData(credentials);
            
            // Validate credentials
            if (!sanitizedCredentials.email || !sanitizedCredentials.password) {
                throw new Error('Email and password are required');
            }

            if (!SecurityUtils.validateField(sanitizedCredentials.email, 'email', 'Email').length === 0) {
                throw new Error('Please enter a valid email address');
            }

            console.log('🔐 Attempting login for:', sanitizedCredentials.email);

            // Attempt Supabase authentication
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: sanitizedCredentials.email,
                password: sanitizedCredentials.password // Don't sanitize passwords
            });

            if (error) throw error;

            if (data.user) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                
                // Load additional profile data
                await this.loadUserProfile();
                
                // Update user status in database
                await this.updateUserStatus(true);
                
                console.log('✅ Login successful for:', this.currentUser.email);
                return { success: true, user: this.currentUser };
            }

        } catch (error) {
            console.error('❌ Login failed:', error.message);
            this.isAuthenticated = false;
            this.currentUser = null;
            return { success: false, error: error.message };
        }
    }

    // Secure logout function
    async logout() {
        try {
            console.log('🚪 Logging out user...');
            
            // Update user status in database
            if (this.currentUser?.profile?.id) {
                await this.updateUserStatus(false);
            }

            // Sign out from Supabase
            const { error } = await supabaseClient.auth.signOut();
            if (error) console.error('Logout error:', error);

            // Clear local state
            this.currentUser = null;
            this.isAuthenticated = false;

            // Clear any cached data
            this.clearUserData();

            console.log('✅ Logout successful');
            
            // Redirect to login page
            this.redirectToLogin();

        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout fails
            this.redirectToLogin();
        }
    }

    // Update user online status
    async updateUserStatus(isOnline) {
        if (!this.currentUser?.profile?.id) return;

        try {
            await supabaseClient
                .from('test_users')
                .update({
                    is_online: isOnline,
                    last_activity: new Date().toISOString()
                })
                .eq('id', this.currentUser.profile.id);

        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    }

    // Update last activity timestamp
    async updateLastActivity() {
        if (!this.currentUser?.profile?.id) return;

        try {
            await supabaseClient
                .from('test_users')
                .update({ last_activity: new Date().toISOString() })
                .eq('id', this.currentUser.profile.id);

        } catch (error) {
            console.error('Failed to update last activity:', error);
        }
    }

    // Setup session monitoring
    setupSessionMonitoring() {
        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event);
            
            if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.isAuthenticated = false;
                // Don't auto-redirect on sign out event
            } else if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
            }
        });
    }

    // Setup automatic logout on inactivity
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

    // Update user display in UI
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

    // Setup role-based access control
    setupRoleBasedAccess() {
        const isAdmin = this.currentUser?.profile?.role === 'admin';
        
        // Show/hide admin features
        const adminElements = document.querySelectorAll('.admin-only, #adminToolbar');
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });

        // Store admin status globally
        window.isAdmin = isAdmin;
        
        console.log('👤 User role:', this.currentUser?.profile?.role);
        console.log('🔑 Admin access:', isAdmin);
    }

    // Require authentication for protected actions
    requireAuth() {
        if (!this.isAuthenticated || !this.currentUser) {
            console.warn('🚫 Authentication required');
            throw new Error('Authentication required');
        }
        return true;
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUser?.profile?.role === role;
    }

    // Clear user data
    clearUserData() {
        // Clear any cached data
        localStorage.removeItem('userData');
        sessionStorage.removeItem('redirectCount');
        
        // Clear any auto-saved form data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('autosave_')) {
                localStorage.removeItem(key);
            }
        });
    }

    // FIXED: Better redirect logic to prevent loops
    redirectToLogin() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        // Pages that don't need authentication
        const publicPages = ['header.html', 'login.html', 'index.html', 'signup.html'];
        
        // Don't redirect if already on a public page
        if (publicPages.includes(currentPage)) {
            console.log('Already on public page:', currentPage);
            return;
        }
        
        // Don't redirect if user is actually authenticated
        if (this.isAuthenticated && this.currentUser) {
            console.log('User is authenticated, no redirect needed');
            return;
        }
        
        // Check for redirect loops
        const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
        if (redirectCount > 3) {
            console.error('🚨 Redirect loop detected, stopping redirects');
            sessionStorage.removeItem('redirectCount');
            alert('Authentication error detected. Please clear your browser cache and try again.');
            return;
        }
        
        // Increment redirect counter
        sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());
        
        console.log('🔄 Redirecting to login...', { currentPage, redirectCount: redirectCount + 1 });
        
        // Add delay to prevent rapid redirects
        setTimeout(() => {
            window.location.href = 'header.html';
        }, 1000);
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // New method: Check authentication without redirect
    async verifyAuthentication() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Session verification error:', error);
                return false;
            }
            
            if (!session || !session.user) {
                console.log('No valid session during verification');
                return false;
            }
            
            // Check if session is expired
            const now = new Date().getTime();
            const expiresAt = new Date(session.expires_at).getTime();
            
            if (now >= expiresAt) {
                console.log('Session expired during verification');
                await this.clearExpiredSession();
                return false;
            }
            
            // Update local state if needed
            if (!this.isAuthenticated) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                await this.loadUserProfile();
            }
            
            return true;
            
        } catch (error) {
            console.error('Authentication verification failed:', error);
            return false;
        }
    }
}

// Create and export singleton instance
const authManager = new AuthManager();
export { authManager };

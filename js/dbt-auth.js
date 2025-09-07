// dbt-auth.js

/**
 * DBT Authentication Module
 * Handles user authentication, session management, and role-based access control
 */

const DBTAuth = {
    currentUser: null,
    isAuthenticated: false,
    
    /**
     * Check if user is authenticated and load user data
     * @returns {boolean} - Authentication status
     */
    checkUserAuthentication() {
        try {
            // Check both localStorage and sessionStorage for user object
            const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
            
            // Also check individual sessionStorage items as fallback
            const sessionUserId = sessionStorage.getItem('userId');
            const sessionRole = sessionStorage.getItem('role');
            const authVerified = sessionStorage.getItem('authVerified');
            const authTimestamp = sessionStorage.getItem('authTimestamp');
            
            if (!storedUser && !sessionUserId) {
                console.log('No authentication data found, redirecting to login');
                this.redirectToLogin();
                return false;
            }
            
            // Check session timeout (24 hours)
            if (authTimestamp) {
                const sessionAge = Date.now() - parseInt(authTimestamp);
                const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (sessionAge > maxSessionAge) {
                    console.log('Session expired, redirecting to login');
                    this.logout();
                    return false;
                }
            }
            
            let userData;
            
            if (storedUser) {
                // Use stored user object
                userData = JSON.parse(storedUser);
            } else {
                // Construct user object from sessionStorage items
                userData = {
                    id: sessionStorage.getItem('userId'),
                    username: sessionStorage.getItem('username'),
                    fullName: sessionStorage.getItem('fullName'),
                    role: sessionStorage.getItem('role'),
                    districtId: sessionStorage.getItem('districtId'),
                    districtName: sessionStorage.getItem('districtName'),
                    email: sessionStorage.getItem('email')
                };
            }
            
            // Validate user data
            if (!this.validateUserData(userData)) {
                console.error('Invalid user data, redirecting to login');
                this.logout();
                return false;
            }
            
            // Set current user
            this.currentUser = userData;
            this.isAuthenticated = true;
            
            // Update session timestamp
            sessionStorage.setItem('authTimestamp', Date.now().toString());
            
            console.log('User authenticated successfully:', {
                username: userData.username,
                role: userData.role,
                district: userData.districtName
            });
            
            return true;
            
        } catch (error) {
            console.error('Error checking authentication:', error);
            this.logout();
            return false;
        }
    },
    
    /**
     * Validate user data structure
     * @param {Object} userData - User data to validate
     * @returns {boolean} - Validation result
     */
    validateUserData(userData) {
        if (!userData) return false;
        
        // Check required fields
        const requiredFields = ['id', 'username', 'fullName', 'role'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                console.error(`Missing required field: ${field}`);
                return false;
            }
        }
        
        // Validate UUID format for id
        if (!this.isValidUUID(userData.id)) {
            console.error('Invalid user ID format');
            return false;
        }
        
        // Validate district ID if present
        if (userData.districtId && !this.isValidUUID(userData.districtId)) {
            console.warn('Invalid district ID format, setting to null');
            userData.districtId = null;
            userData.districtName = null;
        }
        
        // Validate role
        const validRoles = ['admin', 'super_admin', 'user', 'operator'];
        if (!validRoles.includes(userData.role)) {
            console.error('Invalid user role:', userData.role);
            return false;
        }
        
        return true;
    },
    
    /**
     * Check if UUID is valid
     * @param {string} uuid - UUID to validate
     * @returns {boolean} - Validation result
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return typeof uuid === 'string' && uuidRegex.test(uuid);
    },
    
    /**
     * Get current authenticated user
     * @returns {Object|null} - Current user data
     */
    getCurrentUser() {
        return this.currentUser;
    },
    
    /**
     * Check if current user is admin
     * @returns {boolean} - Admin status
     */
    isAdmin() {
        if (!this.currentUser) return false;
        return this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin';
    },
    
    /**
     * Check if current user is super admin
     * @returns {boolean} - Super admin status
     */
    isSuperAdmin() {
        if (!this.currentUser) return false;
        return this.currentUser.role === 'super_admin';
    },
    
    /**
     * Check if user has specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean} - Permission status
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const rolePermissions = {
            'super_admin': [
                'user_management', 'scheme_management', 'system_settings', 
                'data_reports', 'audit_logs', 'backup_restore', 'all_districts'
            ],
            'admin': [
                'user_management', 'scheme_management', 'data_reports', 
                'audit_logs', 'district_data'
            ],
            'user': ['data_entry', 'view_own_data'],
            'operator': ['data_entry', 'view_district_data']
        };
        
        const userPermissions = rolePermissions[this.currentUser.role] || [];
        return userPermissions.includes(permission);
    },
    
    /**
     * Check if user can access specific district data
     * @param {string} districtId - District ID to check
     * @returns {boolean} - Access status
     */
    canAccessDistrict(districtId) {
        if (!this.currentUser) return false;
        
        // Super admin can access all districts
        if (this.isSuperAdmin()) return true;
        
        // Admin can access all districts
        if (this.isAdmin()) return true;
        
        // Regular users can only access their own district
        return this.currentUser.districtId === districtId;
    },
    
    /**
     * Require admin access for a function
     * @param {string} functionName - Name of the function requiring admin access
     * @returns {boolean} - Access granted status
     */
    requireAdminAccess(functionName = 'this feature') {
        if (!this.isAdmin()) {
            this.showAccessDeniedAlert(`आपके पास ${functionName} का एक्सेस नहीं है।`);
            return false;
        }
        return true;
    },
    
    /**
     * Require specific permission for a function
     * @param {string} permission - Required permission
     * @param {string} functionName - Name of the function requiring permission
     * @returns {boolean} - Access granted status
     */
    requirePermission(permission, functionName = 'this feature') {
        if (!this.hasPermission(permission)) {
            this.showAccessDeniedAlert(`आपके पास ${functionName} का एक्सेस नहीं है।`);
            return false;
        }
        return true;
    },
    
    /**
     * Show access denied alert
     * @param {string} message - Alert message
     */
    showAccessDeniedAlert(message) {
        if (typeof showAlert === 'function') {
            showAlert(message, 'warning');
        } else {
            alert(message);
        }
    },
    
    /**
     * Update user session activity
     */
    updateActivity() {
        if (this.isAuthenticated) {
            sessionStorage.setItem('authTimestamp', Date.now().toString());
            sessionStorage.setItem('lastActivity', new Date().toISOString());
        }
    },
    
    /**
     * Set authentication state from login process
     * @param {Object} userData - User data from login
     */
    setAuthenticationState(userData) {
        try {
            // Validate user data
            if (!this.validateUserData(userData)) {
                throw new Error('Invalid user data provided');
            }
            
            // Set current user
            this.currentUser = userData;
            this.isAuthenticated = true;
            
            // Store in both localStorage and sessionStorage
            const userJson = JSON.stringify(userData);
            localStorage.setItem('user', userJson);
            sessionStorage.setItem('user', userJson);
            
            // Also store individual items for backward compatibility
            sessionStorage.setItem('userId', userData.id);
            sessionStorage.setItem('username', userData.username);
            sessionStorage.setItem('fullName', userData.fullName);
            sessionStorage.setItem('role', userData.role);
            sessionStorage.setItem('districtId', userData.districtId || '');
            sessionStorage.setItem('districtName', userData.districtName || '');
            sessionStorage.setItem('email', userData.email || '');
            sessionStorage.setItem('authVerified', 'true');
            sessionStorage.setItem('authTimestamp', Date.now().toString());
            sessionStorage.setItem('lastActivity', new Date().toISOString());
            
            console.log('Authentication state set successfully');
            
        } catch (error) {
            console.error('Error setting authentication state:', error);
            throw error;
        }
    },
    
    /**
     * Load session from storage (for page refresh scenarios)
     */
    loadSessionFromStorage() {
        return this.checkUserAuthentication();
    },
    
    /**
     * Check if user is authenticated
     * @returns {boolean} - Authentication status
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.currentUser !== null;
    },
    
    /**
     * Get user display name
     * @returns {string} - User display name
     */
    getUserDisplayName() {
        if (!this.currentUser) return 'Unknown User';
        return `${this.currentUser.fullName} - ${this.currentUser.districtName || 'No District'}`;
    },
    
    /**
     * Get user role display
     * @returns {string} - User role for display
     */
    getUserRoleDisplay() {
        if (!this.currentUser) return '';
        
        const roleMap = {
            'super_admin': 'SUPER ADMIN',
            'admin': 'ADMIN',
            'user': 'USER',
            'operator': 'OPERATOR'
        };
        
        return roleMap[this.currentUser.role] || this.currentUser.role.toUpperCase();
    },
    
    /**
     * Logout user and clear all authentication data
     */
    logout() {
        try {
            // Clear current user data
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Clear all authentication data from storage
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            
            // Clear individual sessionStorage items
            const sessionKeys = [
                'userId', 'username', 'fullName', 'role', 'districtId', 
                'districtName', 'email', 'authVerified', 'authTimestamp', 'lastActivity'
            ];
            
            sessionKeys.forEach(key => {
                sessionStorage.removeItem(key);
            });
            
            // Clear any draft data
            localStorage.removeItem('dbtFormDraft');
            
            // Clear any other app-specific data
            this.clearAppData();
            
            console.log('User logged out successfully');
            
            // Redirect to login
            this.redirectToLogin();
            
        } catch (error) {
            console.error('Error during logout:', error);
            // Force redirect even if there's an error
            this.redirectToLogin();
        }
    },
    
    /**
     * Clear application-specific data
     */
    clearAppData() {
        // Clear any cached data
        const appDataKeys = ['cachedSchemes', 'cachedDistricts', 'userPreferences'];
        appDataKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    },
    
    /**
     * Redirect to login page
     */
    redirectToLogin() {
        // Prevent infinite redirect loops
        if (window.location.pathname.includes('login.html')) {
            return;
        }
        
        // Store current page for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Redirect to login
        window.location.href = 'login.html';
    },
    
    /**
     * Handle redirect after successful login
     */
    handlePostLoginRedirect() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        
        if (redirectUrl && !redirectUrl.includes('login.html')) {
            window.location.href = redirectUrl;
        } else {
            window.location.href = 'dashboard.html';
        }
    },
    
    /**
     * Refresh user session (extend session time)
     */
    refreshSession() {
        if (this.isAuthenticated) {
            this.updateActivity();
            console.log('Session refreshed');
        }
    },
    
    /**
     * Check session validity
     * @returns {boolean} - Session validity status
     */
    isSessionValid() {
        if (!this.isAuthenticated) return false;
        
        const authTimestamp = sessionStorage.getItem('authTimestamp');
        if (!authTimestamp) return false;
        
        const sessionAge = Date.now() - parseInt(authTimestamp);
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        
        return sessionAge <= maxSessionAge;
    },
    
    /**
     * Initialize authentication module
     */
    init() {
        // Set up activity tracking
        this.setupActivityTracking();
        
        // Set up session validation
        this.setupSessionValidation();
        
        console.log('DBT Authentication module initialized');
    },
    
    /**
     * Setup activity tracking
     */
    setupActivityTracking() {
        // Track user activity
        const activityEvents = ['click', 'keypress', 'scroll', 'mousemove'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (this.isAuthenticated) {
                    // Throttle activity updates to once per minute
                    const lastActivity = sessionStorage.getItem('lastActivity');
                    const now = new Date().toISOString();
                    
                    if (!lastActivity || 
                        (new Date(now) - new Date(lastActivity)) > 60000) { // 1 minute
                        this.updateActivity();
                    }
                }
            }, { passive: true });
        });
    },
    
    /**
     * Setup session validation
     */
    setupSessionValidation() {
        // Check session validity every 5 minutes
        setInterval(() => {
            if (this.isAuthenticated && !this.isSessionValid()) {
                console.log('Session expired, logging out');
                this.logout();
            }
        }, 5 * 60 * 1000); // 5 minutes
    },
    
    /**
     * Get authentication headers for API requests
     * @returns {Object} - Headers object
     */
    getAuthHeaders() {
        if (!this.isAuthenticated || !this.currentUser) {
            return {};
        }
        
        return {
            'Authorization': `Bearer ${this.currentUser.id}`,
            'X-User-Role': this.currentUser.role,
            'X-District-Id': this.currentUser.districtId || '',
            'X-User-Id': this.currentUser.id
        };
    }
};

// Initialize authentication module when script loads
document.addEventListener('DOMContentLoaded', function() {
    DBTAuth.init();
});

// Auto-refresh session every 30 minutes
setInterval(() => {
    DBTAuth.refreshSession();
}, 30 * 60 * 1000); // 30 minutes

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBTAuth;
}

console.log('DBT Authentication module loaded successfully');

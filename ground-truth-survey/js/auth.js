/**
 * Authentication functions for the Ground Truth Survey application
 */

const Auth = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    /**
     * Initialize authentication
     */
    init: function() {
        this.supabaseClient = Utils.initSupabase();
        
        // Check for existing session
        this.checkSession();
        
        // Set up event listeners
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
        document.getElementById('togglePassword').addEventListener('click', this.togglePasswordVisibility);
        document.getElementById('changePasswordLink').addEventListener('click', this.showChangePasswordModal);
        document.getElementById('savePasswordBtn').addEventListener('click', this.changePassword.bind(this));
        
        // Set up auto logout after inactivity
        this.setupAutoLogout();
    },
    
    /**
     * Check for existing user session
     */
    checkSession: function() {
        const savedUser = Utils.getCurrentUser();
        
        if (savedUser) {
            this.currentUser = savedUser;
            this.updateUIAfterLogin();
        } else {
            // Show login form
            document.getElementById('loginContainer').style.display = 'block';
            document.getElementById('mainContent').style.display = 'none';
        }
    },
    
    /**
     * Handle login form submission
     * @param {Event} e - Form submit event
     */
    handleLogin: function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // For demo purposes, we're using the local CONFIG.USERS object
        // In production, this would be replaced with a Supabase auth call
        if (CONFIG.USERS[username] && CONFIG.USERS[username].password === password) {
            // Login successful
            this.currentUser = {
                username: username,
                ...CONFIG.USERS[username],
                rememberMe: rememberMe,
                loginTime: new Date().toISOString()
            };
            
            // Store user if remember me is checked
            if (rememberMe) {
                Utils.setCurrentUser(this.currentUser);
            }
            
            this.updateUIAfterLogin();
        } else {
            // Login failed
            document.getElementById('loginAlert').style.display = 'block';
            setTimeout(() => {
                document.getElementById('loginAlert').style.display = 'none';
            }, 3000);
        }
    },
    
    /**
     * Update UI after successful login
     */
    updateUIAfterLogin: function() {
        // Hide login container and show main content
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        // Update user display info
        document.getElementById('userDisplayName').textContent = this.currentUser.name;
        document.getElementById('userDivisionName').textContent = this.currentUser.division;
        
        // Initialize application modules
        App.init(this.currentUser);
    },
    
    /**
     * Handle logout
     */
    handleLogout: function() {
        // Clear current user data
        this.currentUser = null;
        Utils.setCurrentUser(null);
        
        // Reset and show login form
        document.getElementById('loginForm').reset();
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'block';
    },
    
    /**
     * Toggle password visibility
     */
    togglePasswordVisibility: function() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },
    
    /**
     * Show change password modal
     */
    showChangePasswordModal: function() {
        document.getElementById('changePasswordForm').reset();
        const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        modal.show();
    },
    
    /**
     * Change password
     */
    changePassword: function() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords
        if (!currentPassword || !newPassword || !confirmPassword) {
            Utils.showError('All fields are required');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            Utils.showError('New password and confirm password do not match');
            return;
        }
        
        // Check current password
        if (this.currentUser && CONFIG.USERS[this.currentUser.username].password !== currentPassword) {
            Utils.showError('Current password is incorrect');
            return;
        }
        
        Utils.showLoading();
        
        // In a real application, this would update the password in Supabase
        // For now, just simulate the change
        setTimeout(() => {
            // Update password in CONFIG.USERS (for demo purposes only)
            CONFIG.USERS[this.currentUser.username].password = newPassword;
            
            Utils.hideLoading();
            Utils.showSuccess('Password changed successfully');
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
            
            // Reset form
            document.getElementById('changePasswordForm').reset();
        }, 1000);
    },
    
    /**
     * Set up auto logout after inactivity
     */
    setupAutoLogout: function() {
        let inactivityTimer;
        
        // Reset timer on user activity
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                // Only auto logout if user is logged in
                if (this.currentUser && !this.currentUser.rememberMe) {
                    Utils.showError('You have been logged out due to inactivity');
                    this.handleLogout();
                }
            }, CONFIG.APP_SETTINGS.AUTO_LOGOUT_TIME);
        };
        
        // Events that reset the timer
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        // Start the timer initially
        resetTimer();
    },
    
    /**
     * Get current user
     * @returns {Object|null} Current user object or null
     */
    getUser: function() {
        return this.currentUser;
    },
    
    /**
     * Check if user is admin
     * @returns {boolean} True if user is admin
     */
    isAdmin: function() {
        return this.currentUser && this.currentUser.division_id === 0;
    },
    
    /**
     * Get user's division ID
     * @returns {number} Division ID
     */
    getUserDivisionId: function() {
        return this.currentUser ? this.currentUser.division_id : null;
    }
};



// Module Selection System - Dashboard Theme JavaScript
// js/module-selection-dashboard.js

console.log('Script starting...');

// Supabase configuration
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

let supabaseClient = null;
let currentUser = null;

// Active Users Tracking Variables
let heartbeatInterval;
let isUserActive = true;

// Initialize Supabase
function initializeSupabase() {
    try {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            const { createClient } = supabase;
            supabaseClient = createClient(supabaseUrl, supabaseKey);
            console.log('✓ Supabase client initialized successfully');
            return true;
        } else {
            console.error('✗ Supabase library not loaded');
            return false;
        }
    } catch (error) {
        console.error('✗ Failed to initialize Supabase:', error);
        return false;
    }
}

// Active Users Tracking Functions
function trackUserActivity() {
    isUserActive = true;
}

// Add activity listeners
document.addEventListener('mousemove', trackUserActivity);
document.addEventListener('keypress', trackUserActivity);
document.addEventListener('click', trackUserActivity);
document.addEventListener('scroll', trackUserActivity);

// Function to update user online status in TEST_USERS table
async function updateUserOnlineStatus(userId, isOnline = true) {
    try {
        await supabaseClient
            .from('test_users')
            .update({ 
                is_online: isOnline,
                last_activity: new Date().toISOString()
            })
            .eq('id', userId);
        
        console.log(`User ${userId} status updated: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
        console.error('Error updating online status:', error);
    }
}

// Heartbeat function to keep user marked as online
async function sendHeartbeat(userId) {
    if (isUserActive) {
        await updateUserOnlineStatus(userId, true);
        isUserActive = false;
    }
}

// Start user session tracking
function startUserSession(userData) {
    // Update user as online
    updateUserOnlineStatus(userData.id, true);
    
    // Send heartbeat every 30 seconds
    heartbeatInterval = setInterval(() => {
        sendHeartbeat(userData.id);
    }, 30000);
    
    // Handle page unload/close
    window.addEventListener('beforeunload', () => {
        updateUserOnlineStatus(userData.id, false);
    });
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            updateUserOnlineStatus(userData.id, false);
        } else {
            updateUserOnlineStatus(userData.id, true);
        }
    });
}

// Function to get active users count from TEST_USERS table
async function getActiveUsersCount() {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        
        const { data, error, count } = await supabaseClient
            .from('test_users')
            .select('id', { count: 'exact' })
            .eq('is_online', true)
            .gte('last_activity', twoMinutesAgo);
            
        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error getting active users count:', error);
        return 0;
    }
}

// Function to update the counter display
async function updateActiveUsersDisplay() {
    const count = await getActiveUsersCount();
    const counterElement = document.getElementById('activeUsersCount');
    
    if (counterElement) {
        const currentCount = parseInt(counterElement.textContent) || 0;
        counterElement.textContent = count;
        
        // Add visual feedback when count changes
        if (count !== currentCount) {
            counterElement.style.transform = 'scale(1.3)';
            counterElement.style.transition = 'transform 0.2s ease';
            setTimeout(() => {
                counterElement.style.transform = 'scale(1)';
            }, 200);
        }
    }
}

// Function to get detailed active users list from TEST_USERS table
async function getActiveUsersList() {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        
        const { data, error } = await supabaseClient
            .from('test_users')
            .select(`
                id, 
                full_name, 
                role, 
                last_activity,
                districts(name)
            `)
            .eq('is_online', true)
            .gte('last_activity', twoMinutesAgo)
            .order('last_activity', { ascending: false });
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting active users list:', error);
        return [];
    }
}

// Function to display active users in modal
async function showActiveUsersModal() {
    const users = await getActiveUsersList();
    const tableBody = document.getElementById('activeUsersTable');
    const totalElement = document.getElementById('totalActiveUsers');
    
    if (totalElement) totalElement.textContent = users.length;
    
    if (tableBody) {
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted hindi">कोई सक्रिय उपयोगकर्ता नहीं मिला</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = users.map(user => {
                const lastActivity = new Date(user.last_activity);
                const timeAgo = Math.floor((Date.now() - lastActivity.getTime()) / 1000);
                
                let timeDisplay;
                if (timeAgo < 60) {
                    timeDisplay = timeAgo + 's ago';
                } else if (timeAgo < 3600) {
                    timeDisplay = Math.floor(timeAgo/60) + 'm ago';
                } else {
                    timeDisplay = Math.floor(timeAgo/3600) + 'h ago';
                }
                
                return `
                    <tr>
                        <td>\${user.full_name || 'N/A'}</td>
                        <td>\${user.districts?.name || 'N/A'}</td>
                        <td><span class="badge bg-info">\${user.role || 'User'}</span></td>
                        <td><span style="color: #6c757d; font-size: 0.8rem;">\${timeDisplay}</span></td>
                        <td><span class="online-indicator"></span><small class="text-success hindi">ऑनलाइन</small></td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// Refresh active users function
async function refreshActiveUsers() {
    await showActiveUsersModal();
    await updateActiveUsersDisplay();
}

// Cleanup function for offline users (run periodically)
async function cleanupOfflineUsers() {
    try {
        // Mark users as offline if they haven't been active for more than 3 minutes
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        
        await supabaseClient
            .from('test_users')
            .update({ is_online: false })
            .lt('last_activity', threeMinutesAgo)
            .eq('is_online', true);
            
        console.log('Cleaned up offline users');
    } catch (error) {
        console.error('Error cleaning up offline users:', error);
    }
}

// Utility Functions
function showAlert(message, type, elementId = 'alertBox') {
    console.log(`Alert: ${type} - ${message}`);
    const alertBox = document.getElementById(elementId);
    if (!alertBox) {
        console.error('Alert box not found:', elementId);
        return;
    }
    
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type} hindi`;
    alertBox.style.display = 'block';
    
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

function hideLoading() {
    console.log('Hiding loading state');
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');
    const pageLoading = document.getElementById('pageLoading');
    
    if (loadingState) loadingState.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (pageLoading) pageLoading.style.display = 'none';
}

function showLoading() {
    console.log('Showing loading state');
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');
    const pageLoading = document.getElementById('pageLoading');
    
    if (loadingState) loadingState.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (pageLoading) pageLoading.style.display = 'flex';
}

function handleLogout() {
    if (confirm('क्या आप लॉगआउट करना चाहते हैं?')) {
        // Mark user as offline before logout
        if (currentUser && currentUser.id) {
            updateUserOnlineStatus(currentUser.id, false);
            
            // Clear heartbeat
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        }
        
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Main Application Logic
async function initializePage() {
    console.log('🚀 Initializing page...');
    
    try {
        // Initialize Supabase first
        if (!initializeSupabase()) {
            throw new Error('Supabase initialization failed');
        }

        // Get stored user
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        console.log('📦 Stored user data:', storedUser ? 'Found' : 'Not found');
        
        if (!storedUser) {
            showAlert('सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।', 'danger');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }

        // Parse user data
        currentUser = JSON.parse(storedUser);
        currentUser.role = currentUser.role?.trim();
        console.log('👤 Current user:', currentUser);
        
        // Update UI with user info
        const welcomeMsg = `नमस्ते, ${currentUser.fullName || currentUser.username}!`;
        const userInfo = `${currentUser.fullName || currentUser.username} (${currentUser.districtName || 'N/A'})`;
        
        const welcomeElement = document.getElementById('welcomeMessage');
        const userDisplayElement = document.getElementById('user-display');
        
        if (welcomeElement) welcomeElement.textContent = welcomeMsg;
        if (userDisplayElement) userDisplayElement.textContent = userInfo;
        console.log('✓ User info updated');
        
        // Show appropriate UI based on role
        if (currentUser.role === 'admin' || currentUser.role === 'state_admin') {
            const adminPanel = document.getElementById('adminPanel');
            const adminToolbar = document.getElementById('adminToolbar');
            if (adminPanel) adminPanel.style.display = 'block';
            if (adminToolbar) adminToolbar.classList.add('show');
            console.log('✓ Admin panel enabled');
        }
        
        // Start user session tracking
        startUserSession(currentUser);

        // Start updating active users counter
        updateActiveUsersDisplay();

        // Update counter every 30 seconds
        setInterval(updateActiveUsersDisplay, 30000);
        
        // Run cleanup every 2 minutes
        setInterval(cleanupOfflineUsers, 2 * 60 * 1000);
        
        // Hide loading and show content
        hideLoading();
        
        // Load modules
        await loadModules();
        
    } catch (error) {
        console.error('✗ Error initializing page:', error);
        hideLoading();
        showAlert('पृष्ठ लोड करने में त्रुटि। कृपया पुनः लॉगिन करें।', 'danger');
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
}

async function loadModules() {
    console.log('📋 Loading modules...');
    const moduleOptionsDiv = document.getElementById('moduleOptions');
    const adminModuleList = document.getElementById('adminModuleList');
    const submitBtn = document.querySelector('.submit-btn');
    
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        console.log('🔍 Fetching modules from database...');
        const { data: modules, error } = await supabaseClient
            .from('modules')
            .select('id, module_name, file_path, access_role')
            .order('module_name', { ascending: true });

        console.log('📊 Database response:', { modules, error });

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        // Clear existing content
        if (moduleOptionsDiv) moduleOptionsDiv.innerHTML = '';
        if (adminModuleList) adminModuleList.innerHTML = '';

        if (!modules || modules.length === 0) {
            console.log('📭 No modules found');
            if (moduleOptionsDiv) {
                moduleOptionsDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p class="hindi">कोई मॉड्यूल उपलब्ध नहीं है।</p>
                        <p class="hindi text-muted">कृपया व्यवस्थापक से संपर्क करें।</p>
                    </div>
                `;
            }
            if (submitBtn) submitBtn.disabled = true;
            return;
        }

        console.log(`📋 Rendering ${modules.length} modules`);

        // Render modules for selection
        if (moduleOptionsDiv) {
            modules.forEach((module, index) => {
                console.log(`📄 Processing module ${index + 1}:`, module);
                
                const moduleDiv = document.createElement('div');
                moduleDiv.className = 'module-option';
                
                // Create radio input
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'selectedModule';
                radioInput.id = `module\${index}`;
                radioInput.value = module.file_path;
                radioInput.required = true;
                
                // Create title div
                const titleDiv = document.createElement('div');
                titleDiv.className = 'module-title hindi';
                titleDiv.textContent = module.module_name;
                
                // Create path div
                const pathDiv = document.createElement('div');
                pathDiv.className = 'module-path';
                pathDiv.textContent = module.file_path;
                
                // Append elements
                moduleDiv.appendChild(radioInput);
                moduleDiv.appendChild(titleDiv);
                moduleDiv.appendChild(pathDiv);
                
                // Add click handler
                moduleDiv.addEventListener('click', () => {
                    // Remove selected class from all options
                    document.querySelectorAll('.module-option').forEach(opt => 
                        opt.classList.remove('selected'));
                    // Add selected class to clicked option
                    moduleDiv.classList.add('selected');
                    // Check the radio button
                    radioInput.checked = true;
                    // Enable submit button
                    if (submitBtn) submitBtn.disabled = false;
                });
                
                moduleOptionsDiv.appendChild(moduleDiv);
            });

            // Auto-select if only one module
            if (modules.length === 1) {
                const firstModule = document.getElementById('module0');
                const firstOption = document.querySelector('.module-option');
                if (firstModule && firstOption) {
                    firstModule.checked = true;
                    firstOption.classList.add('selected');
                    if (submitBtn) submitBtn.disabled = false;
                }
            }
        }

        // Render admin module list
        if (adminModuleList && (currentUser.role === 'admin' || currentUser.role === 'state_admin')) {
            console.log('🔧 Rendering admin module list');
            modules.forEach(module => {
                const moduleItem = document.createElement('div');
                moduleItem.className = 'module-item';
                
                // Create module info div
                const moduleInfo = document.createElement('div');
                moduleInfo.className = 'module-info';
                
                // Create title
                const titleElement = document.createElement('h5');
                titleElement.className = 'hindi';
                titleElement.textContent = module.module_name;
                
                // Create path
                const pathElement = document.createElement('p');
                pathElement.textContent = module.file_path;
                
                // Append to module info
                moduleInfo.appendChild(titleElement);
                moduleInfo.appendChild(pathElement);
                
                // Create delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.setAttribute('data-id', module.id);
                deleteBtn.title = 'मॉड्यूल हटाएं';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                
                // Append to module item
                moduleItem.appendChild(moduleInfo);
                moduleItem.appendChild(deleteBtn);
                
                // Append to admin list
                adminModuleList.appendChild(moduleItem);
            });
        }

        console.log('✅ Modules loaded successfully');

    } catch (error) {
        console.error('❌ Error loading modules:', error);
        showAlert('मॉड्यूल लोड करने में त्रुटि। कृपया पुनः प्रयास करें।', 'danger');
        
        // Show error state
        if (moduleOptionsDiv) {
            moduleOptionsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p class="hindi">मॉड्यूल लोड करने में त्रुटि।</p>
                    <button class="admin-btn" onclick="loadModules()">
                        <i class="fas fa-refresh me-1"></i> पुनः प्रयास करें
                    </button>
                </div>
            `;
        }
        if (submitBtn) submitBtn.disabled = true;
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    initializePage();
});

// Logout button
const logoutBtn = document.getElementById('btnLogout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// Module selection form
const moduleForm = document.getElementById('moduleSelectionForm');
if (moduleForm) {
    moduleForm.addEventListener('submit', function(event) {
        event.preventDefault();
        console.log('📝 Form submitted');
        
        const selectedRadio = document.querySelector('input[name="selectedModule"]:checked');
        if (selectedRadio) {
            console.log('🎯 Selected module:', selectedRadio.value);
            window.location.href = selectedRadio.value;
        } else {
            showAlert('कृपया एक मॉड्यूल का चयन करें।', 'danger');
        }
    });
}

// Admin form submission
const adminForm = document.getElementById('adminModuleForm');
if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🔧 Admin form submitted');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> जोड़ा जा रहा है...';
            
            const moduleName = document.getElementById('moduleName').value.trim();
            const filePath = document.getElementById('filePath').value.trim();

            console.log('📋 Adding module:', { moduleName, filePath });

            // Validate inputs
            if (!moduleName || moduleName.length < 2) {
                throw new Error('मॉड्यूल का नाम कम से कम 2 अक्षर का होना चाहिए।');
            }

            if (!filePath || !filePath.includes('.')) {
                throw new Error('कृपया वैध फ़ाइल पथ दर्ज करें।');
            }

            const { data, error } = await supabaseClient
                .from('modules')
                .insert([{
                    module_name: moduleName,
                    file_path: filePath,
                    access_role: 'user'
                }])
                .select();

            if (error) {
                console.error('❌ Supabase insert error:', error);
                throw error;
            }

            console.log('✅ Module added successfully:', data);
            showAlert('मॉड्यूल सफलतापूर्वक जोड़ा गया!', 'success', 'adminAlertBox');
            document.getElementById('adminModuleForm').reset();
            await loadModules();

        } catch (error) {
            console.error('❌ Error adding module:', error);
            const errorMessage = error.message || 'मॉड्यूल जोड़ने में त्रुटि।';
            showAlert(errorMessage, 'danger', 'adminAlertBox');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus me-2"></i><span class="hindi">मॉड्यूल जोड़ें</span>';
        }
    });
}

// Module deletion handler
const adminModuleListElement = document.getElementById('adminModuleList');
if (adminModuleListElement) {
    adminModuleListElement.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const deleteBtn = e.target.closest('.delete-btn');
            const moduleId = deleteBtn.getAttribute('data-id');
            const moduleItem = deleteBtn.closest('.module-item');
            const moduleName = moduleItem.querySelector('.module-info h5').textContent;
            
            console.log('🗑️ Delete button clicked for module:', { moduleId, moduleName });
            
            if (confirm(`क्या आप वाकई "\${moduleName}" मॉड्यूल को हटाना चाहते हैं?`)) {
                try {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>';

                    const { error } = await supabaseClient
                        .from('modules')
                        .delete()
                        .eq('id', moduleId);

                    if (error) {
                        console.error('❌ Delete error:', error);
                        throw error;
                    }

                    console.log('✅ Module deleted successfully');
                    showAlert('मॉड्यूल सफलतापूर्वक हटा दिया गया!', 'success', 'adminAlertBox');
                    await loadModules();

                } catch (error) {
                    console.error('❌ Error deleting module:', error);
                    showAlert('मॉड्यूल हटाने में त्रुटि।', 'danger', 'adminAlertBox');
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                }
            }
        }
    });
}

// Active Users Counter Click Handler
const activeUsersNav = document.getElementById('activeUsersNavItem');
if (activeUsersNav) {
    activeUsersNav.addEventListener('click', function() {
        showActiveUsersModal();
        openModal('activeUsersModal');
    });
}

// Modal close handlers
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-close') || e.target.classList.contains('btn-close-white')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    }
    
    // Close modal when clicking outside
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// Admin toolbar buttons
const userManagementBtn = document.getElementById('userManagementBtn');
if (userManagementBtn) {
    userManagementBtn.addEventListener('click', () => {
        openModal('userManagementModal');
        // Load user management data here
    });
}

const analyticsDashboardBtn = document.getElementById('analyticsDashboardBtn');
if (analyticsDashboardBtn) {
    analyticsDashboardBtn.addEventListener('click', () => {
        openModal('analyticsDashboardModal');
        // Load analytics data here
    });
}

// Keyboard navigation for module options
document.addEventListener('keydown', (e) => {
    const moduleOptions = document.querySelectorAll('.module-option');
    const currentSelected = document.querySelector('.module-option.selected');
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (!currentSelected && moduleOptions.length > 0) {
            moduleOptions[0].click();
            return;
        }
        
        const currentIndex = Array.from(moduleOptions).indexOf(currentSelected);
        let nextIndex;
        
        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % moduleOptions.length;
        } else {
            nextIndex = (currentIndex - 1 + moduleOptions.length) % moduleOptions.length;
        }
        
        moduleOptions[nextIndex].click();
        moduleOptions[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    if (e.key === 'Enter' && currentSelected) {
        e.preventDefault();
        const form = document.getElementById('moduleSelectionForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Handle network status
window.addEventListener('online', () => {
    console.log('🌐 Network online');
    showAlert('इंटरनेट कनेक्शन बहाल हो गया।', 'success');
    loadModules();
});

window.addEventListener('offline', () => {
    console.log('📡 Network offline');
    showAlert('इंटरनेट कनेक्शन बाधित है। कृपया कनेक्शन जांचें।', 'danger');
});

// Auto-refresh modules every 60 seconds for admin users
setInterval(async () => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'state_admin')) {
        try {
            console.log('🔄 Auto-refreshing modules...');
            await loadModules();
        } catch (error) {
            console.error('❌ Auto-refresh failed:', error);
        }
    }
}, 60000);

// Page visibility API for auto-refresh when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentUser) {
        console.log('👁️ Page became visible, refreshing modules...');
        setTimeout(loadModules, 1000);
    }
});

// Error boundary for unhandled errors
window.addEventListener('error', (e) => {
    console.error('💥 Unhandled error:', e.error);
    showAlert('एक अप्रत्याशित त्रुटि हुई। कृपया पृष्ठ को रीफ्रेश करें।', 'danger');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled promise rejection:', e.reason);
    showAlert('डेटा लोड करने में समस्या हुई। कृपया पुनः प्रयास करें।', 'danger');
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}

// Session timeout management
let sessionTimeout;

function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        if (confirm('आपका सत्र जल्द ही समाप्त हो जाएगा। क्या आप जारी रखना चाहते हैं?')) {
            resetSessionTimeout();
        } else {
            handleLogout();
        }
    }, 30 * 60 * 1000); // 30 minutes
}

// Initialize session timeout
resetSessionTimeout();

// Reset timeout on user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetSessionTimeout, { passive: true });
});

// Form validation enhancements
const moduleNameInput = document.getElementById('moduleName');
if (moduleNameInput) {
    moduleNameInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        
        if (value.length < 2) {
            e.target.setCustomValidity('मॉड्यूल का नाम कम से कम 2 अक्षर का होना चाहिए।');
        } else if (value.length > 100) {
            e.target.setCustomValidity('मॉड्यूल का नाम 100 अक्षर से अधिक नहीं हो सकता।');
        } else {
            e.target.setCustomValidity('');
        }
    });
}

const filePathInput = document.getElementById('filePath');
if (filePathInput) {
    filePathInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        const validExtensions = ['.html', '.htm', '.php', '.jsp', '.aspx'];
        const hasValidExtension = validExtensions.some(ext => 
            value.toLowerCase().endsWith(ext));
        
        if (!value) {
            e.target.setCustomValidity('कृपया फ़ाइल पथ दर्ज करें।');
        } else if (!hasValidExtension) {
            e.target.setCustomValidity('फ़ाइल पथ में वैध एक्सटेंशन (.html, .htm, .php, .jsp, .aspx) होना चाहिए।');
        } else if (value.length > 200) {
            e.target.setCustomValidity('फ़ाइल पथ 200 अक्षर से अधिक नहीं हो सकता।');
        } else {
            e.target.setCustomValidity('');
        }
    });
}

// Global functions for window scope
window.refreshActiveUsers = refreshActiveUsers;
window.loadModules = loadModules;
window.openModal = openModal;
window.closeModal = closeModal;

// Debug function for testing
window.debugInfo = function() {
    console.log('🐛 Debug Information:');
    console.log('Current User:', currentUser);
    console.log('Supabase Client:', supabaseClient);
    console.log('Page State:', {
        mainContentVisible: document.getElementById('mainContent')?.style.display !== 'none',
        adminPanelVisible: document.getElementById('adminPanel')?.style.display !== 'none',
        moduleCount: document.querySelectorAll('.module-option').length
    });
    console.log('Local Storage User:', localStorage.getItem('user'));
    console.log('Session Storage User:', sessionStorage.getItem('user'));
};

// Test Supabase connection
window.testSupabase = async function() {
    try {
        console.log('🧪 Testing Supabase connection...');
        const { data, error } = await supabaseClient
            .from('modules')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase test failed:', error);
        } else {
            console.log('✅ Supabase connection successful:', data);
        }
    } catch (err) {
        console.error('❌ Supabase test error:', err);
    }
};

// Analytics functions for admin dashboard
async function loadAnalyticsData() {
    try {
        // Get total users count
        const { data: usersData, error: usersError, count: totalUsers } = await supabaseClient
            .from('test_users')
            .select('id', { count: 'exact' });

        if (usersError) throw usersError;

        // Get active users count
        const activeUsers = await getActiveUsersCount();

        // Update analytics display
        const totalUsersElement = document.getElementById('totalUsersCount');
        const activeUsersElement = document.getElementById('activeUsersCountAnalytics');
        
        if (totalUsersElement) totalUsersElement.textContent = totalUsers || 0;
        if (activeUsersElement) activeUsersElement.textContent = activeUsers;

        console.log('📊 Analytics data loaded:', { totalUsers, activeUsers });

    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
    }
}

// User management functions
async function loadUserManagementData() {
    try {
        const { data: users, error } = await supabaseClient
            .from('test_users')
            .select(`
                id,
                full_name,
                username,
                email,
                role,
                is_online,
                last_activity,
                districts(name)
            `)
            .order('full_name', { ascending: true });

        if (error) throw error;

        const userListElement = document.getElementById('userList');
        if (userListElement && users) {
            userListElement.innerHTML = users.map(user => `
                <div class="user-row">
                    <div class="user-online-status ${user.is_online ? 'online' : ''}"></div>
                    <div class="user-info-display">
                        <div class="user-name">${user.full_name || user.username || 'N/A'}</div>
                        <div class="user-email">${user.email || 'N/A'}</div>
                        <div class="user-role-status">
                            ${user.role || 'user'} • ${user.districts?.name || 'N/A'}
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="user-action-btn edit-user-btn" onclick="editUser('${user.id}')" title="संपादित करें">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="user-action-btn toggle-active-btn" onclick="toggleUserActive('${user.id}', ${user.is_active})" title="सक्रिय/निष्क्रिय करें">
                            <i class="fas fa-toggle-${user.is_active ? 'on' : 'off'}"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        console.log('👥 User management data loaded:', users?.length || 0, 'users');

    } catch (error) {
        console.error('❌ Error loading user management data:', error);
        showAlert('उपयोगकर्ता डेटा लोड करने में त्रुटि।', 'danger');
    }
}

// User management action functions
window.editUser = function(userId) {
    console.log('✏️ Edit user:', userId);
    // Implement user editing functionality
    showAlert('उपयोगकर्ता संपादन सुविधा जल्द ही उपलब्ध होगी।', 'info');
};

window.toggleUserActive = function(userId, currentStatus) {
    console.log('🔄 Toggle user active status:', userId, currentStatus);
    // Implement user toggle functionality
    showAlert('उपयोगकर्ता स्थिति बदलने की सुविधा जल्द ही उपलब्ध होगी।', 'info');
};

// Enhanced modal management
document.addEventListener('keydown', (e) => {
    // Close modal with Escape key
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');
        openModals.forEach(modal => closeModal(modal.id));
    }
});

// Enhanced admin toolbar functionality
const addModuleBtn = document.getElementById('addModuleBtn');
if (addModuleBtn) {
    addModuleBtn.addEventListener('click', () => {
        // Focus on the first input field in admin panel
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel && adminPanel.style.display !== 'none') {
            const firstInput = adminPanel.querySelector('input');
            if (firstInput) firstInput.focus();
        }
    });
}

const manageModulesBtn = document.getElementById('manageModulesBtn');
if (manageModulesBtn) {
    manageModulesBtn.addEventListener('click', () => {
        // Scroll to admin panel
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// Enhanced analytics dashboard
const analyticsDashboard = document.getElementById('analyticsDashboardBtn');
if (analyticsDashboard) {
    analyticsDashboard.addEventListener('click', () => {
        loadAnalyticsData();
        openModal('analyticsDashboardModal');
    });
}

// Enhanced user management
const userManagement = document.getElementById('userManagementBtn');
if (userManagement) {
    userManagement.addEventListener('click', () => {
        loadUserManagementData();
        openModal('userManagementModal');
    });
}

// Close modal handlers for specific modals
const closeUserManagementModal = document.getElementById('closeUserManagementModal');
if (closeUserManagementModal) {
    closeUserManagementModal.addEventListener('click', () => {
        closeModal('userManagementModal');
    });
}

const closeAnalyticsDashboardModal = document.getElementById('closeAnalyticsDashboardModal');
if (closeAnalyticsDashboardModal) {
    closeAnalyticsDashboardModal.addEventListener('click', () => {
        closeModal('analyticsDashboardModal');
    });
}

// Performance optimization: Debounce resize events
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Handle responsive adjustments if needed
        console.log('📱 Window resized');
    }, 250);
});

// Accessibility enhancements
document.addEventListener('focusin', (e) => {
    // Add focus indicators for better accessibility
    if (e.target.matches('.module-option')) {
        e.target.style.outline = '2px solid #037af1';
        e.target.style.outlineOffset = '2px';
    }
});

document.addEventListener('focusout', (e) => {
    if (e.target.matches('.module-option')) {
        e.target.style.outline = '';
        e.target.style.outlineOffset = '';
    }
});

// Service worker registration (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('🔧 SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('❌ SW registration failed: ', registrationError);
            });
    });
}

// Console styling for better debugging
const consoleStyles = {
    success: 'color: #28a745; font-weight: bold;',
    error: 'color: #dc3545; font-weight: bold;',
    info: 'color: #007bff; font-weight: bold;',
    warning: 'color: #ffc107; font-weight: bold;'
};

// Enhanced logging function
window.logMessage = function(message, type = 'info') {
    const style = consoleStyles[type] || consoleStyles.info;
    console.log(`%c${message}`, style);
};

// Final initialization message
console.log('🎉 Module Selection Dashboard System loaded successfully');
console.log('💡 Use debugInfo() or testSupabase() in console for debugging');
console.log('🔧 Available global functions: refreshActiveUsers, loadModules, openModal, closeModal');

// Export functions for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeSupabase,
        loadModules,
        showAlert,
        openModal,
        closeModal,
        refreshActiveUsers
    };
}


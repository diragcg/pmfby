// admin-management-core.js - Core utilities, authentication, and navigation

// Supabase configuration
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let currentUser = null;
let currentSection = 'pmfbyAdmin';
let loadedScripts = new Set();

// Utility Functions
function showLoading(text = 'डेटा लोड हो रहा है...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingText) {
        loadingText.textContent = text;
    }
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showAlert(message, type = 'info') {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;
    
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type} hindi fade-in`;
    alertBox.style.display = 'block';
    
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

// Authentication Functions
async function checkAuthentication() {
    try {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        if (!storedUser) {
            // Redirect to header.html (go up one level from html/ folder)
            window.location.href = '../header.html';
            return null;
        }
        
        currentUser = JSON.parse(storedUser);
        console.log('Current user loaded:', currentUser);
        
        // Debug: Log the current user object to see what fields are available
        console.log('User object fields:', Object.keys(currentUser));
        console.log('Full user object:', currentUser);
        
        // Update UI with user info
        updateUserInfo();
        
        // Setup navigation based on user role
        setupNavigation();
        
        return currentUser;
        
    } catch (error) {
        console.error('Authentication error:', error);
        showAlert('प्रमाणीकरण त्रुटि, कृपया पुनः लॉगिन करें।', 'danger');
        setTimeout(() => {
            // Redirect to header.html (go up one level from html/ folder)
            window.location.href = '../header.html';
        }, 2000);
        return null;
    }
}

function handleLogout() {
    if (confirm('क्या आप वाकई लॉगआउट करना चाहते हैं?')) {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        // Redirect to header.html (go up one level from html/ folder)
        window.location.href = '../header.html';
    }
}

function updateUserInfo() {
    if (!currentUser) return;
    
    // Update user name - try different possible field names from your login system
    const userName = currentUser.fullName || 
                    currentUser.full_name || 
                    currentUser.name || 
                    currentUser.username || 
                    currentUser.user_name || 
                    currentUser.displayName ||
                    currentUser.firstName ||
                    'उपयोगकर्ता';
    document.getElementById('userFullName').textContent = userName;
    
    // Update district - try different possible field names from your login system
    const userDistrict = currentUser.districtName || 
                       currentUser.district_name || 
                       currentUser.district || 
                       currentUser.districtname ||
                       currentUser.District ||
                       'N/A';
    document.getElementById('userDistrict').textContent = userDistrict;
    
    // Update breadcrumb if exists
    const breadcrumbDistrict = document.getElementById('breadcrumbDistrict');
    if (breadcrumbDistrict) {
        breadcrumbDistrict.textContent = userDistrict;
    }
    
    // Update role badge
    const userRole = currentUser.role || 
                   currentUser.user_type || 
                   currentUser.userType || 
                   currentUser.type ||
                   currentUser.Role ||
                   'USER';
    const roleBadge = document.getElementById('userRoleBadge');
    
    // Check role and set badge accordingly
    const roleStr = userRole.toString().toLowerCase();
    
    if (roleStr.includes('pmfby') || roleStr.includes('pmfby_admin')) {
        roleBadge.textContent = 'PMFBY';
        roleBadge.style.background = 'linear-gradient(45deg, #FF9800, #FFB74D)';
    } else if (roleStr.includes('cce_admin') || (roleStr.includes('cce') && roleStr.includes('admin'))) {
        roleBadge.textContent = 'CCE';
        roleBadge.style.background = 'linear-gradient(45deg, #2196F3, #64B5F6)';
    } else if (roleStr.includes('cce_primary') || (roleStr.includes('cce') && roleStr.includes('primary'))) {
        roleBadge.textContent = 'CCE-P';
        roleBadge.style.background = 'linear-gradient(45deg, #4CAF50, #81C784)';
    } else if (roleStr.includes('admin')) {
        roleBadge.textContent = 'ADMIN';
        roleBadge.style.background = 'linear-gradient(45deg, #9C27B0, #BA68C8)';
    } else {
        roleBadge.textContent = 'USER';
        roleBadge.style.background = 'linear-gradient(45deg, #607D8B, #90A4AE)';
    }
}

function setupNavigation() {
    if (!currentUser) return;
    
    const userRole = (currentUser.role || currentUser.user_type || currentUser.userType || currentUser.type || '').toString().toLowerCase();
    
    // Hide all navigation items first
    document.getElementById('navPMFBYAdmin').style.display = 'none';
    document.getElementById('navCCEAdmin').style.display = 'none';
    document.getElementById('navCCEPrimary').style.display = 'none';
    document.getElementById('navReports').style.display = 'none';
    
    // Show navigation items based on user role
    if (userRole.includes('pmfby') || userRole.includes('pmfby_admin')) {
        document.getElementById('navPMFBYAdmin').style.display = 'block';
        document.getElementById('navReports').style.display = 'block';
        currentSection = 'pmfbyAdmin';
    } else if (userRole.includes('cce_admin') || (userRole.includes('cce') && userRole.includes('admin'))) {
        document.getElementById('navCCEAdmin').style.display = 'block';
        document.getElementById('navReports').style.display = 'block';
        currentSection = 'cceAdmin';
    } else if (userRole.includes('cce_primary') || (userRole.includes('cce') && userRole.includes('primary'))) {
        document.getElementById('navCCEPrimary').style.display = 'block';
        currentSection = 'ccePrimary';
    } else if (userRole.includes('admin')) {
        // Admin can see everything
        document.getElementById('navPMFBYAdmin').style.display = 'block';
        document.getElementById('navCCEAdmin').style.display = 'block';
        document.getElementById('navCCEPrimary').style.display = 'block';
        document.getElementById('navReports').style.display = 'block';
        currentSection = 'reports';
    } else {
        // Default user - show CCE Primary access
        document.getElementById('navCCEPrimary').style.display = 'block';
        currentSection = 'ccePrimary';
    }
    
    // Show the appropriate section
    showSection(currentSection);
}

// Section Management
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
        currentSection = sectionName;
        
        // Add active class to current nav link
        const activeNavItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // Load role-specific JavaScript and initialize section
        loadRoleSpecificScript(sectionName);
    }
}

// Dynamic Script Loading
function loadRoleSpecificScript(sectionName) {
    let scriptName = '';
    
    switch(sectionName) {
        case 'pmfbyAdmin':
            scriptName = 'admin-management-pmfby.js';
            break;
        case 'cceAdmin':
            scriptName = 'admin-management-cce.js';
            break;
        case 'ccePrimary':
            scriptName = 'admin-management-primary.js';
            break;
        case 'reports':
            // Reports functionality is handled in core
            loadReportsData();
            return;
    }
    
    if (scriptName && !loadedScripts.has(scriptName)) {
        const script = document.createElement('script');
        script.src = `../js/${scriptName}`;
        script.onload = () => {
            console.log(`${scriptName} loaded successfully`);
            loadedScripts.add(scriptName);
            
            // Initialize the section after script loads
            initializeSectionData(sectionName);
        };
        script.onerror = () => {
            console.error(`Failed to load ${scriptName}`);
            showAlert(`${scriptName} लोड करने में त्रुटि।`, 'danger');
        };
        
        // Replace the role-specific script
        const existingScript = document.getElementById('roleSpecificScript');
        if (existingScript) {
            existingScript.replaceWith(script);
            script.id = 'roleSpecificScript';
        }
    } else if (loadedScripts.has(scriptName)) {
        // Script already loaded, just initialize
        initializeSectionData(sectionName);
    }
}

function initializeSectionData(sectionName) {
    // Call the appropriate initialization function based on section
    try {
        switch(sectionName) {
            case 'pmfbyAdmin':
                if (typeof initializePMFBYAdmin === 'function') {
                    initializePMFBYAdmin();
                }
                break;
            case 'cceAdmin':
                if (typeof initializeCCEAdmin === 'function') {
                    initializeCCEAdmin();
                }
                break;
            case 'ccePrimary':
                if (typeof initializeCCEPrimary === 'function') {
                    initializeCCEPrimary();
                }
                break;
        }
    } catch (error) {
        console.error(`Error initializing ${sectionName}:`, error);
        showAlert(`${sectionName} शुरू करने में त्रुटि।`, 'danger');
    }
}

// Reports Functions (handled in core)
async function loadReportsData() {
    try {
        showLoading('Reports डेटा लोड हो रहा है...');
        
        // Load summary data
        const [pmfbyData, cceAdminData, ccePrimaryData, hierarchyData] = await Promise.all([
            supabaseClient.from('pmfby_district_admins').select('id'),
            supabaseClient.from('cce_district_admins').select('id'),
            supabaseClient.from('cce_primary_users_data').select('id'),
            supabaseClient.from('hierarchy_correction_log').select('id')
        ]);
        
        // Update summary cards
        document.getElementById('totalPMFBYAdmins').textContent = pmfbyData.data?.length || 0;
        document.getElementById('totalCCEAdmins').textContent = cceAdminData.data?.length || 0;
        document.getElementById('totalCCEPrimary').textContent = ccePrimaryData.data?.length || 0;
        document.getElementById('totalHierarchyIssues').textContent = hierarchyData.data?.length || 0;
        
        // Load PMFBY admin report
        await loadPMFBYAdminReport();
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading reports data:', error);
        showAlert('Reports डेटा लोड करने में त्रुटि।', 'danger');
        hideLoading();
    }
}

async function loadPMFBYAdminReport() {
    try {
        const { data, error } = await supabaseClient
            .from('pmfby_district_admins')
            .select('*')
            .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        displayPMFBYAdminReport(data || []);
        
    } catch (error) {
        console.error('Error loading PMFBY admin report:', error);
        displayPMFBYAdminReport([]);
    }
}

function displayPMFBYAdminReport(data) {
    const tableBody = document.getElementById('pmfbyAdminTableBody');
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center hindi">कोई PMFBY Admin डेटा नहीं मिला</td></tr>';
        return;
    }
    
    let tableHTML = '';
    data.forEach(admin => {
        tableHTML += `
            <tr>
                <td class="hindi">${admin.district_name || '-'}</td>
                <td class="hindi">${admin.admin_name || '-'}</td>
                <td class="hindi">${admin.post_name || '-'}</td>
                <td>${admin.mobile_number || '-'}</td>
                <td>
                    <span class="status-indicator ${admin.status}">
                        <i class="fas fa-${admin.status === 'active' ? 'check' : 'times'}"></i>
                        ${admin.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${formatDateTime(admin.updated_at)}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Export Functions (placeholder)
function exportPMFBYData(format) {
    showAlert('Export functionality will be implemented in the specific role scripts.', 'info');
}

// Utility Functions
function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleString('hi-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '-';
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('hi-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return '-';
    }
}

function validateMobileNumber(mobile) {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
}

function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
    }
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = '';
    }
}

function clearAllFieldErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const fields = form.querySelectorAll('.is-invalid, .is-valid');
    fields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
    
    const feedbacks = form.querySelectorAll('.invalid-feedback');
    feedbacks.forEach(feedback => {
        feedback.textContent = '';
    });
}

function setButtonLoading(buttonId, isLoading, loadingText = 'प्रोसेसिंग...') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
    }
}

function validateRequiredFields(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        const value = field.value.trim();
        
        if (!value) {
            showFieldError(field, 'यह फील्ड आवश्यक है');
            isValid = false;
        } else {
            clearFieldError(field);
            
            // Additional validation for specific field types
            if (field.type === 'tel' && !validateMobileNumber(value)) {
                showFieldError(field, 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें');
                isValid = false;
            } else if (field.type === 'number' && (isNaN(value) || parseInt(value) < 0)) {
                showFieldError(field, 'कृपया वैध संख्या दर्ज करें');
                isValid = false;
            }
        }
    });
    
    return isValid;
}

// Get unique values from array of objects
function getUniqueValues(array, key) {
    return [...new Set(array
        .map(item => item[key])
        .filter(value => value && value.toString().trim() !== '')
    )].sort();
}

// Populate dropdown with options
function populateDropdown(selectId, options, placeholder = '-- चुनें --') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = `<option value="">${placeholder}</option>`;
    
    // Add new options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

// Load village hierarchy data for district
async function loadVillageHierarchy(districtName) {
    try {
        if (!districtName) {
            throw new Error('District name is required');
        }
        
        const { data, error } = await supabaseClient
            .from('village_hierarchy')
            .select('*')
            .eq('districtname', districtName)
            .order('level4name', { ascending: true });
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        return data || [];
        
    } catch (error) {
        console.error('Error loading village hierarchy:', error);
        throw error;
    }
}

// Event Listeners
function initializeCoreEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Mobile number input formatting
    document.addEventListener('input', (e) => {
        if (e.target.type === 'tel') {
            // Remove non-numeric characters
            e.target.value = e.target.value.replace(/\D/g, '');
            
            // Limit to 10 digits
            if (e.target.value.length > 10) {
                e.target.value = e.target.value.slice(0, 10);
            }
        }
        
        // Prevent negative values for number inputs
        if (e.target.type === 'number' && e.target.value < 0) {
            e.target.value = 0;
        }
    });
    
    // Real-time field validation
    document.addEventListener('blur', (e) => {
        if (e.target.hasAttribute('required')) {
            const value = e.target.value.trim();
            
            if (!value) {
                showFieldError(e.target, 'यह फील्ड आवश्यक है');
            } else {
                clearFieldError(e.target);
                
                if (e.target.type === 'tel' && !validateMobileNumber(value)) {
                    showFieldError(e.target, 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें');
                }
            }
        }
    }, true);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + S to save (if save button exists)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.querySelector('[id*="save"], [id*="Save"], [id*="submit"], [id*="Submit"]');
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.click();
            }
        }
        
        // Escape to close modals or reset forms
        if (e.key === 'Escape') {
            const resetBtn = document.querySelector('[id*="reset"], [id*="Reset"], [id*="cancel"], [id*="Cancel"]');
            if (resetBtn) {
                resetBtn.click();
            }
        }
    });
}

// Initialize Application
async function initializeApp() {
    try {
        console.log('Initializing Admin Management Dashboard...');
        
        // Check authentication first
        const user = await checkAuthentication();
        if (!user) return;
        
        // Initialize core event listeners
        initializeCoreEventListeners();
        
        console.log('Admin Management Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('एप्लिकेशन शुरू करने में त्रुटि।', 'danger');
    }
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting Admin Management Dashboard');
    initializeApp();
});

// Console welcome message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   Admin Management Dashboard                 ║
║                   संचालनालय कृषि छत्तीसगढ़                     ║
║                                                              ║
║  🔧 PMFBY District Admin Management                         ║
║  🌾 CCE District Admin Management                           ║
║  👥 CCE Primary User Management                             ║
║  🗂️ Hierarchy Validation & Correction                       ║
║  📊 Complete Reporting System                               ║
║                                                              ║
║  ✅ Role-based dynamic loading                              ║
║  ✅ Fixed authentication for pmfby/html/ structure          ║
║  ✅ Modular JavaScript architecture                         ║
║                                                              ║
║  Core module loaded successfully!                           ║
╚══════════════════════════════════════════════════════════════╝
`);

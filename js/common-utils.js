// common-utils.js - Common utility functions

// Supabase configuration
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let currentUser = null;

// Show loading overlay
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

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;
    
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type} hindi fade-in`;
    alertBox.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

// Check authentication and get current user
async function checkAuthentication() {
    try {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        if (!storedUser) {
            window.location.href = 'login.html';
            return null;
        }
        
        currentUser = JSON.parse(storedUser);
        console.log('Current user:', currentUser);
        
        // Update UI with user info
        updateUserInfo();
        
        return currentUser;
        
    } catch (error) {
        console.error('Authentication error:', error);
        showAlert('प्रमाणीकरण त्रुटि, कृपया पुनः लॉगिन करें।', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return null;
    }
}

// Update user info in UI
function updateUserInfo() {
    if (!currentUser) return;
    
    const userFullNameEl = document.getElementById('userFullName');
    const userDistrictEl = document.getElementById('userDistrict');
    const breadcrumbDistrictEl = document.getElementById('breadcrumbDistrict');
    
    if (userFullNameEl) {
        userFullNameEl.textContent = currentUser.fullName || currentUser.full_name || currentUser.username || 'उपयोगकर्ता';
    }
    
    if (userDistrictEl) {
        userDistrictEl.textContent = currentUser.districtName || 'N/A';
    }
    
    if (breadcrumbDistrictEl) {
        breadcrumbDistrictEl.textContent = currentUser.districtName || '-';
    }
}

// Handle logout
function handleLogout() {
    if (confirm('क्या आप वाकई लॉगआउट करना चाहते हैं?')) {
        // Clear storage
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = 'login.html';
    }
}

// Format date for display
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

// Format date and time for display
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

// Validate mobile number
function validateMobileNumber(mobile) {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
}

// Validate required fields
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

// Show field error
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
    }
}

// Clear field error
function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = '';
    }
}

// Clear all field errors in form
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

// Set button loading state
function setButtonLoading(buttonId, isLoading, loadingText = 'प्रोसेसिंग...') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
        button.disabled = true;
        button.classList.add('btn-loading');
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
        button.classList.remove('btn-loading');
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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

// Get unique values from array of objects
function getUniqueValues(array, key) {
    return [...new Set(array
        .map(item => item[key])
        .filter(value => value && value.trim() !== '')
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

// Export data to Excel
function exportToExcel(data, filename, sheetName = 'Data') {
    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showAlert('Excel फाइल डाउनलोड हो गई।', 'success');
    } catch (error) {
        console.error('Excel export error:', error);
        showAlert('Excel export में त्रुटि।', 'danger');
    }
}

// Export data to PDF
function exportToPDF(data, filename, title, columns) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        
        // Add title
        doc.setFontSize(16);
        doc.text(title, 20, 20);
        doc.setFontSize(12);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 30);
        doc.text('Total Records: ' + data.length, 20, 40);
        
        // Prepare table data
        const tableData = data.map(item => 
            columns.map(col => item[col.key] || '-')
        );
        
        // Add table
        doc.autoTable({
            head: [columns.map(col => col.label)],
            body: tableData,
            startY: 50,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [27, 94, 32] }
        });
        
        // Save PDF
        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
        showAlert('PDF फाइल डाउनलोड हो गई।', 'success');
    } catch (error) {
        console.error('PDF export error:', error);
        showAlert('PDF export में त्रुटि।', 'danger');
    }
}

// Search and filter table data
function searchTable(tableBodyId, searchTerm, columns) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        if (row.cells.length === 1) return; // Skip "no data" rows
        
        let shouldShow = false;
        
        columns.forEach(columnIndex => {
            const cell = row.cells[columnIndex];
            if (cell && cell.textContent.toLowerCase().includes(term)) {
                shouldShow = true;
            }
        });
        
        row.style.display = shouldShow ? '' : 'none';
    });
}

// Handle form submission with validation
async function handleFormSubmission(formId, submitFunction, validationFunction = null) {
    try {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Prevent default form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            clearAllFieldErrors(formId);
            
            // Validate form
            let isValid = validateRequiredFields(formId);
            
            // Additional custom validation
            if (validationFunction && typeof validationFunction === 'function') {
                isValid = isValid && validationFunction();
            }
            
            if (!isValid) {
                showAlert('कृपया सभी आवश्यक फील्ड सही तरीके से भरें।', 'warning');
                return;
            }
            
            // Submit form
            await submitFunction();
        });
        
    } catch (error) {
        console.error('Form submission error:', error);
        showAlert('फॉर्म submit करने में त्रुटि।', 'danger');
    }
}

// Initialize common event listeners
function initializeCommonEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Mobile number input formatting
    const mobileInputs = document.querySelectorAll('input[type="tel"]');
    mobileInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            // Remove non-numeric characters
            e.target.value = e.target.value.replace(/\D/g, '');
            
            // Limit to 10 digits
            if (e.target.value.length > 10) {
                e.target.value = e.target.value.slice(0, 10);
            }
        });
    });
    
    // Number input validation
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            // Prevent negative values
            if (e.target.value < 0) {
                e.target.value = 0;
            }
        });
    });
    
    // Real-time field validation
    const requiredFields = document.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', () => {
            const value = field.value.trim();
            
            if (!value) {
                showFieldError(field, 'यह फील्ड आवश्यक है');
            } else {
                clearFieldError(field);
                
                // Additional validation
                if (field.type === 'tel' && !validateMobileNumber(value)) {
                    showFieldError(field, 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें');
                } else if (field.type === 'number' && (isNaN(value) || parseInt(value) < 0)) {
                    showFieldError(field, 'कृपया वैध संख्या दर्ज करें');
                }
            }
        });
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Common utilities initialized');
    
    // Check authentication
    checkAuthentication();
    
    // Initialize common event listeners
    initializeCommonEventListeners();
    
    // Add keyboard shortcuts
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
});

// Console welcome message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   Admin Management System                    ║
║                   संचालनालय कृषि छत्तीसगढ़                     ║
║                                                              ║
║  🔧 PMFBY District Admin Management                         ║
║  🌾 CCE District Admin Management                           ║
║  👥 CCE Primary User Management                             ║
║  🗂️ Hierarchy Validation & Correction                       ║
║  📊 Complete Reporting System                               ║
║                                                              ║
║  Common utilities loaded successfully!                       ║
╚══════════════════════════════════════════════════════════════╝
`);

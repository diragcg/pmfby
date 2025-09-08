// cce-admin.js - CCE District Admin management

// Global variables
let cceAdminData = null;
let activityLogData = [];

// Initialize CCE Admin Dashboard
async function initializeCCEAdmin() {
    try {
        showLoading('CCE Admin डेटा लोड हो रहा है...');
        
        // Load current admin data
        await loadCurrentCCEAdmin();
        
        // Load activity log
        await loadActivityLog();
        
        // Update statistics
        updateStatistics();
        
        hideLoading();
        
    } catch (error) {
        console.error('CCE Admin initialization error:', error);
        showAlert('CCE Admin डेटा लोड करने में त्रुटि।', 'danger');
        hideLoading();
    }
}

// Load current CCE admin data
async function loadCurrentCCEAdmin() {
    try {
        if (!currentUser || !currentUser.districtName) {
            throw new Error('User district information not available');
        }
        
        const { data, error } = await supabaseClient
            .from('cce_district_admins')
            .select('*')
            .eq('district_name', currentUser.districtName)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw error;
        }
        
        cceAdminData = data;
        
        // Display current admin info
        displayCurrentAdminInfo();
        
    } catch (error) {
        console.error('Error loading CCE admin:', error);
        
        // If no admin data exists, show empty state
        if (error.code === 'PGRST116') {
            cceAdminData = null;
            displayCurrentAdminInfo();
        } else {
            throw error;
        }
    }
}

// Display current admin information
function displayCurrentAdminInfo() {
    const currentAdminInfo = document.getElementById('currentAdminInfo');
    const updateAdminBtn = document.getElementById('updateAdminBtn');
    
    if (cceAdminData) {
        // Display existing admin data
        document.getElementById('currentAdminName').textContent = cceAdminData.admin_name || '-';
        document.getElementById('currentPostName').textContent = cceAdminData.post_name || '-';
        document.getElementById('currentMobileNumber').textContent = cceAdminData.mobile_number || '-';
        
        const statusElement = document.getElementById('currentAdminStatus');
        statusElement.textContent = cceAdminData.status === 'active' ? 'Active' : 'Inactive';
        statusElement.className = `admin-status ${cceAdminData.status}`;
        
        // Show update button if status is inactive
        if (cceAdminData.status === 'inactive') {
            updateAdminBtn.style.display = 'block';
            currentAdminInfo.classList.add('inactive');
        } else {
            updateAdminBtn.style.display = 'none';
            currentAdminInfo.classList.remove('inactive');
        }
        
    } else {
        // No admin data exists - show update button
        document.getElementById('currentAdminName').textContent = 'कोई Admin नहीं मिला';
        document.getElementById('currentPostName').textContent = '-';
        document.getElementById('currentMobileNumber').textContent = '-';
        
        const statusElement = document.getElementById('currentAdminStatus');
        statusElement.textContent = 'Not Set';
        statusElement.className = 'admin-status inactive';
        
        updateAdminBtn.style.display = 'block';
        currentAdminInfo.classList.add('inactive');
    }
}

// Show update admin form
function showUpdateAdminForm() {
    const updateForm = document.getElementById('updateAdminForm');
    const updateBtn = document.getElementById('updateAdminBtn');
    
    // Pre-fill form if data exists
    if (cceAdminData) {
        document.getElementById('adminName').value = cceAdminData.admin_name || '';
        document.getElementById('postName').value = cceAdminData.post_name || '';
        document.getElementById('mobileNumber').value = cceAdminData.mobile_number || '';
        document.getElementById('adminStatus').value = cceAdminData.status || '';
    }
    
    updateForm.style.display = 'block';
    updateBtn.style.display = 'none';
    
    // Scroll to form
    updateForm.scrollIntoView({ behavior: 'smooth' });
}

// Hide update admin form
function hideUpdateAdminForm() {
    const updateForm = document.getElementById('updateAdminForm');
    const updateBtn = document.getElementById('updateAdminBtn');
    
    updateForm.style.display = 'none';
    
    // Show update button if needed
    if (!cceAdminData || cceAdminData.status === 'inactive') {
        updateBtn.style.display = 'block';
    }
    
    // Clear form
    document.getElementById('cceAdminUpdateForm').reset();
    clearAllFieldErrors('cceAdminUpdateForm');
}

// Save CCE admin data
async function saveCCEAdmin() {
    try {
        setButtonLoading('saveAdminBtn', true, 'सेव हो रहा है...');
        
        // Get form data
        const formData = {
            district_name: currentUser.districtName,
            admin_name: document.getElementById('adminName').value.trim(),
            post_name: document.getElementById('postName').value.trim(),
            mobile_number: document.getElementById('mobileNumber').value.trim(),
            status: document.getElementById('adminStatus').value,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString()
        };
        
        let result;
        
        if (cceAdminData) {
            // Update existing record
            const { data, error } = await supabaseClient
                .from('cce_district_admins')
                .update(formData)
                .eq('id', cceAdminData.id)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            
            // Log activity
            await logActivity('UPDATE', 'CCE Admin Updated', 
                JSON.stringify(cceAdminData), JSON.stringify(result));
            
        } else {
            // Insert new record
            formData.created_at = new Date().toISOString();
            
            const { data, error } = await supabaseClient
                .from('cce_district_admins')
                .insert([formData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            
            // Log activity
            await logActivity('CREATE', 'CCE Admin Created', 
                null, JSON.stringify(result));
        }
        
        cceAdminData = result;
        
        // Update UI
        displayCurrentAdminInfo();
        hideUpdateAdminForm();
        
        // Reload activity log and update statistics
        await loadActivityLog();
        updateStatistics();
        
        showAlert('CCE Admin जानकारी सफलतापूर्वक सेव हो गई।', 'success');
        
    } catch (error) {
        console.error('Error saving CCE admin:', error);
        showAlert('CCE Admin जानकारी सेव करने में त्रुटि: ' + error.message, 'danger');
    } finally {
        setButtonLoading('saveAdminBtn', false);
    }
}

// Log activity
async function logActivity(action, description, previousValue, newValue) {
    try {
        const activityData = {
            district_name: currentUser.districtName,
            admin_type: 'CCE',
            action: action,
            description: description,
            previous_value: previousValue,
            new_value: newValue,
            updated_by: currentUser.id,
            updated_by_name: currentUser.fullName || currentUser.username,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('admin_activity_log')
            .insert([activityData]);
        
        if (error) {
            console.error('Error logging activity:', error);
        }
        
    } catch (error) {
        console.error('Activity log error:', error);
    }
}

// Load activity log
async function loadActivityLog() {
    try {
        const { data, error } = await supabaseClient
            .from('admin_activity_log')
            .select('*')
            .eq('district_name', currentUser.districtName)
            .eq('admin_type', 'CCE')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        activityLogData = data || [];
        displayActivityLog();
        
    } catch (error) {
        console.error('Error loading activity log:', error);
        activityLogData = [];
        displayActivityLog();
    }
}

// Display activity log
function displayActivityLog() {
    const tableBody = document.getElementById('activityLogTableBody');
    
    if (activityLogData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center hindi">कोई गतिविधि लॉग उपलब्ध नहीं है</td></tr>';
        return;
    }
    
    let tableHTML = '';
    activityLogData.forEach(log => {
        tableHTML += `
            <tr>
                <td>${formatDateTime(log.created_at)}</td>
                <td class="hindi">${log.description}</td>
                <td><small>${log.previous_value || '-'}</small></td>
                <td><small>${log.new_value || '-'}</small></td>
                <td class="hindi">${log.updated_by_name}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Update statistics
function updateStatistics() {
    document.getElementById('totalUpdates').textContent = activityLogData.length;
    
    const lastUpdate = activityLogData.length > 0 ? 
        formatDate(activityLogData[0].created_at) : '-';
    document.getElementById('lastUpdated').textContent = lastUpdate;
    
    const currentStatus = cceAdminData ? 
        (cceAdminData.status === 'active' ? 'Active' : 'Inactive') : 'Not Set';
    document.getElementById('currentStatusStat').textContent = currentStatus;
    
    document.getElementById('districtStat').textContent = currentUser.districtName || '-';
}

// Navigate to reports
function navigateToReports() {
    window.location.href = 'admin-reports.html';
}

// Initialize event listeners
function initializeCCEEventListeners() {
    // Update admin button
    const updateAdminBtn = document.getElementById('updateAdminBtn');
    if (updateAdminBtn) {
        updateAdminBtn.addEventListener('click', showUpdateAdminForm);
    }
    
    // Cancel update button
    const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
    if (cancelUpdateBtn) {
        cancelUpdateBtn.addEventListener('click', hideUpdateAdminForm);
    }
    
    // Reports button
    const reportsBtn = document.getElementById('reportsBtn');
    if (reportsBtn) {
        reportsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToReports();
        });
    }
    
    // Form submission
    handleFormSubmission('cceAdminUpdateForm', saveCCEAdmin);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('CCE Admin Dashboard - DOM Content Loaded');
    
    // Wait for authentication check
    setTimeout(() => {
        if (currentUser) {
            initializeCCEAdmin();
            initializeCCEEventListeners();
        }
    }, 500);
});

// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   CCE District Admin Dashboard               ║
║                   Crop Cutting Experiment                    ║
║                                                              ║
║  🌾 CCE District Admin Management                           ║
║  📝 Admin Information Update                                ║
║  📊 Activity Logging                                        ║
║  📈 Statistics Dashboard                                    ║
║  🔄 Real-time Status Tracking                              ║
║                                                              ║
║  CCE Admin module loaded successfully!                      ║
╚══════════════════════════════════════════════════════════════╝
`);

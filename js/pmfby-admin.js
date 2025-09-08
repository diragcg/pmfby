// pmfby-admin.js - PMFBY District Admin management

// Global variables
let pmfbyAdminData = null;
let activityLogData = [];

// Initialize PMFBY Admin Dashboard
async function initializePMFBYAdmin() {
    try {
        showLoading('PMFBY Admin डेटा लोड हो रहा है...');
        
        // Load current admin data
        await loadCurrentPMFBYAdmin();
        
        // Load activity log
        await loadActivityLog();
        
        // Update statistics
        updateStatistics();
        
        hideLoading();
        
    } catch (error) {
        console.error('PMFBY Admin initialization error:', error);
        showAlert('PMFBY Admin डेटा लोड करने में त्रुटि।', 'danger');
        hideLoading();
    }
}

// Load current PMFBY admin data
async function loadCurrentPMFBYAdmin() {
    try {
        if (!currentUser || !currentUser.districtName) {
            throw new Error('User district information not available');
        }
        
        const { data, error } = await supabaseClient
            .from('pmfby_district_admins')
            .select('*')
            .eq('district_name', currentUser.districtName)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw error;
        }
        
        pmfbyAdminData = data;
        
        // Display current admin info
        displayCurrentAdminInfo();
        
    } catch (error) {
        console.error('Error loading PMFBY admin:', error);
        
        // If no admin data exists, show empty state
        if (error.code === 'PGRST116') {
            pmfbyAdminData = null;
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
    
    if (pmfbyAdminData) {
        // Display existing admin data
        document.getElementById('currentAdminName').textContent = pmfbyAdminData.admin_name || '-';
        document.getElementById('currentPostName').textContent = pmfbyAdminData.post_name || '-';
        document.getElementById('currentMobileNumber').textContent = pmfbyAdminData.mobile_number || '-';
        
        const statusElement = document.getElementById('currentAdminStatus');
        statusElement.textContent = pmfbyAdminData.status === 'active' ? 'Active' : 'Inactive';
        statusElement.className = `admin-status \${pmfbyAdminData.status}`;
        
        // Show update button if status is inactive
        if (pmfbyAdminData.status === 'inactive') {
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
    if (pmfbyAdminData) {
        document.getElementById('adminName').value = pmfbyAdminData.admin_name || '';
        document.getElementById('postName').value = pmfbyAdminData.post_name || '';
        document.getElementById('mobileNumber').value = pmfbyAdminData.mobile_number || '';
        document.getElementById('adminStatus').value = pmfbyAdminData.status || '';
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
    if (!pmfbyAdminData || pmfbyAdminData.status === 'inactive') {
        updateBtn.style.display = 'block';
    }
    
    // Clear form
    document.getElementById('pmfbyAdminUpdateForm').reset();
    clearAllFieldErrors('pmfbyAdminUpdateForm');
}

// Save PMFBY admin data
async function savePMFBYAdmin() {
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
        
        if (pmfbyAdminData) {
            // Update existing record
            const { data, error } = await supabaseClient
                .from('pmfby_district_admins')
                .update(formData)
                .eq('id', pmfbyAdminData.id)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            
            // Log activity
            await logActivity('UPDATE', 'PMFBY Admin Updated', 
                JSON.stringify(pmfbyAdminData), JSON.stringify(result));
            
        } else {
            // Insert new record
            formData.created_at = new Date().toISOString();
            
            const { data, error } = await supabaseClient
                .from('pmfby_district_admins')
                .insert([formData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            
            // Log activity
            await logActivity('CREATE', 'PMFBY Admin Created', 
                null, JSON.stringify(result));
        }
        
        pmfbyAdminData = result;
        
        // Update UI
        displayCurrentAdminInfo();
        hideUpdateAdminForm();
        
        // Reload activity log and update statistics
        await loadActivityLog();
        updateStatistics();
        
        showAlert('PMFBY Admin जानकारी सफलतापूर्वक सेव हो गई।', 'success');
        
    } catch (error) {
        console.error('Error saving PMFBY admin:', error);
        showAlert('PMFBY Admin जानकारी सेव करने में त्रुटि: ' + error.message, 'danger');
    } finally {
        setButtonLoading('saveAdminBtn', false);
    }
}

// Log activity
async function logActivity(action, description, previousValue, newValue) {
    try {
        const activityData = {
            district_name: currentUser.districtName,
            admin_type: 'PMFBY',
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
            .eq('admin_type', 'PMFBY')
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
                <td>\${formatDateTime(log.created_at)}</td>
                <td class="hindi">\${log.description}</td>
                <td><small>\${log.previous_value || '-'}</small></td>
                <td><small>\${log.new_value || '-'}</small></td>
                <td class="hindi">\${log.updated_by_name}</td>
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
    
    const currentStatus = pmfbyAdminData ? 
        (pmfbyAdminData.status === 'active' ? 'Active' : 'Inactive') : 'Not Set';
    document.getElementById('currentStatusStat').textContent = currentStatus;
    
    document.getElementById('districtStat').textContent = currentUser.districtName || '-';
}

// Custom validation for PMFBY admin form
function validatePMFBYAdminForm() {
    const totalUsers = parseInt(document.getElementById('totalCCEUsers')?.value || '0');
    const activeUsers = parseInt(document.getElementById('activeCCEUsers')?.value || '0');
    const inactiveUsers = parseInt(document.getElementById('inactiveCCEUsers')?.value || '0');
    
    // Check if total equals active + inactive
    if (totalUsers !== (activeUsers + inactiveUsers)) {
        showAlert('कुल उपयोगकर्ता संख्या, सक्रिय और निष्क्रिय उपयोगकर्ताओं के योग के बराबर होनी चाहिए।', 'warning');
        return false;
    }
    
    return true;
}

// Navigate to reports
function navigateToReports() {
    window.location.href = 'admin-reports.html';
}

// Initialize event listeners
function initializePMFBYEventListeners() {
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
    handleFormSubmission('pmfbyAdminUpdateForm', savePMFBYAdmin, validatePMFBYAdminForm);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('PMFBY Admin Dashboard - DOM Content Loaded');
    
    // Wait for authentication check
    setTimeout(() => {
        if (currentUser) {
            initializePMFBYAdmin();
            initializePMFBYEventListeners();
        }
    }, 500);
});

// Console message
console.log(`
╔══════════

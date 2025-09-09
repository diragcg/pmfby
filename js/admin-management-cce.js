// admin-management-cce.js - CCE District Admin specific functions

// Global variables for CCE Admin
let cceAdminData = null;
let cceActivityLogData = [];

// Initialize CCE Admin Section
async function initializeCCEAdmin() {
    try {
        showLoading('CCE Admin डेटा लोड हो रहा है...');
        
        // Load current admin data
        await loadCurrentCCEAdmin();
        
        // Load activity log
        await loadCCEActivityLog();
        
        // Initialize event listeners
        initializeCCEEventListeners();
        
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
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        
        const userDistrict = currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname;
        if (!userDistrict) {
            throw new Error('User district not found');
        }
        
        const { data, error } = await supabaseClient
            .from('cce_district_admins')
            .select('*')
            .eq('district_name', userDistrict)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        cceAdminData = data;
        displayCCEAdminInfo(cceAdminData);
        
    } catch (error) {
        console.error('Error loading CCE admin:', error);
        
        // If no admin data exists, show empty state
        if (error.code === 'PGRST116') {
            cceAdminData = null;
            displayCCEAdminInfo(null);
        } else {
            throw error;
        }
    }
}

// Display CCE admin information
function displayCCEAdminInfo(adminData) {
    const currentAdminInfo = document.getElementById('currentCCEAdminInfo');
    const updateAdminBtn = document.getElementById('updateCCEAdminBtn');
    
    if (adminData) {
        document.getElementById('currentCCEAdminName').textContent = adminData.admin_name || '-';
        document.getElementById('currentCCEPostName').textContent = adminData.post_name || '-';
        document.getElementById('currentCCEMobileNumber').textContent = adminData.mobile_number || '-';
        
        const statusElement = document.getElementById('currentCCEAdminStatus');
        statusElement.textContent = adminData.status === 'active' ? 'Active' : 'Inactive';
        statusElement.className = `admin-status ${adminData.status}`;
        
        if (adminData.status === 'inactive') {
            updateAdminBtn.style.display = 'block';
            currentAdminInfo.classList.add('inactive');
        } else {
            updateAdminBtn.style.display = 'none';
            currentAdminInfo.classList.remove('inactive');
        }
    } else {
        document.getElementById('currentCCEAdminName').textContent = 'कोई Admin नहीं मिला';
        document.getElementById('currentCCEPostName').textContent = '-';
        document.getElementById('currentCCEMobileNumber').textContent = '-';
        
        const statusElement = document.getElementById('currentCCEAdminStatus');
        statusElement.textContent = 'Not Set';
        statusElement.className = 'admin-status inactive';
        
        updateAdminBtn.style.display = 'block';
        currentAdminInfo.classList.add('inactive');
    }
}

// Show update CCE admin form
function showUpdateCCEAdminForm() {
    const updateForm = document.getElementById('updateCCEAdminForm');
    const updateBtn = document.getElementById('updateCCEAdminBtn');
    
    // Pre-fill form if data exists
    if (cceAdminData) {
        document.getElementById('cceAdminName').value = cceAdminData.admin_name || '';
        document.getElementById('ccePostName').value = cceAdminData.post_name || '';
        document.getElementById('cceMobileNumber').value = cceAdminData.mobile_number || '';
        document.getElementById('cceAdminStatus').value = cceAdminData.status || '';
    }
    
    updateForm.style.display = 'block';
    updateBtn.style.display = 'none';
    
    // Scroll to form
    updateForm.scrollIntoView({ behavior: 'smooth' });
}

// Hide update CCE admin form
function hideUpdateCCEAdminForm() {
    const updateForm = document.getElementById('updateCCEAdminForm');
    const updateBtn = document.getElementById('updateCCEAdminBtn');
    
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
        // Validate form
        if (!validateRequiredFields('cceAdminUpdateForm')) {
            showAlert('कृपया सभी आवश्यक फील्ड भरें।', 'warning');
            return;
        }
        
        setButtonLoading('saveCCEAdminBtn', true, 'सेव हो रहा है...');
        
        // Get form data
        const formData = {
            district_name: currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname,
            admin_name: document.getElementById('cceAdminName').value.trim(),
            post_name: document.getElementById('ccePostName').value.trim(),
            mobile_number: document.getElementById('cceMobileNumber').value.trim(),
            status: document.getElementById('cceAdminStatus').value,
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
            await logCCEActivity('UPDATE', 'CCE Admin Updated', 
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
            await logCCEActivity('CREATE', 'CCE Admin Created', 
                null, JSON.stringify(result));
        }
        
        cceAdminData = result;
        
        // Update UI
        displayCCEAdminInfo(cceAdminData);
        hideUpdateCCEAdminForm();
        
        // Reload activity log
        await loadCCEActivityLog();
        
        showAlert('CCE Admin जानकारी सफलतापूर्वक सेव हो गई।', 'success');
        
    } catch (error) {
        console.error('Error saving CCE admin:', error);
        showAlert('CCE Admin जानकारी सेव करने में त्रुटि: ' + error.message, 'danger');
    } finally {
        setButtonLoading('saveCCEAdminBtn', false);
    }
}

// Log CCE activity
async function logCCEActivity(action, description, previousValue, newValue) {
    try {
        const activityData = {
            district_name: currentUser.districtName || currentUser.district_name || currentUser.district,
            admin_type: 'CCE',
            action: action,
            description: description,
            previous_value: previousValue,
            new_value: newValue,
            updated_by: currentUser.id,
            updated_by_name: currentUser.fullName || currentUser.full_name || currentUser.username,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('admin_activity_log')
            .insert([activityData]);
        
        if (error) {
            console.error('Error logging CCE activity:', error);
        }
        
    } catch (error) {
        console.error('CCE Activity log error:', error);
    }
}

// Load CCE activity log
async function loadCCEActivityLog() {
    try {
        const { data, error } = await supabaseClient
            .from('admin_activity_log')
            .select('*')
            .eq('district_name', currentUser.districtName || currentUser.district_name || currentUser.district)
            .eq('admin_type', 'CCE')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        cceActivityLogData = data || [];
        console.log('CCE activity log loaded:', cceActivityLogData.length, 'records');
        
    } catch (error) {
        console.error('Error loading CCE activity log:', error);
        cceActivityLogData = [];
    }
}

// Initialize CCE event listeners
function initializeCCEEventListeners() {
    // Update admin button
    const updateCCEAdminBtn = document.getElementById('updateCCEAdminBtn');
    if (updateCCEAdminBtn) {
        updateCCEAdminBtn.addEventListener('click', showUpdateCCEAdminForm);
    }
    
    // Cancel update button
    const cancelCCEUpdateBtn = document.getElementById('cancelCCEUpdateBtn');
    if (cancelCCEUpdateBtn) {
        cancelCCEUpdateBtn.addEventListener('click', hideUpdateCCEAdminForm);
    }
    
    // Form submission
    const cceAdminUpdateForm = document.getElementById('cceAdminUpdateForm');
    if (cceAdminUpdateForm) {
        cceAdminUpdateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveCCEAdmin();
        });
    }
}

// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   CCE Admin Module Loaded                   ║
║                   Crop Cutting Experiment                    ║
║                                                              ║
║  🌾 CCE District Admin Management                           ║
║  📝 Admin Information Update                                ║
║  📊 Activity Logging                                        ║
║  🔄 Real-time Status Tracking                              ║
║                                                              ║
║  CCE Admin module loaded successfully!                      ║
╚══════════════════════════════════════════════════════════════╝
`);

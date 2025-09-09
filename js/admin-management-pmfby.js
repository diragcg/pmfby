// admin-management-pmfby.js - PMFBY District Admin specific functions

// Global variables for PMFBY
let pmfbyAdminData = null;
let pmfbyActivityLogData = [];

// Initialize PMFBY Admin Section
async function initializePMFBYAdmin() {
    try {
        showLoading('PMFBY Admin डेटा लोड हो रहा है...');
        
        // Load current admin data
        await loadCurrentPMFBYAdmin();
        
        // Load activity log
        await loadPMFBYActivityLog();
        
        // Initialize event listeners
        initializePMFBYEventListeners();
        
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
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        
        const userDistrict = currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname;
        if (!userDistrict) {
            throw new Error('User district not found');
        }
        
        const { data, error } = await supabaseClient
            .from('pmfby_district_admins')
            .select('*')
            .eq('district_name', userDistrict)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        pmfbyAdminData = data;
        displayPMFBYAdminInfo(pmfbyAdminData);
        
    } catch (error) {
        console.error('Error loading PMFBY admin:', error);
        
        // If no admin data exists, show empty state
        if (error.code === 'PGRST116') {
            pmfbyAdminData = null;
            displayPMFBYAdminInfo(null);
        } else {
            throw error;
        }
    }
}

// Display PMFBY admin information
function displayPMFBYAdminInfo(adminData) {
    const currentAdminInfo = document.getElementById('currentPMFBYAdminInfo');
    const updateAdminBtn = document.getElementById('updatePMFBYAdminBtn');
    
    if (adminData) {
        document.getElementById('currentPMFBYAdminName').textContent = adminData.admin_name || '-';
        document.getElementById('currentPMFBYPostName').textContent = adminData.post_name || '-';
        document.getElementById('currentPMFBYMobileNumber').textContent = adminData.mobile_number || '-';
        
        const statusElement = document.getElementById('currentPMFBYAdminStatus');
        statusElement.textContent = adminData.status === 'active' ? 'Active' : 'Inactive';
        statusElement.className = `admin-status \${adminData.status}`;
        
        if (adminData.status === 'inactive') {
            updateAdminBtn.style.display = 'block';
            currentAdminInfo.classList.add('inactive');
        } else {
            updateAdminBtn.style.display = 'none';
            currentAdminInfo.classList.remove('inactive');
        }
    } else {
        document.getElementById('currentPMFBYAdminName').textContent = 'कोई Admin नहीं मिला';
        document.getElementById('currentPMFBYPostName').textContent = '-';
        document.getElementById('currentPMFBYMobileNumber').textContent = '-';
        
        const statusElement = document.getElementById('currentPMFBYAdminStatus');
        statusElement.textContent = 'Not Set';
        statusElement.className = 'admin-status inactive';
        
        updateAdminBtn.style.display = 'block';
        currentAdminInfo.classList.add('inactive');
    }
}

// Show update PMFBY admin form
function showUpdatePMFBYAdminForm() {
    const updateForm = document.getElementById('updatePMFBYAdminForm');
    const updateBtn = document.getElementById('updatePMFBYAdminBtn');
    
    // Pre-fill form if data exists
    if (pmfbyAdminData) {
        document.getElementById('pmfbyAdminName').value = pmfbyAdminData.admin_name || '';
        document.getElementById('pmfbyPostName').value = pmfbyAdminData.post_name || '';
        document.getElementById('pmfbyMobileNumber').value = pmfbyAdminData.mobile_number || '';
        document.getElementById('pmfbyAdminStatus').value = pmfbyAdminData.status || '';
    }
    
    updateForm.style.display = 'block';
    updateBtn.style.display = 'none';
    
    // Scroll to form
    updateForm.scrollIntoView({ behavior: 'smooth' });
}

// Hide update PMFBY admin form
function hideUpdatePMFBYAdminForm() {
    const updateForm = document.getElementById('updatePMFBYAdminForm');
    const updateBtn = document.getElementById('updatePMFBYAdminBtn');
    
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
        // Validate form
        if (!validateRequiredFields('pmfbyAdminUpdateForm')) {
            showAlert('कृपया सभी आवश्यक फील्ड भरें।', 'warning');
            return;
        }
        
        setButtonLoading('savePMFBYAdminBtn', true, 'सेव हो रहा है...');
        
        // Get form data
        const formData = {
            district_name: currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname,
            admin_name: document.getElementById('pmfbyAdminName').value.trim(),
            post_name: document.getElementById('pmfbyPostName').value.trim(),
            mobile_number: document.getElementById('pmfbyMobileNumber').value.trim(),
            status: document.getElementById('pmfbyAdminStatus').value,
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
            await logPMFBYActivity('UPDATE', 'PMFBY Admin Updated', 
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
            await logPMFBYActivity('CREATE', 'PMFBY Admin Created', 
                null, JSON.stringify(result));
        }
        
        pmfbyAdminData = result;
        
        // Update UI
        displayPMFBYAdminInfo(pmfbyAdminData);
        hideUpdatePMFBYAdminForm();
        
        // Reload activity log
        await loadPMFBYActivityLog();
        
        showAlert('PMFBY Admin जानकारी सफलतापूर्वक सेव हो गई।', 'success');
        
    } catch (error) {
        console.error('Error saving PMFBY admin:', error);
        showAlert('PMFBY Admin जानकारी सेव करने में त्रुटि: ' + error.message, 'danger');
    } finally {
        setButtonLoading('savePMFBYAdminBtn', false);
    }
}

// Log PMFBY activity
async function logPMFBYActivity(action, description, previousValue, newValue) {
    try {
        const activityData = {
            district_name: currentUser.districtName || currentUser.district_name || currentUser.district,
            admin_type: 'PMFBY',
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
            console.error('Error logging PMFBY activity:', error);
        }
        
    } catch (error) {
        console.error('PMFBY Activity log error:', error);
    }
}

// Load PMFBY activity log
async function loadPMFBYActivityLog() {
    try {
        const { data, error } = await supabaseClient
            .from('admin_activity_log')
            .select('*')
            .eq('district_name', currentUser.districtName || currentUser.district_name || currentUser.district)
            .eq('admin_type', 'PMFBY')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        pmfbyActivityLogData = data || [];
        console.log('PMFBY activity log loaded:', pmfbyActivityLogData.length, 'records');
        
    } catch (error) {
        console.error('Error loading PMFBY activity log:', error);
        pmfbyActivityLogData = [];
    }
}

// Initialize PMFBY event listeners
function initializePMFBYEventListeners() {
    // Update admin button
    const updatePMFBYAdminBtn = document.getElementById('updatePMFBYAdminBtn');
    if (updatePMFBYAdminBtn) {
        updatePMFBYAdminBtn.addEventListener('click', showUpdatePMFBYAdminForm);
    }
    
    // Cancel update button
    const cancelPMFBYUpdateBtn = document.getElementById('cancelPMFBYUpdateBtn');
    if (cancelPMFBYUpdateBtn) {
        cancelPMFBYUpdateBtn.addEventListener('click', hideUpdatePMFBYAdminForm);
    }
    
    // Form submission
    const pmfbyAdminUpdateForm = document.getElementById('pmfbyAdminUpdateForm');
    if (pmfbyAdminUpdateForm) {
        pmfbyAdminUpdateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            savePMFBYAdmin();
        });
    }
}

// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   PMFBY Admin Module Loaded                 ║
║                   प्रधानमंत्री फसल बीमा योजना                  ║
║                                                              ║
║  🛡️ PMFBY District Admin Management                         ║
║  📝 Admin Information Update                                ║
║  📊 Activity Logging                                        ║
║  🔄 Real-time Status Tracking                              ║
║                                                              ║
║  PMFBY module loaded successfully!                          ║
╚══════════════════════════════════════════════════════════════╝
`);


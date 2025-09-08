// reports.js - Admin reports management

// Global variables
let pmfbyAdminReportData = [];
let cceAdminReportData = [];
let ccePrimaryReportData = [];
let hierarchyReportData = [];
let filteredPMFBYData = [];
let filteredCCEAdminData = [];
let filteredCCEPrimaryData = [];
let filteredHierarchyData = [];

// Initialize Admin Reports
async function initializeAdminReports() {
    try {
        showLoading('Admin Reports लोड हो रही हैं...');
        
        // Load all report data
        await Promise.all([
            loadPMFBYAdminReport(),
            loadCCEAdminReport(),
            loadCCEPrimaryReport(),
            loadHierarchyReport()
        ]);
        
        // Update summary cards
        updateSummaryCards();
        
        // Populate filter dropdowns
        populateFilterDropdowns();
        
        // Display initial data
        displayAllReports();
        
        hideLoading();
        
    } catch (error) {
        console.error('Admin reports initialization error:', error);
        showAlert('Admin Reports लोड करने में त्रुटि।', 'danger');
        hideLoading();
    }
}

// Load PMFBY Admin Report
async function loadPMFBYAdminReport() {
    try {
        const { data, error } = await supabaseClient
            .from('pmfby_district_admins')
            .select(`
                *,
                test_users(full_name, username)
            `)
            .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        pmfbyAdminReportData = data || [];
        filteredPMFBYData = [...pmfbyAdminReportData];
        
        console.log('PMFBY Admin Report loaded:', pmfbyAdminReportData.length, 'records');
        
    } catch (error) {
        console.error('Error loading PMFBY admin report:', error);
        pmfbyAdminReportData = [];
        filteredPMFBYData = [];
    }
}

// Load CCE Admin Report
async function loadCCEAdminReport() {
    try {
        const { data, error } = await supabaseClient
            .from('cce_district_admins')
            .select(`
                *,
                test_users(full_name, username)
            `)
            .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        cceAdminReportData = data || [];
        filteredCCEAdminData = [...cceAdminReportData];
        
        console.log('CCE Admin Report loaded:', cceAdminReportData.length, 'records');
        
    } catch (error) {
        console.error('Error loading CCE admin report:', error);
        cceAdminReportData = [];
        filteredCCEAdminData = [];
    }
}

// Load CCE Primary Report
async function loadCCEPrimaryReport() {
    try {
        const { data, error } = await supabaseClient
            .from('cce_primary_users_data')
            .select(`
                *,
                test_users(full_name, username)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        ccePrimaryReportData = data || [];
        filteredCCEPrimaryData = [...ccePrimaryReportData];
        
        console.log('CCE Primary Report loaded:', ccePrimaryReportData.length, 'records');
        
    } catch (error) {
        console.error('Error loading CCE primary report:', error);
        ccePrimaryReportData = [];
        filteredCCEPrimaryData = [];
    }
}

// Load Hierarchy Report
async function loadHierarchyReport() {
    try {
        const { data, error } = await supabaseClient
            .from('hierarchy_correction_log')
            .select(`
                *,
                test_users(full_name, username)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        hierarchyReportData = data || [];
        filteredHierarchyData = [...hierarchyReportData];
        
        console.log('Hierarchy Report loaded:', hierarchyReportData.length, 'records');
        
    } catch (error) {
        console.error('Error loading hierarchy report:', error);
        hierarchyReportData = [];
        filteredHierarchyData = [];
    }
}

// Update summary cards
function updateSummaryCards() {
    document.getElementById('totalPMFBYAdmins').textContent = pmfbyAdminReportData.length;
    document.getElementById('totalCCEAdmins').textContent = cceAdminReportData.length;
    document.getElementById('totalCCEPrimary').textContent = ccePrimaryReportData.length;
    document.getElementById('totalHierarchyIssues').textContent = hierarchyReportData.length;
}

// Populate filter dropdowns
function populateFilterDropdowns() {
    // PMFBY District Filter
    const pmfbyDistricts = getUniqueValues(pmfbyAdminReportData, 'district_name');
    populateDropdown('pmfbyDistrictFilter', pmfbyDistricts, 'All Districts');
    
    // CCE District Filter
    const cceDistricts = getUniqueValues(cceAdminReportData, 'district_name');
    populateDropdown('cceDistrictFilter', cceDistricts, 'All Districts');
    
    // CCE Primary District Filter
    const ccePrimaryDistricts = getUniqueValues(ccePrimaryReportData, 'district_name');
    populateDropdown('ccePrimaryDistrictFilter', ccePrimaryDistricts, 'All Districts');
    
    // CCE Primary Tehsil Filter
    const ccePrimaryTehsils = getUniqueValues(ccePrimaryReportData, 'tehsil_name');
    populateDropdown('ccePrimaryTehsilFilter', ccePrimaryTehsils, 'All Tehsils');
    
    // Hierarchy District Filter
    const hierarchyDistricts = getUniqueValues(hierarchyReportData, 'district_name');
    populateDropdown('hierarchyDistrictFilter', hierarchyDistricts, 'All Districts');
}

// Display all reports
function displayAllReports() {
    displayPMFBYAdminReport();
    displayCCEAdminReport();
    displayCCEPrimaryReport();
    displayHierarchyReport();
}

// Display PMFBY Admin Report
function displayPMFBYAdminReport() {
    const tableBody = document.getElementById('pmfbyAdminTableBody');
    
    if (filteredPMFBYData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center hindi">कोई PMFBY Admin डेटा नहीं मिला</td></tr>';
        return;
    }
    
    let tableHTML = '';
    filteredPMFBYData.forEach(admin => {
        const updatedBy = admin.test_users?.full_name || admin.test_users?.username || 'System';
        
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
                <td class="hindi">${updatedBy}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Display CCE Admin Report
function displayCCEAdminReport() {
    const tableBody = document.getElementById('cceAdminTableBody');
    
    if (filteredCCEAdminData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center hindi">कोई CCE Admin डेटा नहीं मिला</td></tr>';
        return;
    }
    
    let tableHTML = '';
    filteredCCEAdminData.forEach(admin => {
        const updatedBy = admin.test_users?.full_name || admin.test_users?.username || 'System';
        
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
                <td class="hindi">${updatedBy}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Display CCE Primary Report
function displayCCEPrimaryReport() {
    const tableBody = document.getElementById('ccePrimaryTableBody');
    
    if (filteredCCEPrimaryData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" class="text-center hindi">कोई CCE Primary User डेटा नहीं मिला</td></tr>';
        return;
    }
    
    let tableHTML = '';
    filteredCCEPrimaryData.forEach(user => {
        const villagesCorrected = hierarchyReportData.filter(h => 
            h.district_name === user.district_name && 
            h.user_id === user.user_id
        ).length;
        
        tableHTML += `
            <tr>
                <td class="hindi">${user.district_name || '-'}</td>
                <td class="hindi">${user.tehsil_name || '-'}</td>
                <td class="hindi">${user.ri_name || '-'}</td>
                <td class="hindi">${user.cce_primary_user_name || '-'}</td>
                <td>${user.cce_primary_user_mobile || '-'}</td>
                <td>${user.total_cce_users || 0}</td>
                <td>${user.active_cce_users || 0}</td>
                <td>${user.inactive_cce_users || 0}</td>
                <td>${user.hierarchy_ok_count || 0}</td>
                <td>${user.hierarchy_issue_count || 0}</td>
                <td>${villagesCorrected}</td>
                <td>${formatDate(user.created_at)}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Display Hierarchy Report
function displayHierarchyReport() {
    const tableBody = document.getElementById('hierarchyTableBody');
    
    if (filteredHierarchyData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center hindi">कोई Hierarchy Correction डेटा नहीं मिला</td></tr>';
        return;
    }
    
    let tableHTML = '';
    filteredHierarchyData.forEach(correction => {
        tableHTML += `
            <tr>
                <td class="hindi">${correction.district_name || '-'}</td>
                <td class="hindi">${correction.corrected_level4name || correction.original_level4name || '-'}</td>
                <td class="hindi">${correction.corrected_level5name || correction.original_level5name || '-'}</td>
                <td>${correction.corrected_level6code || correction.original_level6code || '-'}</td>
                <td class="hindi">${correction.original_villagename || '-'}</td>
                <td>${correction.original_villagecode || '-'}</td>
                <td class="hindi">
                    ${(() => {
                        // Find CCE Primary User name from ccePrimaryReportData
                        const cceUser = ccePrimaryReportData.find(u => u.user_id === correction.user_id);
                        return cceUser?.cce_primary_user_name || '-';
                    })()}
                </td>
                <td>
                    ${(() => {
                        // Find CCE Primary User mobile from ccePrimaryReportData
                        const cceUser = ccePrimaryReportData.find(u => u.user_id === correction.user_id);
                        return cceUser?.cce_primary_user_mobile || '-';
                    })()}
                </td>
                <td class="hindi">${correction.issue_type || '-'}</td>
                <td>
                    <span class="status-indicator ${correction.correction_status === 'corrected' ? 'active' : 'pending'}">
                        <i class="fas fa-${correction.correction_status === 'corrected' ? 'check' : 'clock'}"></i>
                        ${correction.correction_status === 'corrected' ? 'Corrected' : 'Pending'}
                    </span>
                </td>
                <td>${formatDate(correction.created_at)}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Filter PMFBY Data
function filterPMFBYData() {
    const districtFilter = document.getElementById('pmfbyDistrictFilter').value;
    const statusFilter = document.getElementById('pmfbyStatusFilter').value;
    
    filteredPMFBYData = pmfbyAdminReportData.filter(admin => {
        const matchesDistrict = !districtFilter || admin.district_name === districtFilter;
        const matchesStatus = !statusFilter || admin.status === statusFilter;
        
        return matchesDistrict && matchesStatus;
    });
    
    displayPMFBYAdminReport();
    showAlert(`PMFBY Filter applied: ${filteredPMFBYData.length} records found.`, 'info');
}

// Filter CCE Admin Data
function filterCCEAdminData() {
    const districtFilter = document.getElementById('cceDistrictFilter').value;
    const statusFilter = document.getElementById('cceStatusFilter').value;
    
    filteredCCEAdminData = cceAdminReportData.filter(admin => {
        const matchesDistrict = !districtFilter || admin.district_name === districtFilter;
        const matchesStatus = !statusFilter || admin.status === statusFilter;
        
        return matchesDistrict && matchesStatus;
    });
    
    displayCCEAdminReport();
    showAlert(`CCE Admin Filter applied: ${filteredCCEAdminData.length} records found.`, 'info');
}

// Filter CCE Primary Data
function filterCCEPrimaryData() {
    const districtFilter = document.getElementById('ccePrimaryDistrictFilter').value;
    const tehsilFilter = document.getElementById('ccePrimaryTehsilFilter').value;
    
    filteredCCEPrimaryData = ccePrimaryReportData.filter(user => {
        const matchesDistrict = !districtFilter || user.district_name === districtFilter;
        const matchesTehsil = !tehsilFilter || user.tehsil_name === tehsilFilter;
        
        return matchesDistrict && matchesTehsil;
    });
    
    displayCCEPrimaryReport();
    showAlert(`CCE Primary Filter applied: ${filteredCCEPrimaryData.length} records found.`, 'info');
}

// Filter Hierarchy Data
function filterHierarchyData() {
    const districtFilter = document.getElementById('hierarchyDistrictFilter').value;
    const statusFilter = document.getElementById('hierarchyStatusFilter').value;
    
    filteredHierarchyData = hierarchyReportData.filter(correction => {
        const matchesDistrict = !districtFilter || correction.district_name === districtFilter;
        const matchesStatus = !statusFilter || correction.correction_status === statusFilter;
        
        return matchesDistrict && matchesStatus;
    });
    
    displayHierarchyReport();
    showAlert(`Hierarchy Filter applied: ${filteredHierarchyData.length} records found.`, 'info');
}

// Export PMFBY Data
function exportPMFBYData(format) {
    if (filteredPMFBYData.length === 0) {
        showAlert('Export के लिए कोई PMFBY डेटा नहीं मिला।', 'warning');
        return;
    }
    
    const exportData = filteredPMFBYData.map(admin => ({
        'District': admin.district_name,
        'Admin Name': admin.admin_name,
        'Post Name': admin.post_name,
        'Mobile Number': admin.mobile_number,
        'Status': admin.status,
        'Last Updated': formatDateTime(admin.updated_at),
        'Updated By': admin.test_users?.full_name || admin.test_users?.username || 'System'
    }));
    
    if (format === 'excel') {
        exportToExcel(exportData, 'PMFBY_District_Admin_Report', 'PMFBY Admins');
    } else if (format === 'pdf') {
        const columns = [
            { key: 'District', label: 'District' },
            { key: 'Admin Name', label: 'Admin Name' },
            { key: 'Post Name', label: 'Post Name' },
            { key: 'Mobile Number', label: 'Mobile' },
            { key: 'Status', label: 'Status' },
            { key: 'Last Updated', label: 'Updated' },
            { key: 'Updated By', label: 'Updated By' }
        ];
        
        exportToPDF(exportData, 'PMFBY_District_Admin_Report', 
            'PMFBY District Admin Complete Report', columns);
    }
}

// Export CCE Admin Data
function exportCCEAdminData(format) {
    if (filteredCCEAdminData.length === 0) {
        showAlert('Export के लिए कोई CCE Admin डेटा नहीं मिला।', 'warning');
        return;
    }
    
    const exportData = filteredCCEAdminData.map(admin => ({
        'District': admin.district_name,
        'Admin Name': admin.admin_name,
        'Post Name': admin.post_name,
        'Mobile Number': admin.mobile_number,
        'Status': admin.status,
        'Last Updated': formatDateTime(admin.updated_at),
        'Updated By': admin.test_users?.full_name || admin.test_users?.username || 'System'
    }));
    
    if (format === 'excel') {
        exportToExcel(exportData, 'CCE_District_Admin_Report', 'CCE Admins');
    } else if (format === 'pdf') {
        const columns = [
            { key: 'District', label: 'District' },
            { key: 'Admin Name', label: 'Admin Name' },
            { key: 'Post Name', label: 'Post Name' },
            { key: 'Mobile Number', label: 'Mobile' },
            { key: 'Status', label: 'Status' },
            { key: 'Last Updated', label: 'Updated' },
            { key: 'Updated By', label: 'Updated By' }
        ];
        
        exportToPDF(exportData, 'CCE_District_Admin_Report', 
            'CCE District Admin Complete Report', columns);
    }
}

// Export CCE Primary Data
function exportCCEPrimaryData(format) {
    if (filteredCCEPrimaryData.length === 0) {
        showAlert('Export के लिए कोई CCE Primary डेटा नहीं मिला।', 'warning');
        return;
    }
    
    const exportData = filteredCCEPrimaryData.map(user => {
        const villagesCorrected = hierarchyReportData.filter(h => 
            h.district_name === user.district_name && 
            h.user_id === user.user_id
        ).length;
        
        return {
            'District': user.district_name,
            'Tehsil': user.tehsil_name,
            'RI Name': user.ri_name,
            'CCE Primary User Name': user.cce_primary_user_name,
            'Mobile Number': user.cce_primary_user_mobile,
            'Total CCE Users': user.total_cce_users,
            'Active Users': user.active_cce_users,
            'Inactive Users': user.inactive_cce_users,
            'Hierarchy OK Count': user.hierarchy_ok_count,
            'Hierarchy Issue Count': user.hierarchy_issue_count,
            'Villages Corrected': villagesCorrected,
            'Submission Date': formatDate(user.created_at)
        };
    });
    
    if (format === 'excel') {
        exportToExcel(exportData, 'CCE_Primary_User_Complete_Report', 'CCE Primary Users');
    } else if (format === 'pdf') {
        const columns = [
            { key: 'District', label: 'District' },
            { key: 'Tehsil', label: 'Tehsil' },
            { key: 'RI Name', label: 'RI Name' },
            { key: 'CCE Primary User Name', label: 'User Name' },
            { key: 'Mobile Number', label: 'Mobile' },
            { key: 'Total CCE Users', label: 'Total' },
            { key: 'Active Users', label: 'Active' },
            { key: 'Hierarchy Issue Count', label: 'Issues' },
            { key: 'Villages Corrected', label: 'Corrected' },
            { key: 'Submission Date', label: 'Date' }
        ];
        
        exportToPDF(exportData, 'CCE_Primary_User_Complete_Report', 
            'CCE Primary User Complete Report', columns);
    }
}

// Export Hierarchy Data
function exportHierarchyData(format) {
    if (filteredHierarchyData.length === 0) {
        showAlert('Export के लिए कोई Hierarchy डेटा नहीं मिला।', 'warning');
        return;
    }
    
    const exportData = filteredHierarchyData.map(correction => {
        const cceUser = ccePrimaryReportData.find(u => u.user_id === correction.user_id);
        
        return {
            'District': correction.district_name,
            'Original Level4 Name': correction.original_level4name,
            'Corrected Level4 Name': correction.corrected_level4name,
            'Original Level5 Name': correction.original_level5name,
            'Corrected Level5 Name': correction.corrected_level5name,
            'Original Level6 Code': correction.original_level6code,
            'Corrected Level6 Code': correction.corrected_level6code,
            'Village Name': correction.original_villagename,
            'Village Code': correction.original_villagecode,
            'CCE Primary User Name': cceUser?.cce_primary_user_name || '-',
            'CCE Mobile Number': cceUser?.cce_primary_user_mobile || '-',
            'Issue Type': correction.issue_type,
            'Correction Status': correction.correction_status,
            'Corrected Date': formatDate(correction.created_at)
        };
    });
    
    if (format === 'excel') {
        exportToExcel(exportData, 'Hierarchy_Correction_Complete_Report', 'Hierarchy Corrections');
    } else if (format === 'pdf') {
        const columns = [
            { key: 'District', label: 'District' },
            { key: 'Original Level4 Name', label: 'Orig L4' },
            { key: 'Corrected Level4 Name', label: 'Corr L4' },
            { key: 'Original Level5 Name', label: 'Orig L5' },
            { key: 'Corrected Level5 Name', label: 'Corr L5' },
            { key: 'Village Name', label: 'Village' },
            { key: 'Village Code', label: 'Code' },
            { key: 'CCE Primary User Name', label: 'User' },
            { key: 'Issue Type', label: 'Issue' },
            { key: 'Correction Status', label: 'Status' },
            { key: 'Corrected Date', label: 'Date' }
        ];
        
        exportToPDF(exportData, 'Hierarchy_Correction_Complete_Report', 
            'Hierarchy Correction Complete Report', columns);
    }
}

// Back to dashboard
function backToDashboard() {
    // Determine which dashboard to go back to based on user role
    if (currentUser.role === 'pmfby_admin') {
        window.location.href = 'pmfby-admin-dashboard.html';
    } else if (currentUser.role === 'cce_admin') {
        window.location.href = 'cce-admin-dashboard.html';
    } else if (currentUser.role === 'cce_primary') {
        window.location.href = 'cce-primary-dashboard.html';
    } else {
        // Default to login if role is not recognized
        window.location.href = 'login.html';
    }
}

// Initialize event listeners
function initializeReportsEventListeners() {
    // Back to dashboard button
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            backToDashboard();
        });
    }
    
    // Filter buttons - using global functions defined in HTML onclick
    // These are already handled by the onclick attributes in HTML
    
    // Auto-refresh every 5 minutes
    setInterval(async () => {
        console.log('Auto-refreshing reports data...');
        await initializeAdminReports();
    }, 300000); // 5 minutes
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Reports - DOM Content Loaded');
    
    // Wait for authentication check
    setTimeout(() => {
        if (currentUser) {
            initializeAdminReports();
            initializeReportsEventListeners();
        }
    }, 500);
});

// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   Admin Reports Dashboard                    ║
║                   संपूर्ण प्रशासनिक रिपोर्ट                    ║
║                                                              ║
║  📊 PMFBY District Admin Reports                            ║
║  🌾 CCE District Admin Reports                              ║
║  👥 CCE Primary User Complete Reports                       ║
║  🗂️ Hierarchy Correction Reports                            ║
║  📈 Real-time Data & Statistics                             ║
║  📋 Advanced Filtering & Export                             ║
║                                                              ║
║  Admin Reports module loaded successfully!                  ║
╚══════════════════════════════════════════════════════════════╝
`);

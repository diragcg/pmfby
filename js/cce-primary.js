// cce-primary.js - CCE Primary User management

// Global variables
let villageHierarchyData = [];
let selectedVillages = [];
let hierarchyCorrectionData = [];
let mySubmissionsData = [];
let isHierarchyIssueMode = false;

// Initialize CCE Primary User Dashboard
async function initializeCCEPrimary() {
    try {
        showLoading('CCE Primary User डेटा लोड हो रहा है...');
        
        // Load village hierarchy data
        await loadVillageHierarchyData();
        
        // Load my submissions
        await loadMySubmissions();
        
        hideLoading();
        
    } catch (error) {
        console.error('CCE Primary initialization error:', error);
        showAlert('CCE Primary User डेटा लोड करने में त्रुटि।', 'danger');
        hideLoading();
    }
}

// Load village hierarchy data for the district
async function loadVillageHierarchyData() {
    try {
        if (!currentUser || !currentUser.districtName) {
            throw new Error('User district information not available');
        }
        
        villageHierarchyData = await loadVillageHierarchy(currentUser.districtName);
        
        console.log('Loaded village hierarchy data:', villageHierarchyData.length, 'records');
        
        if (villageHierarchyData.length === 0) {
            showAlert(`जिला "${currentUser.districtName}" के लिए कोई hierarchy डेटा नहीं मिला।`, 'warning');
            return;
        }
        
        // Populate tehsil dropdown
        populateTehsilDropdown();
        
    } catch (error) {
        console.error('Error loading village hierarchy:', error);
        showAlert('Village hierarchy डेटा लोड करने में त्रुटि।', 'danger');
    }
}

// Populate tehsil dropdown
function populateTehsilDropdown() {
    const tehsilOptions = getUniqueValues(villageHierarchyData, 'level4name');
    populateDropdown('tehsilSelect', tehsilOptions, '-- तहसील चुनें --');
    
    console.log('Tehsil options loaded:', tehsilOptions.length);
}

// Handle tehsil selection
function handleTehsilChange() {
    const tehsilSelect = document.getElementById('tehsilSelect');
    const riSelect = document.getElementById('riSelect');
    const selectedTehsil = tehsilSelect.value;
    
    // Update breadcrumb
    document.getElementById('breadcrumbTehsil').textContent = selectedTehsil || '-';
    document.getElementById('breadcrumbRI').textContent = '-';
    
    // Reset RI dropdown and hide sections
    riSelect.innerHTML = '<option value="">-- RI चुनें --</option>';
    riSelect.disabled = !selectedTehsil;
    hideCCESections();
    
    if (!selectedTehsil) return;
    
    // Get unique RI names for selected tehsil
    const riOptions = getUniqueValues(
        villageHierarchyData.filter(item => item.level4name === selectedTehsil),
        'level5name'
    );
    
    // Populate RI dropdown
    riOptions.forEach(ri => {
        const option = document.createElement('option');
        option.value = ri;
        option.textContent = ri;
        riSelect.appendChild(option);
    });
    
    console.log('RI options loaded:', riOptions.length);
}

// Handle RI selection
function handleRIChange() {
    const tehsilSelect = document.getElementById('tehsilSelect');
    const riSelect = document.getElementById('riSelect');
    const selectedTehsil = tehsilSelect.value;
    const selectedRI = riSelect.value;
    
    // Update breadcrumb
    document.getElementById('breadcrumbRI').textContent = selectedRI || '-';
    
    if (!selectedTehsil || !selectedRI) {
        hideCCESections();
        return;
    }
    
    // Show CCE count section
    showCCECountSection();
    
    // Load villages for hierarchy issues
    loadVillagesForHierarchy(selectedTehsil, selectedRI);
}

// Show CCE count section
function showCCECountSection() {
    document.getElementById('cceCountSection').style.display = 'block';
    
    // Scroll to section
    document.getElementById('cceCountSection').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// Hide all CCE sections
function hideCCESections() {
    document.getElementById('cceCountSection').style.display = 'none';
    document.getElementById('hierarchyIssuesSection').style.display = 'none';
    document.getElementById('hierarchyCorrectionSection').style.display = 'none';
    selectedVillages = [];
    hierarchyCorrectionData = [];
    isHierarchyIssueMode = false;
}

// Handle hierarchy issue count change
function handleHierarchyIssueCountChange() {
    const hierarchyIssueCount = parseInt(document.getElementById('hierarchyIssueCount').value || '0');
    
    if (hierarchyIssueCount > 0) {
        document.getElementById('hierarchyIssuesSection').style.display = 'block';
        isHierarchyIssueMode = true;
    } else {
        document.getElementById('hierarchyIssuesSection').style.display = 'none';
        document.getElementById('hierarchyCorrectionSection').style.display = 'none';
        isHierarchyIssueMode = false;
        selectedVillages = [];
        hierarchyCorrectionData = [];
    }
}

// Load villages for hierarchy selection
function loadVillagesForHierarchy(tehsil, ri) {
    const villages = villageHierarchyData.filter(item => 
        item.level4name === tehsil && 
        item.level5name === ri &&
        item.villagename && 
        item.villagecode
    );
    
    // Remove duplicates based on village code
    const uniqueVillages = villages.filter((village, index, self) =>
        index === self.findIndex(v => v.villagecode === village.villagecode)
    ).sort((a, b) => a.villagename.localeCompare(b.villagename));
    
    displayVillagesList(uniqueVillages);
}

// Display villages list for selection
function displayVillagesList(villages) {
    const villagesList = document.getElementById('villagesList');
    
    if (villages.length === 0) {
        villagesList.innerHTML = '<div class="text-center text-muted hindi">कोई गांव नहीं मिला</div>';
        return;
    }
    
    let villagesHTML = '';
    villages.forEach(village => {
        villagesHTML += `
            <div class="village-item" data-village-code="${village.villagecode}" onclick="toggleVillageSelection('${village.villagecode}', '${village.villagename}', this)">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong class="hindi">${village.villagename}</strong>
                        <br>
                        <small class="text-muted">Code: ${village.villagecode}</small>
                    </div>
                    <div>
                        <i class="fas fa-plus-circle text-primary"></i>
                    </div>
                </div>
            </div>
        `;
    });
    
    villagesList.innerHTML = villagesHTML;
}

// Toggle village selection
function toggleVillageSelection(villageCode, villageName, element) {
    const isSelected = element.classList.contains('selected');
    
    if (isSelected) {
        // Remove from selection
        element.classList.remove('selected');
        element.querySelector('i').className = 'fas fa-plus-circle text-primary';
        
        selectedVillages = selectedVillages.filter(v => v.villagecode !== villageCode);
        
    } else {
        // Add to selection
        element.classList.add('selected');
        element.querySelector('i').className = 'fas fa-check-circle text-success';
        
        const villageData = villageHierarchyData.find(v => v.villagecode === villageCode);
        if (villageData) {
            selectedVillages.push(villageData);
        }
    }
    
    updateSelectedVillagesList();
    
    // Show hierarchy correction section if villages are selected
    if (selectedVillages.length > 0) {
        showHierarchyCorrectionSection();
    } else {
        document.getElementById('hierarchyCorrectionSection').style.display = 'none';
    }
}

// Update selected villages list display
function updateSelectedVillagesList() {
    const selectedVillagesList = document.getElementById('selectedVillagesList');
    
    if (selectedVillages.length === 0) {
        selectedVillagesList.innerHTML = '<div class="text-muted hindi">कोई village चयनित नहीं है</div>';
        return;
    }
    
    let selectedHTML = '';
    selectedVillages.forEach(village => {
        selectedHTML += `
            <div class="selected-village-item p-2 mb-2" style="background: var(--alert-warning-bg); border-radius: 5px; border-left: 3px solid var(--alert-warning-border);">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong class="hindi">${village.villagename}</strong>
                        <br>
                        <small>Code: ${village.villagecode}</small>
                    </div>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeVillageSelection('${village.villagecode}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    selectedVillagesList.innerHTML = selectedHTML;
}

// Remove village from selection
function removeVillageSelection(villageCode) {
    selectedVillages = selectedVillages.filter(v => v.villagecode !== villageCode);
    
    // Update UI
    const villageElement = document.querySelector(`[data-village-code="${villageCode}"]`);
    if (villageElement) {
        villageElement.classList.remove('selected');
        villageElement.querySelector('i').className = 'fas fa-plus-circle text-primary';
    }
    
    updateSelectedVillagesList();
    
    if (selectedVillages.length === 0) {
        document.getElementById('hierarchyCorrectionSection').style.display = 'none';
    } else {
        showHierarchyCorrectionSection();
    }
}

// Show hierarchy correction section
function showHierarchyCorrectionSection() {
    document.getElementById('hierarchyCorrectionSection').style.display = 'block';
    generateHierarchyCorrectionForms();
    
    // Scroll to section
    document.getElementById('hierarchyCorrectionSection').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// Generate hierarchy correction forms for selected villages
function generateHierarchyCorrectionForms() {
    const container = document.getElementById('hierarchyCorrectionContainer');
    
    let formsHTML = '';
    selectedVillages.forEach(village => {
        formsHTML += `
            <div class="hierarchy-correction-form mb-4" data-village-code="${village.villagecode}">
                <h6 class="hindi mb-3" style="color: var(--primary-brand-medium);">
                    <i class="fas fa-map-marker-alt me-2"></i>
                    ${village.villagename} (${village.villagecode}) - Hierarchy Correction
                </h6>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label hindi">District Name Status</label>
                        <div class="hierarchy-field">
                            <div class="d-flex align-items-center mb-2">
                                <strong>Current:</strong> 
                                <span class="ms-2">${village.districtname}</span>
                                <span class="hierarchy-status match ms-2" id="districtStatus_${village.villagecode}">
                                    <i class="fas fa-check"></i> Match
                                </span>
                            </div>
                            <select class="form-select" id="correctDistrict_${village.villagecode}" style="display: none;">
                                <option value="">-- सही District चुनें --</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label class="form-label hindi">Level 4 Name (Tehsil)</label>
                        <div class="hierarchy-field">
                            <div class="d-flex align-items-center mb-2">
                                <strong>Current:</strong> 
                                <span class="ms-2">${village.level4name}</span>
                            </div>
                            <select class="form-select" id="correctLevel4_${village.villagecode}">
                                <option value="">-- सही Level 4 चुनें --</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label class="form-label hindi">Level 5 Name (RI)</label>
                        <div class="hierarchy-field">
                            <div class="d-flex align-items-center mb-2">
                                <strong>Current:</strong> 
                                <span class="ms-2">${village.level5name}</span>
                            </div>
                            <select class="form-select" id="correctLevel5_${village.villagecode}">
                                <option value="">-- सही Level 5 चुनें --</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label class="form-label hindi">Level 6 Code</label>
                        <div class="hierarchy-field">
                            <div class="d-flex align-items-center mb-2">
                                <strong>Current:</strong> 
                                <span class="ms-2">${village.level6code || 'N/A'}</span>
                            </div>
                            <input type="text" class="form-control" id="correctLevel6_${village.villagecode}" placeholder="सही Level 6 Code दर्ज करें">
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = formsHTML;
    
    // Populate correction dropdowns
    selectedVillages.forEach(village => {
        populateHierarchyCorrectionDropdowns(village);
    });
    
    document.getElementById('hierarchyActions').style.display = 'block';
}

// Populate hierarchy correction dropdowns
function populateHierarchyCorrectionDropdowns(village) {
    // Check if district matches
    const isDistrictMatch = village.districtname === currentUser.districtName;
    const districtStatus = document.getElementById(`districtStatus_${village.villagecode}`);
    const correctDistrictSelect = document.getElementById(`correctDistrict_${village.villagecode}`);
    
    if (isDistrictMatch) {
        districtStatus.className = 'hierarchy-status match ms-2';
        districtStatus.innerHTML = '<i class="fas fa-check"></i> Match';
        correctDistrictSelect.style.display = 'none';
    } else {
        districtStatus.className = 'hierarchy-status no-match ms-2';
        districtStatus.innerHTML = '<i class="fas fa-times"></i> No Match';
        correctDistrictSelect.style.display = 'block';
        
        // Populate district options
        const districtOptions = getUniqueValues(villageHierarchyData, 'districtname');
        populateDropdown(`correctDistrict_${village.villagecode}`, districtOptions, '-- सही District चुनें --');
    }
    
    // Populate Level 4 options
    const level4Options = getUniqueValues(villageHierarchyData, 'level4name');
    populateDropdown(`correctLevel4_${village.villagecode}`, level4Options, '-- सही Level 4 चुनें --');
    
    // Populate Level 5 options
    const level5Options = getUniqueValues(villageHierarchyData, 'level5name');
    populateDropdown(`correctLevel5_${village.villagecode}`, level5Options, '-- सही Level 5 चुनें --');
}

// Search villages
function searchVillages() {
    const searchTerm = document.getElementById('villageSearchInput').value.toLowerCase();
    const villageItems = document.querySelectorAll('.village-item');
    
    villageItems.forEach(item => {
        const villageName = item.querySelector('strong').textContent.toLowerCase();
        const villageCode = item.querySelector('small').textContent.toLowerCase();
        
        if (villageName.includes(searchTerm) || villageCode.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Save CCE count data
async function saveCCECountData() {
    try {
        setButtonLoading('saveCountsBtn', true, 'सेव हो रहा है...');
        
        // Get form data
        const formData = {
            district_name: currentUser.districtName,
            tehsil_name: document.getElementById('tehsilSelect').value,
            ri_name: document.getElementById('riSelect').value,
            cce_primary_user_name: document.getElementById('ccePrimaryUserName').value.trim(),
            cce_primary_user_mobile: document.getElementById('ccePrimaryUserMobile').value.trim(),
            total_cce_users: parseInt(document.getElementById('totalCCEUsers').value || '0'),
            active_cce_users: parseInt(document.getElementById('activeCCEUsers').value || '0'),
            inactive_cce_users: parseInt(document.getElementById('inactiveCCEUsers').value || '0'),
            hierarchy_ok_count: parseInt(document.getElementById('hierarchyOKCount').value || '0'),
            hierarchy_issue_count: parseInt(document.getElementById('hierarchyIssueCount').value || '0'),
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('cce_primary_users_data')
            .insert([formData])
            .select()
            .single();
        
        if (error) throw error;
        
        // If hierarchy issues exist, save hierarchy corrections
        if (isHierarchyIssueMode && selectedVillages.length > 0) {
            await saveHierarchyCorrections(data.id);
        }
        
        showAlert('CCE Primary User डेटा सफलतापूर्वक सेव हो गया।', 'success');
        
        // Reset form and reload submissions
        resetCCEForm();
        await loadMySubmissions();
        
    } catch (error) {
        console.error('Error saving CCE count data:', error);
        showAlert('CCE डेटा सेव करने में त्रुटि: ' + error.message, 'danger');
    } finally {
        setButtonLoading('saveCountsBtn', false);
    }
}

// Save hierarchy corrections
async function saveHierarchyCorrections(cceDataId) {
    try {
        const hierarchyCorrections = [];
        
        selectedVillages.forEach(village => {
            const correctionData = {
                cce_data_id: cceDataId,
                district_name: currentUser.districtName,
                original_districtname: village.districtname,
                original_level4name: village.level4name,
                original_level5name: village.level5name,
                original_level6code: village.level6code,
                original_villagename: village.villagename,
                original_villagecode: village.villagecode,
                corrected_districtname: document.getElementById(`correctDistrict_${village.villagecode}`)?.value || village.districtname,
                corrected_level4name: document.getElementById(`correctLevel4_${village.villagecode}`).value || village.level4name,
                corrected_level5name: document.getElementById(`correctLevel5_${village.villagecode}`).value || village.level5name,
                corrected_level6code: document.getElementById(`correctLevel6_${village.villagecode}`).value || village.level6code,
                issue_type: village.districtname !== currentUser.districtName ? 'District Mismatch' : 'Hierarchy Issue',
                correction_status: 'corrected',
                user_id: currentUser.id,
                created_at: new Date().toISOString()
            };
            
            hierarchyCorrections.push(correctionData);
        });
        
        const { error } = await supabaseClient
            .from('hierarchy_correction_log')
            .insert(hierarchyCorrections);
        
        if (error) throw error;
        
        console.log('Hierarchy corrections saved:', hierarchyCorrections.length);
        
    } catch (error) {
        console.error('Error saving hierarchy corrections:', error);
        throw error;
    }
}

// Validate CCE form
function validateCCEForm() {
    const totalUsers = parseInt(document.getElementById('totalCCEUsers').value || '0');
    const activeUsers = parseInt(document.getElementById('activeCCEUsers').value || '0');
    const inactiveUsers = parseInt(document.getElementById('inactiveCCEUsers').value || '0');
    const hierarchyOK = parseInt(document.getElementById('hierarchyOKCount').value || '0');
    const hierarchyIssue = parseInt(document.getElementById('hierarchyIssueCount').value || '0');
    
    // Check if total equals active + inactive
    if (totalUsers !== (activeUsers + inactiveUsers)) {
        showAlert('कुल CCE Users संख्या, Active और Inactive Users के योग के बराबर होनी चाहिए।', 'warning');
        return false;
    }
    
    // Check if hierarchy counts match total
    if (totalUsers !== (hierarchyOK + hierarchyIssue)) {
        showAlert('कुल CCE Users संख्या, Hierarchy OK और Issue Count के योग के बराबर होनी चाहिए।', 'warning');
        return false;
    }
    
    // If hierarchy issues exist, check if villages are selected
    if (hierarchyIssue > 0 && selectedVillages.length === 0) {
        showAlert('Hierarchy Issue Count > 0 है, कृपया समस्याग्रस्त villages का चयन करें।', 'warning');
        return false;
    }
    
    return true;
}

// Reset CCE form
function resetCCEForm() {
    document.getElementById('cceCountForm').reset();
    document.getElementById('tehsilSelect').value = '';
    document.getElementById('riSelect').value = '';
    document.getElementById('riSelect').disabled = true;
    
    // Update breadcrumb
    document.getElementById('breadcrumbTehsil').textContent = '-';
    document.getElementById('breadcrumbRI').textContent = '-';
    
    // Hide sections
    hideCCESections();
    
    // Clear form errors
    clearAllFieldErrors('cceCountForm');
    
    showAlert('फॉर्म रीसेट हो गया।', 'info');
}

// Load my submissions
async function loadMySubmissions() {
    try {
        const { data, error } = await supabaseClient
            .from('cce_primary_users_data')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        mySubmissionsData = data || [];
        console.log('Loaded my submissions:', mySubmissionsData.length);
        
    } catch (error) {
        console.error('Error loading my submissions:', error);
        mySubmissionsData = [];
    }
}

// Show my submissions section
function showMySubmissions() {
    document.getElementById('mySubmissionsSection').style.display = 'block';
    displayMySubmissions();
    
    // Hide other sections
    document.getElementById('cceCountSection').style.display = 'none';
    document.getElementById('hierarchyIssuesSection').style.display = 'none';
    document.getElementById('hierarchyCorrectionSection').style.display = 'none';
}

// Display my submissions
function displayMySubmissions() {
    const tableBody = document.getElementById('mySubmissionsTableBody');
    
    if (mySubmissionsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center hindi">कोई submission नहीं मिली</td></tr>';
        return;
    }
    
    let tableHTML = '';
    mySubmissionsData.forEach(submission => {
        tableHTML += `
            <tr>
                <td>${formatDate(submission.created_at)}</td>
                <td class="hindi">${submission.tehsil_name}</td>
                <td class="hindi">${submission.ri_name}</td>
                <td>${submission.total_cce_users}</td>
                <td>${submission.active_cce_users}</td>
                <td>${submission.hierarchy_issue_count}</td>
                <td>-</td>
                <td>
                    <span class="status-indicator active">
                        <i class="fas fa-check"></i> Submitted
                    </span>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Export my data
function exportMyData(format) {
    if (mySubmissionsData.length === 0) {
        showAlert('Export के लिए कोई डेटा नहीं मिला।', 'warning');
        return;
    }
    
    const exportData = mySubmissionsData.map(item => ({
        'District': item.district_name,
        'Tehsil': item.tehsil_name,
        'RI Name': item.ri_name,
        'CCE Primary User Name': item.cce_primary_user_name,
        'Mobile Number': item.cce_primary_user_mobile,
        'Total CCE Users': item.total_cce_users,
        'Active Users': item.active_cce_users,
        'Inactive Users': item.inactive_cce_users,
        'Hierarchy OK': item.hierarchy_ok_count,
        'Hierarchy Issues': item.hierarchy_issue_count,
        'Submission Date': formatDate(item.created_at)
    }));
    
    if (format === 'excel') {
        exportToExcel(exportData, 'CCE_Primary_User_Submissions', 'My Submissions');
    } else if (format === 'pdf') {
        const columns = [
            { key: 'District', label: 'District' },
            { key: 'Tehsil', label: 'Tehsil' },
            { key: 'RI Name', label: 'RI Name' },
            { key: 'CCE Primary User Name', label: 'User Name' },
            { key: 'Total CCE Users', label: 'Total Users' },
            { key: 'Active Users', label: 'Active' },
            { key: 'Hierarchy Issues', label: 'Issues' },
            { key: 'Submission Date', label: 'Date' }
        ];
        
        exportToPDF(exportData, 'CCE_Primary_User_Submissions', 
            'CCE Primary User Submissions Report', columns);
    }
}

// Initialize event listeners
function initializeCCEPrimaryEventListeners() {
    // Location selection
    const tehsilSelect = document.getElementById('tehsilSelect');
    const riSelect = document.getElementById('riSelect');
    
    if (tehsilSelect) {
        tehsilSelect.addEventListener('change', handleTehsilChange);
    }
    
    if (riSelect) {
        riSelect.addEventListener('change', handleRIChange);
    }
    
    // Hierarchy issue count change
    const hierarchyIssueCount = document.getElementById('hierarchyIssueCount');
    if (hierarchyIssueCount) {
        hierarchyIssueCount.addEventListener('input', handleHierarchyIssueCountChange);
    }
    
    // Village search
    const villageSearchInput = document.getElementById('villageSearchInput');
    if (villageSearchInput) {
        villageSearchInput.addEventListener('input', debounce(searchVillages, 300));
    }
    
    // Form buttons
    const resetCountsBtn = document.getElementById('resetCountsBtn');
    if (resetCountsBtn) {
        resetCountsBtn.addEventListener('click', resetCCEForm);
    }
    
    const resetHierarchyBtn = document.getElementById('resetHierarchyBtn');
    if (resetHierarchyBtn) {
        resetHierarchyBtn.addEventListener('click', () => {
            selectedVillages = [];
            updateSelectedVillagesList();
            document.getElementById('hierarchyCorrectionSection').style.display = 'none';
            
            // Reset village selections in UI
            const selectedItems = document.querySelectorAll('.village-item.selected');
            selectedItems.forEach(item => {
                item.classList.remove('selected');
                item.querySelector('i').className = 'fas fa-plus-circle text-primary';
            });
        });
    }
    
    // My submissions button
    const mySubmissionsBtn = document.getElementById('mySubmissionsBtn');
    if (mySubmissionsBtn) {
        mySubmissionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMySubmissions();
        });
    }
    
    // Form submission
    handleFormSubmission('cceCountForm', saveCCECountData, validateCCEForm);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('CCE Primary User Dashboard - DOM Content Loaded');
    
    // Wait for authentication check
    setTimeout(() => {
        if (currentUser) {
            initializeCCEPrimary();
            initializeCCEPrimaryEventListeners();
        }
    }, 500);
});

// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   CCE Primary User Dashboard                 ║
║                   Crop Cutting Experiment                    ║
║                                                              ║
║  🌾 CCE Primary User Management                             ║
║  📊 User Count Declaration                                  ║
║  🗂️ Hierarchy Validation & Correction                       ║
║  📋 Village Selection & Mapping                             ║
║  📈 Personal Submissions Tracking                          ║
║                                                              ║
║  CCE Primary User module loaded successfully!               ║
╚══════════════════════════════════════════════════════════════╝
`);

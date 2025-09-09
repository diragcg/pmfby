// admin-management-primary.js - CCE Primary User specific functions

// Global variables for CCE Primary
let villageHierarchyData = [];
let selectedVillages = [];
let ccePrimarySubmissions = [];

// Initialize CCE Primary Section
async function initializeCCEPrimary() {
    try {
        showLoading('CCE Primary User डेटा लोड हो रहा है...');
        
        // Load village hierarchy data
        await loadVillageHierarchyForPrimary();
        
        // Load CCE Primary submissions
        await loadCCEPrimarySubmissions();
        
        // Initialize event listeners
        initializeCCEPrimaryEventListeners();
        
        hideLoading();
        
    } catch (error) {
        console.error('CCE Primary initialization error:', error);
        showAlert('CCE Primary User डेटा लोड करने में त्रुटि।', 'danger');
        hideLoading();
    }
}

// Load village hierarchy data for the CCE Primary user's district
async function loadVillageHierarchyForPrimary() {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        
        const userDistrict = currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname;
        if (!userDistrict) {
            throw new Error('User district not found');
        }
        
        villageHierarchyData = await loadVillageHierarchy(userDistrict); // Using global loadVillageHierarchy from core.js
        
        console.log('CCE Primary - Village hierarchy loaded:', villageHierarchyData.length, 'records');
        
        if (villageHierarchyData.length === 0) {
            showAlert(`जिला "${userDistrict}" के लिए कोई hierarchy डेटा नहीं मिला।`, 'warning');
            return;
        }
        
        // Populate tehsil dropdown
        populateTehsilDropdownForPrimary();
        
    } catch (error) {
        console.error('CCE Primary - Error loading village hierarchy:', error);
        showAlert('CCE Primary - Village hierarchy लोड करने में त्रुटि: ' + error.message, 'danger');
    }
}

// Populate tehsil dropdown for CCE Primary section
function populateTehsilDropdownForPrimary() {
    const tehsilSelect = document.getElementById('tehsilSelect');
    if (!tehsilSelect) return;
    
    // Get unique tehsil names
    const tehsilOptions = getUniqueValues(villageHierarchyData, 'level4name'); // Using global getUniqueValues from core.js
    populateDropdown('tehsilSelect', tehsilOptions, '-- तहसील चुनें --'); // Using global populateDropdown from core.js
    
    console.log('CCE Primary - Tehsil options loaded:', tehsilOptions.length);
}

// Handle tehsil selection for CCE Primary section
function handleTehsilChangeForPrimary() {
    const tehsilSelect = document.getElementById('tehsilSelect');
    const riSelect = document.getElementById('riSelect');
    const selectedTehsil = tehsilSelect.value;
    
    // Update breadcrumb
    document.getElementById('breadcrumbTehsil').textContent = selectedTehsil || '-';
    document.getElementById('breadcrumbRI').textContent = '-';
    
    // Reset RI dropdown
    riSelect.innerHTML = '<option value="">-- RI चुनें --</option>';
    riSelect.disabled = !selectedTehsil;
    
    // Hide CCE sections
    document.getElementById('cceCountSection').style.display = 'none';
    document.getElementById('hierarchyIssuesSection').style.display = 'none';
    selectedVillages = []; // Clear selected villages on tehsil change
    updateSelectedVillagesList();
    
    if (!selectedTehsil) return;
    
    // Get unique RI names for selected tehsil
    const riOptions = getUniqueValues(
        villageHierarchyData.filter(item => item.level4name === selectedTehsil),
        'level5name'
    );
    
    // Populate RI dropdown
    populateDropdown('riSelect', riOptions, '-- RI चुनें --');
    
    console.log('CCE Primary - RI options loaded:', riOptions.length);
}

// Handle RI selection for CCE Primary section
function handleRIChangeForPrimary() {
    const tehsilSelect = document.getElementById('tehsilSelect');
    const riSelect = document.getElementById('riSelect');
    const selectedTehsil = tehsilSelect.value;
    const selectedRI = riSelect.value;
    
    // Update breadcrumb
    document.getElementById('breadcrumbRI').textContent = selectedRI || '-';
    
    if (!selectedTehsil || !selectedRI) {
        document.getElementById('cceCountSection').style.display = 'none';
        document.getElementById('hierarchyIssuesSection').style.display = 'none';
        selectedVillages = []; // Clear selected villages on RI change
        updateSelectedVillagesList();
        return;
    }
    
    // Show CCE count section
    document.getElementById('cceCountSection').style.display = 'block';
    
    // Load villages for hierarchy issues
    loadVillagesForHierarchyForPrimary(selectedTehsil, selectedRI);
}

// Load villages for hierarchy selection in CCE Primary section
function loadVillagesForHierarchyForPrimary(tehsil, ri) {
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
    
    displayVillagesListForPrimary(uniqueVillages);
}

// Display villages list for selection in CCE Primary section
function displayVillagesListForPrimary(villages) {
    const villagesList = document.getElementById('villagesList');
    
    if (villages.length === 0) {
        villagesList.innerHTML = '<div class="text-center text-muted hindi">कोई गांव नहीं मिला</div>';
        return;
    }
    
    let villagesHTML = '';
    villages.forEach(village => {
        villagesHTML += `
            <div class="village-item" data-village-code="${village.villagecode}" onclick="toggleVillageSelectionForPrimary('${village.villagecode}', '${village.villagename}', this)">
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

// Toggle village selection for CCE Primary section
function toggleVillageSelectionForPrimary(villageCode, villageName, element) {
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
}

// Update selected villages list display for CCE Primary section
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
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeVillageSelectionForPrimary('${village.villagecode}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    selectedVillagesList.innerHTML = selectedHTML;
}

// Remove village from selection for CCE Primary section
function removeVillageSelectionForPrimary(villageCode) {
    selectedVillages = selectedVillages.filter(v => v.villagecode !== villageCode);
    
    // Update UI
    const villageElement = document.querySelector(`[data-village-code="${villageCode}"]`);
    if (villageElement) {
        villageElement.classList.remove('selected');
        villageElement.querySelector('i').className = 'fas fa-plus-circle text-primary';
    }
    
    updateSelectedVillagesList();
}

// Handle hierarchy issue count change for CCE Primary section
function handleHierarchyIssueCountChangeForPrimary() {
    const hierarchyIssueCount = parseInt(document.getElementById('hierarchyIssueCount').value || '0');
    
    if (hierarchyIssueCount > 0) {
        document.getElementById('hierarchyIssuesSection').style.display = 'block';
    } else {
        document.getElementById('hierarchyIssuesSection').style.display = 'none';
        selectedVillages = []; // Clear selected villages if no issues
        updateSelectedVillagesList();
    }
}

// Validate CCE Primary form
function validateCCEPrimaryForm() {
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

// Save CCE Primary count data
async function saveCCEPrimaryCountData() {
    try {
        // Validate form
        if (!validateRequiredFields('cceCountForm') || !validateCCEPrimaryForm()) {
            showAlert('कृपया सभी आवश्यक फील्ड सही तरीके से भरें।', 'warning');
            return;
        }
        
        setButtonLoading('saveCountsBtn', true, 'सेव हो रहा है...');
        
        // Get form data
        const formData = {
            district_name: currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname,
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
        if (selectedVillages.length > 0) {
            await saveHierarchyCorrections(data.id);
        }
        
        showAlert('CCE Primary User डेटा सफलतापूर्वक सेव हो गया।', 'success');
        
        // Reset form
        resetCCEPrimaryForm();
        
    } catch (error) {
        console.error('Error saving CCE Primary count data:', error);
        showAlert('CCE Primary डेटा सेव करने में त्रुटि: ' + error.message, 'danger');
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
                district_name: currentUser.districtName || currentUser.district_name || currentUser.district || currentUser.districtname,
                original_districtname: village.districtname,
                original_level4name: village.level4name,
                original_level5name: village.level5name,
                original_level6code: village.level6code,
                original_villagename: village.villagename,
                original_villagecode: village.villagecode,
                // For now, corrected values are same as original as there is no specific correction form yet
                corrected_districtname: village.districtname,
                corrected_level4name: village.level4name,
                corrected_level5name: village.level5name,
                corrected_level6code: village.level6code,
                issue_type: 'Hierarchy Issue', // Default issue type
                correction_status: 'pending', // Mark as pending for admin review
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

// Reset CCE Primary form
function resetCCEPrimaryForm() {
    document.getElementById('cceCountForm').reset();
    document.getElementById('tehsilSelect').value = '';
    document.getElementById('riSelect').value = '';
    document.getElementById('riSelect').disabled = true;
    
    // Update breadcrumb
    document.getElementById('breadcrumbTehsil').textContent = '-';
    document.getElementById('breadcrumbRI').textContent = '-';
    
    // Hide sections
    document.getElementById('cceCountSection').style.display = 'none';
    document.getElementById('hierarchyIssuesSection').style.display = 'none';
    
    // Clear selected villages
    selectedVillages = [];
    updateSelectedVillagesList();
    
    // Clear form errors
    clearAllFieldErrors('cceCountForm');
    
    showAlert('फॉर्म रीसेट हो गया।', 'info');
}

// Load CCE Primary submissions (for "मेरी एंट्रीज" - if implemented later)
async function loadCCEPrimarySubmissions() {
    try {
        // This function would load the user's past submissions
        // For now, it's a placeholder.
        console.log('Loading CCE Primary user submissions...');
        
    } catch (error) {
        console.error('Error loading CCE Primary submissions:', error);
    }
}

// Initialize CCE Primary event listeners
function initializeCCEPrimaryEventListeners() {
    // Location selection
    const tehsilSelect = document.getElementById('tehsilSelect');
    const riSelect = document.getElementById('riSelect');
    
    if (tehsilSelect) {
        tehsilSelect.addEventListener('change', handleTehsilChangeForPrimary);
    }
    
    if (riSelect) {
        riSelect.addEventListener('change', handleRIChangeForPrimary);
    }
    
    // Hierarchy issue count change
    const hierarchyIssueCount = document.getElementById('hierarchyIssueCount');
    if (hierarchyIssueCount) {
        hierarchyIssueCount.addEventListener('input', handleHierarchyIssueCountChangeForPrimary);
    }
    
    // Village search
    const villageSearchInput = document.getElementById('villageSearchInput');
    if (villageSearchInput) {
        villageSearchInput.addEventListener('input', debounce(searchVillagesForPrimary, 300));
    }
    
    // Form buttons
    const resetCountsBtn = document.getElementById('resetCountsBtn');
    if (resetCountsBtn) {
        resetCountsBtn.addEventListener('click', resetCCEPrimaryForm);
    }
    
    // Form submission
    const cceCountForm = document.getElementById('cceCountForm');
    if (cceCountForm) {
        cceCountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveCCEPrimaryCountData();
        });
    }
}

// Search villages for CCE Primary section
function searchVillagesForPrimary() {
    const searchTerm = document.getElementById('villageSearchInput').value.toLowerCase();
    const villageItems = document.querySelectorAll('#villagesList .village-item');
    
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

// Debounce function (copied from core.js or define here if core isn't available)
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


// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   CCE Primary User Module Loaded             ║
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

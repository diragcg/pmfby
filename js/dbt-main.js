// dbt-main.js

// Supabase configuration
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let currentUser = null;
let isAdmin = false;
let availableSchemes = []; // Stores all active schemes loaded from DB

// --- Core Application Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all deferred scripts are loaded and parsed
    setTimeout(() => {
        initializeApp();
    }, 100); 
});

async function initializeApp() {
    try {
        await waitForModules(); // Ensure all modules are defined and accessible
        
        // 1. Authenticate User
        if (!DBTAuth.checkUserAuthentication()) {
            return; // User will be redirected to login if not authenticated
        }
        currentUser = DBTAuth.getCurrentUser();
        isAdmin = DBTAuth.isAdmin();

        // 2. Load Core Data (Schemes)
        await loadSchemes(); // Load schemes first, as many components depend on it

        // 3. Initialize UI Components
        await initializeUI();
        
        // 4. Setup Main Form
        setupForm();
        
        // 5. Load Initial Non-Form Data (e.g., Notifications)
        await loadInitialNonFormData(); 
        
        // 6. Initialize Feature Modules
        BudgetMaster.init(); 
        ReportManager.init(); 
        
        // Ensure loading overlay is hidden after app initialization
        showLoading(false);

        console.log('DBT Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showAlert('एप्लिकेशन शुरू करने में त्रुटि हुई।', 'danger');
        showLoading(false); // Ensure overlay is hidden on error
    }
}

// Ensures all required external modules are loaded and globally available
function waitForModules() {
    return new Promise((resolve) => {
        const checkModules = () => {
            if (typeof DBTAuth !== 'undefined' && 
                typeof DBTValidation !== 'undefined' && 
                typeof DBTCalculations !== 'undefined' &&
                typeof DBTAdmin !== 'undefined') { // Check for all expected modules
                resolve();
            } else {
                setTimeout(checkModules, 50); // Re-check every 50ms
            }
        };
        checkModules();
    });
}

// --- UI Setup Functions ---
async function initializeUI() {
    setupHeader();
    setupHeaderEventListeners();
    
    if (isAdmin) {
        if (typeof DBTAdmin !== 'undefined') {
            DBTAdmin.setupAdminControls();
            await DBTAdmin.loadAdminStats();
        } else {
            console.warn('DBTAdmin module not loaded in initializeUI. Retrying...');
            setTimeout(() => {
                if (typeof DBTAdmin !== 'undefined') {
                    DBTAdmin.setupAdminControls();
                    DBTAdmin.loadAdminStats();
                }
            }, 500);
        }
    }
    
    setupNotifications();
    // setupModals(); // Modals are now mostly in HTML, or dynamically added by modules
    setupCollapsibleSections(); // Re-wired and fixed
    setupRoleBasedAccess();
}

function setupHeader() {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && currentUser) {
        userInfoElement.textContent = `${currentUser.fullName} - ${currentUser.districtName}`;
    }
    
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        userRoleElement.style.display = isAdmin ? 'inline-block' : 'none';
    }
    
    setupUserMenu();
    
    if (isAdmin) {
        setupAdminNavigation();
    }
}

// Moved to global scope so it's defined before initializeUI calls it
function setupHeaderEventListeners() {
    // Budget Master button in header
    const budgetMasterBtn = document.getElementById('budgetMasterBtn');
    if (budgetMasterBtn) {
        budgetMasterBtn.addEventListener('click', () => {
            if (typeof BudgetMaster !== 'undefined') {
                BudgetMaster.showBudgetMasterModal();
            }
        });
    }
    
    // Report buttons in header dropdown
    const showPrintModalBtn = document.getElementById('showPrintModalBtn');
    if (showPrintModalBtn) {
        showPrintModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof ReportManager !== 'undefined') {
                ReportManager.showPrintModal();
            }
        });
    }
    
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof ReportManager !== 'undefined') {
                ReportManager.downloadExcel(true); // true for all schemes
            }
        });
    }
    
    const downloadPDFBtn = document.getElementById('downloadPDFBtn');
    if (downloadPDFBtn) {
        downloadPDFBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof ReportManager !== 'undefined') {
                ReportManager.downloadPDF(true); // true for all schemes
            }
        });
    }

    const showBudgetStatusBtn = document.getElementById('showBudgetStatusBtn');
    if (showBudgetStatusBtn) {
        showBudgetStatusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof ReportManager !== 'undefined') {
                ReportManager.showBudgetStatusReport();
            }
        });
    }

    // Event listeners for print report modal buttons (inside the modal)
    const previewReportBtn = document.getElementById('previewReportBtn');
    if (previewReportBtn) {
        previewReportBtn.addEventListener('click', () => ReportManager.previewReport());
    }

    const printReportBtn = document.getElementById('printReportBtn');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => ReportManager.printReport());
    }

    // Event listener for add scheme modal save button (Admin)
    const saveNewSchemeBtn = document.getElementById('saveNewSchemeBtn');
    if (saveNewSchemeBtn && typeof DBTAdmin !== 'undefined') {
        saveNewSchemeBtn.addEventListener('click', () => DBTAdmin.saveNewScheme());
    }

    // Event listener for export budget status button (Admin)
    const exportBudgetStatusBtn = document.getElementById('exportBudgetStatusBtn');
    if (exportBudgetStatusBtn && typeof ReportManager !== 'undefined') { // Check ReportManager
        exportBudgetStatusBtn.addEventListener('click', () => ReportManager.exportBudgetStatus());
    }
}

function setupUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;
    
    userMenu.innerHTML = `
        <li><a class="dropdown-item" href="#" onclick="showProfile()">
            <i class="fas fa-user-circle me-2"></i>My Profile
        </a></li>
        <li><a class="dropdown-item" href="#" onclick="changePassword()">
            <i class="fas fa-key me-2"></i>Change Password
        </a></li>
        <li><a class="dropdown-item" href="#" onclick="showMyActivity()">
            <i class="fas fa-history me-2"></i>My Activity
        </a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item text-danger" href="#" onclick="logout()">
            <i class="fas fa-sign-out-alt me-2"></i>Logout
        </a></li>
    `;
}

function setupAdminNavigation() {
    const adminControls = document.getElementById('adminControls');
    if (!adminControls) return;
    
    adminControls.style.display = 'flex';
    adminControls.innerHTML = `
        <div class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="adminDropdown" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-cog me-2"></i>
                <span class="hindi">Admin Panel</span>
            </a>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="DBTAdmin.showUserManagement()">
                    <i class="fas fa-users me-2"></i>User Management
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="DBTAdmin.showSchemeManagement()">
                    <i class="fas fa-list-alt me-2"></i>Scheme Management
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="DBTAdmin.showDataReports()">
                    <i class="fas fa-chart-bar me-2"></i>Data Reports & Analytics
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="DBTAdmin.showSystemSettings()">
                    <i class="fas fa-wrench me-2"></i>System Settings
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="DBTAdmin.showAuditLogs()">
                    <i class="fas fa-clipboard-list me-2"></i>Audit Logs
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="DBTAdmin.showBackupRestore()">
                    <i class="fas fa-database me-2"></i>Backup & Restore
                </a></li>
            </ul>
        </div>
        
        <a class="nav-link" href="#" onclick="DBTAdmin.showDashboard()">
            <i class="fas fa-tachometer-alt me-2"></i>
            <span class="hindi">Dashboard</span>
        </a>
        
        <a class="nav-link" href="#" onclick="DBTAdmin.showPendingApprovals()">
            <i class="fas fa-clock me-2"></i>
            <span class="hindi">Approvals</span>
            <span class="badge bg-warning ms-1" id="pendingCount">0</span>
        </a>

        <a class="nav-link" href="#" onclick="DBTAdmin.toggleQuickActions()">
            <i class="fas fa-bolt me-2"></i>
            <span class="hindi">Quick Actions</span>
        </a>
    `;
}

function setupNotifications() {
    const notificationMenu = document.getElementById('notificationMenu');
    if (!notificationMenu) return;
    
    notificationMenu.innerHTML = `
        <li><h6 class="dropdown-header">
            <i class="fas fa-bell me-2"></i>Notifications
        </h6></li>
        <li><div class="dropdown-item-text" id="notificationList">
            <div class="text-center text-muted py-3">
                <i class="fas fa-inbox fa-2x mb-2"></i>
                <div>No new notifications</div>
            </div>
        </div></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item text-center" href="#" onclick="viewAllNotifications()">
            <small>View All Notifications</small>
        </a></li>
    `;
    
    loadNotifications();
}

// Fixed: Collapsible sections functionality
function setupCollapsibleSections() {
    const headers = document.querySelectorAll('.subsection-header');
    
    headers.forEach(header => {
        // Remove existing listener to prevent duplicates
        header.removeEventListener('click', _toggleSubsection);
        header.addEventListener('click', _toggleSubsection);
    });

    function _toggleSubsection(event) {
        const header = event.currentTarget; // Use currentTarget to ensure it's the header itself
        const targetId = header.dataset.target;
        const content = document.getElementById(targetId);
        const icon = header.querySelector('.expand-icon i');
        
        if (content && icon) {
            // Toggle the 'collapsed' class on the content
            content.classList.toggle('collapsed');
            // Also toggle 'collapsed' class on the header for styling consistency
            header.classList.toggle('collapsed');

            // Rotate icon based on collapsed state
            if (content.classList.contains('collapsed')) {
                icon.style.transform = 'rotate(-90deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        }
    }
}

function setupRoleBasedAccess() {
    if (!isAdmin) {
        const addSchemeBtn = document.getElementById('addSchemeBtn');
        if (addSchemeBtn) {
            addSchemeBtn.style.display = 'none';
        }
        
        const adminSections = document.querySelectorAll('.admin-only-section');
        adminSections.forEach(section => {
            section.style.display = 'none';
        });
    } else {
        const addSchemeBtn = document.getElementById('addSchemeBtn');
        if (addSchemeBtn) {
            addSchemeBtn.style.display = 'inline-block';
        }
    }
}

async function loadInitialNonFormData() {
    if (isAdmin) {
        loadNotifications();
    }
}

// --- Main Form Setup and Logic ---
function setupForm() {
    const form = document.getElementById('dbtForm');
    if (!form) return;
    
    form.reset();
    setupFormFields();
    setupEventListeners(); // Main form event listeners
    
    if (typeof DBTCalculations !== 'undefined') {
        DBTCalculations.setupAutoCalculations();
    }
    
    setDefaultDate();
    // updateProgress(); // Removed as per requirement
    loadDraftData();
}

function setupFormFields() {
    const budgetSection = document.getElementById('budgetSection');
    if (budgetSection) {
        budgetSection.innerHTML = `
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Central Allocation for the State (INR)</label>
                    <input type="number" class="form-control" id="centralAllocation" step="0.01" min="0">
                    <small class="text-muted">Auto-filled from Budget Master</small>
                </div>
                <div class="mb-3 currency-input">
                    <label class="form-label">State Normative Allocation (INR)</label>
                    <input type="number" class="form-control" id="stateNormativeAllocation" step="0.01" min="0">
                    <small class="text-muted">Auto-filled from Budget Master</small>
                </div>
            </div>
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Additional State Allocation (if any) (INR)</label>
                    <input type="number" class="form-control" id="additionalStateAllocation" step="0.01" min="0">
                    <small class="text-muted">Auto-filled from Budget Master</small>
                </div>
                <div class="mb-3">
                    <label class="form-label">Remarks (if any relate to budget allocation)</label>
                    <textarea class="form-control" id="budgetRemarks" rows="3" style="height: auto;"></textarea>
                </div>
            </div>
        `;
    }
    
    setupBenefitDetailsSection();
    setupSavingsSection();
}

function setupBenefitDetailsSection() {
    const benefitDetailsSection = document.getElementById('benefitDetailsSection');
    if (!benefitDetailsSection) return;
    
    benefitDetailsSection.innerHTML = `
        <div class="form-row full-width">
            <div class="mb-3 number-input">
                <label class="form-label">Total Number Of Beneficiaries</label>
                <input type="number" class="form-control auto-calculated" id="totalBeneficiaries" min="0" readonly>
                <small class="calculation-indicator">Auto-calculated from below fields</small>
            </div>
        </div>
        <div class="form-row three-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Additional Beneficiaries Supported By State, If Any (Applicable For CSS)</label>
                <input type="number" class="form-control" id="additionalBeneficiariesCSS" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Additional Beneficiaries Supported By State, If Any (Applicable For State Scheme)</label>
                <input type="number" class="form-control" id="additionalBeneficiariesState" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Digitized</label>
                <input type="number" class="form-control" id="beneficiariesDigitized" min="0" value="0">
            </div>
        </div>
        <div class="form-row full-width">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Bank Account Details Available With Department</label>
                <input type="number" class="form-control" id="bankAccountDetails" min="0" value="0">
            </div>
        </div>
        <div class="form-row two-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Aadhaar Seeded (Aadhaar Number Of Beneficiaries Available With Department)</label>
                <input type="number" class="form-control" id="aadhaarSeeded" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Aadhaar Authenticated</label>
                <input type="number" class="form-control" id="aadhaarAuthenticated" min="0" value="0">
            </div>
        </div>
        <div class="form-row two-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Mobile Number Available With Department</label>
                <input type="number" class="form-control" id="mobileAvailable" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Amount Disbursed Through Electronic Mode (ABP NEFT AEPS etc.)</label>
                <input type="number" class="form-control" id="electronicModeBeneficiaries" min="0" value="0">
            </div>
        </div>
        <div class="form-row two-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Amount Disbursed Through Non Electronic Mode (Cash Cheque, Demand Draft etc.)</label>
                <input type="number" class="form-control" id="nonElectronicBeneficiaries" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Transactions Through Electronic Mode (ABP NEFT AEPS etc.)</label>
                <input type="number" class="form-control" id="electronicTransactions" min="0" value="0">
            </div>
        </div>
        <div class="form-row full-width">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Transactions Through Non-Electronic Mode (Cash Cheque, Demand Draft, Money Order etc.)</label>
                <input type="number" class="form-control" id="nonElectronicTransactions" min="0" value="0">
            </div>
        </div>
    `;
}

function setupSavingsSection() {
    const savingsSection = document.getElementById('savingsSection');
    if (!savingsSection) return;
    
    savingsSection.innerHTML = `
        <div class="form-row four-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries Removed Due To De-Duplication Using Aadhaar</label>
                <input type="number" class="form-control" id="deduplicationAadhaar" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Ghost/Fake Beneficiaries Removed</label>
                <input type="number" class="form-control" id="ghostBeneficiaries" min="0" value="0">
            </div>
            <div class="mb-3 currency-input">
                <label class="form-label">Other Savings Due To Process Reengineering/Efficiency</label>
                <input type="number" class="form-control" id="otherSavings" step="0.01" min="0" value="0">
            </div>
            <div class="mb-3 currency-input">
                <label class="form-label">Saving Amount (in INR)</label>
                <input type="number" class="form-control auto-calculated" id="savingAmount" step="0.01" min="0" readonly>
                <small class="calculation-indicator">Auto-calculated</small>
            </div>
        </div>
    `;
}

function setupEventListeners() {
    const form = document.getElementById('dbtForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }
    
    const addSchemeBtn = document.getElementById('addSchemeBtn');
    if (addSchemeBtn) {
        addSchemeBtn.addEventListener('click', () => {
            if (isAdmin && typeof DBTAdmin !== 'undefined') {
                const modal = new bootstrap.Modal(document.getElementById('addSchemeModal'));
                modal.show();
            }
        });
    }
    
    const formInputs = document.querySelectorAll('#dbtForm input, #dbtForm select, #dbtForm textarea');
    formInputs.forEach(input => {
        // input.addEventListener('input', updateProgress); // Removed
        // input.addEventListener('change', updateProgress); // Removed
        if (typeof DBTValidation !== 'undefined') {
            input.addEventListener('blur', (e) => DBTValidation.validateField(e));
        }
    });

    const schemeSelect = document.getElementById('schemeSelect');
    if (schemeSelect) {
        schemeSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const schemeType = selectedOption.dataset.type;
                const benefitType = selectedOption.dataset.benefitType;
                updateFormFieldsBasedOnScheme(schemeType, benefitType);
                
                if (typeof BudgetMaster !== 'undefined') {
                    BudgetMaster.updateSchemeBudgetStatus(); // Update status for newly selected scheme
                }
            } else {
                // Clear status and fields if no scheme is selected
                const statusDiv = document.getElementById('schemeBudgetStatus');
                if(statusDiv) statusDiv.innerHTML = '';
                const indicator = document.getElementById('budgetPreFilledIndicator');
                if(indicator) indicator.style.display = 'none';
                
                document.getElementById('centralAllocation').value = '';
                document.getElementById('stateNormativeAllocation').value = '';
                document.getElementById('additionalStateAllocation').value = '';
                document.getElementById('centralAllocation').readOnly = false;
                document.getElementById('stateNormativeAllocation').readOnly = false;
                document.getElementById('additionalStateAllocation').readOnly = false;
                document.getElementById('centralAllocation').style.backgroundColor = ''; // Reset background
                document.getElementById('stateNormativeAllocation').style.backgroundColor = '';
                document.getElementById('additionalStateAllocation').style.backgroundColor = '';
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveDraft();
        }
        
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.click();
        }
    });
    
    window.addEventListener('beforeunload', function(e) {
        const formData = collectFormData();
        const hasData = Object.values(formData).some(value => 
            value !== '' && value !== 0 && value !== false
        );
        
        if (hasData /* && formProgress > 10 */ ) { // Removed formProgress condition
            localStorage.setItem('dbtFormDraft', JSON.stringify(formData));
            e.preventDefault();
            e.returnValue = 'आपका काम सेव नहीं हुआ है। क्या आप वाकई पेज छोड़ना चाहते हैं?';
        }
    });
}

function updateFormFieldsBasedOnScheme(schemeType, benefitType) {
    const centralFields = document.querySelectorAll('.central-scheme-only');
    const stateFields = document.querySelectorAll('.state-scheme-only');
    
    if (schemeType === 'Centrally Sponsored') {
        centralFields.forEach(field => field.style.display = 'block');
        stateFields.forEach(field => field.style.display = 'none');
    } else if (schemeType === 'State Scheme') {
        centralFields.forEach(field => field.style.display = 'none');
        stateFields.forEach(field => field.style.display = 'block');
    }
}

function generateEntryId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `DBT${year}${month}${day}${timestamp}`;
}

function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
}

function collectFormData() {
    const formData = {};
    
    formData.entry_id = generateEntryId();
    
    formData.scheme_id = parseInt(document.getElementById('schemeSelect')?.value) || null;
    
    const schemeSelect = document.getElementById('schemeSelect');
    formData.scheme_select = schemeSelect?.options[schemeSelect.selectedIndex]?.textContent || null;
    
    formData.dbt_date = document.getElementById('dbtDate')?.value || null;

    const selectedSchemeId = document.getElementById('schemeSelect')?.value;
    const budgetData = BudgetMaster.getBudgetDataForScheme(selectedSchemeId);
    
    if (budgetData) {
        formData.central_allocation = budgetData.centralAllocation;
        formData.state_normative_allocation = budgetData.stateNormativeAllocation;
        formData.additional_state_allocation = budgetData.additionalStateAllocation;
    } else {
        // If no budget master, use values from the main form fields (if they are editable)
        formData.central_allocation = parseFloat(document.getElementById('centralAllocation')?.value) || 0;
        formData.state_normative_allocation = parseFloat(document.getElementById('stateNormativeAllocation')?.value) || 0;
        formData.additional_state_allocation = parseFloat(document.getElementById('additionalStateAllocation')?.value) || 0;
    }
    formData.budget_remarks = document.getElementById('budgetRemarks')?.value.trim() || null;

    formData.total_amount_disbursed = parseFloat(document.getElementById('totalAmountDisbursed')?.value) || 0;
    formData.central_share_fund = parseFloat(document.getElementById('centralShareFund')?.value) || 0;
    formData.normative_state_share = parseFloat(document.getElementById('normativeStateShare')?.value) || 0;
    formData.additional_state_contributed = parseFloat(document.getElementById('additionalStateContributed')?.value) || 0;
    formData.state_share_additional = parseFloat(document.getElementById('stateShareAdditional')?.value) || 0;
    formData.non_electronic_disbursed = parseFloat(document.getElementById('nonElectronicDisbursed')?.value) || 0;
    formData.electronic_disbursed = parseFloat(document.getElementById('electronicDisbursed')?.value) || 0;

    formData.total_beneficiaries = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
    formData.additional_beneficiaries_css = parseInt(document.getElementById('additionalBeneficiariesCSS')?.value) || 0;
    formData.additional_beneficiaries_state = parseInt(document.getElementById('additionalBeneficiariesState')?.value) || 0;
    formData.beneficiaries_digitized = parseInt(document.getElementById('beneficiariesDigitized')?.value) || 0;
    formData.bank_account_details = parseInt(document.getElementById('bankAccountDetails')?.value) || 0;
    formData.aadhaar_seeded = parseInt(document.getElementById('aadhaarSeeded')?.value) || 0;
    formData.aadhaar_authenticated = parseInt(document.getElementById('aadhaarAuthenticated')?.value) || 0;
    formData.mobile_available = parseInt(document.getElementById('mobileAvailable')?.value) || 0;
    formData.electronic_mode_beneficiaries = parseInt(document.getElementById('electronicModeBeneficiaries')?.value) || 0;
    formData.non_electronic_beneficiaries = parseInt(document.getElementById('nonElectronicBeneficiaries')?.value) || 0;
    formData.electronic_transactions = parseInt(document.getElementById('electronicTransactions')?.value) || 0;
    formData.non_electronic_transactions = parseInt(document.getElementById('nonElectronicTransactions')?.value) || 0;

    formData.deduplication_aadhaar = parseInt(document.getElementById('deduplicationAadhaar')?.value) || 0;
    formData.ghost_beneficiaries = parseInt(document.getElementById('ghostBeneficiaries')?.value) || 0;
    formData.other_savings = parseFloat(document.getElementById('otherSavings')?.value) || 0;
    formData.saving_amount = parseFloat(document.getElementById('savingAmount')?.value) || 0;
    
    return formData;
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    const selectedSchemeId = document.getElementById('schemeSelect')?.value;
    if (!isAdmin && selectedSchemeId && typeof BudgetMaster !== 'undefined' && !BudgetMaster.hasBudgetMaster(selectedSchemeId)) {
        showAlert('पहले चयनित स्कीम के लिए बजट मास्टर सेट करें।', 'warning');
        return;
    }
    
    if (typeof DBTValidation !== 'undefined' && !DBTValidation.validateForm()) {
        showAlert('कृपया सभी आवश्यक फील्ड भरें और त्रुटियों को सुधारें।', 'danger');
        return;
    }
    
    isDraftMode = false;
    await saveFormData();
}

async function saveDraft() {
    isDraftMode = true;
    await saveFormData();
}

async function saveFormData() {
    try {
        showLoading(true);
        
        const formData = collectFormData();
        
        if (!formData.entry_id || !formData.dbt_date) {
            throw new Error('Required fields are missing');
        }
        
        formData.is_draft = isDraftMode;
        formData.status = isDraftMode ? 'draft' : 'pending';
        
        if (!currentUser?.id || !isValidUUID(currentUser.id)) {
            throw new Error('Invalid user authentication');
        }
        
        formData.created_by = currentUser.id;
        formData.updated_by = currentUser.id;
        
        if (currentUser.districtId && isValidUUID(currentUser.districtId)) {
            formData.district_id = currentUser.districtId;
            formData.district_name = currentUser.districtName;
        } else {
            console.warn("currentUser.districtId is missing or invalid. Entry might not be associated with a district.");
            formData.district_id = null;
            formData.district_name = null;
        }

        formData.created_at = new Date().toISOString();
        
        console.log('Sending data:', formData);
        
        const { data, error } = await supabaseClient
            .from('dbt_data_entries')
            .insert([formData])
            .select();

        if (error) {
            console.error('Supabase error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }
        
        showLoading(false);
        
        if (isDraftMode) {
            showAlert('डेटा ड्राफ्ट के रूप में सेव हो गया।', 'success');
        } else {
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
        }
        
        localStorage.removeItem('dbtFormDraft');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showLoading(false);
        
        let errorMessage = 'डेटा सेव करने में त्रुटि हुई।';
        
        if (error.message.includes('duplicate key')) {
            errorMessage = 'यह एंट्री पहले से मौजूद है।';
        } else if (error.message.includes('foreign key')) {
            errorMessage = 'चयनित स्कीम मान्य नहीं है।';
        } else if (error.message.includes('not-null')) {
            errorMessage = 'कुछ आवश्यक फील्ड गुम हैं।';
        }
        
        showAlert(errorMessage + ' कृपया पुनः प्रयास करें।', 'danger');
    }
}

function loadDraftData() {
    const draftData = localStorage.getItem('dbtFormDraft');
    
    if (draftData) {
        try {
            const data = JSON.parse(draftData);
            
            if (document.getElementById('schemeSelect')) document.getElementById('schemeSelect').value = data.scheme_id || '';
            if (document.getElementById('dbtDate')) document.getElementById('dbtDate').value = data.dbt_date || '';
            if (document.getElementById('budgetRemarks')) document.getElementById('budgetRemarks').value = data.budget_remarks || '';

            if (document.getElementById('totalAmountDisbursed')) document.getElementById('totalAmountDisbursed').value = data.total_amount_disbursed || 0;
            if (document.getElementById('centralShareFund')) document.getElementById('centralShareFund').value = data.central_share_fund || 0;
            if (document.getElementById('normativeStateShare')) document.getElementById('normativeStateShare').value = data.normative_state_share || 0;
            if (document.getElementById('additionalStateContributed')) document.getElementById('additionalStateContributed').value = data.additional_state_contributed || 0;
            if (document.getElementById('stateShareAdditional')) document.getElementById('stateShareAdditional').value = data.state_share_additional || 0;
            if (document.getElementById('nonElectronicDisbursed')) document.getElementById('nonElectronicDisbursed').value = data.non_electronic_disbursed || 0;
            if (document.getElementById('electronicDisbursed')) document.getElementById('electronicDisbursed').value = data.electronic_disbursed || 0;

            if (document.getElementById('totalBeneficiaries')) document.getElementById('totalBeneficiaries').value = data.total_beneficiaries || 0;
            if (document.getElementById('additionalBeneficiariesCSS')) document.getElementById('additionalBeneficiariesCSS').value = data.additional_beneficiaries_css || 0;
            if (document.getElementById('additionalBeneficiariesState')) document.getElementById('additionalBeneficiariesState').value = data.additional_beneficiaries_state || 0;
            if (document.getElementById('beneficiariesDigitized')) document.getElementById('beneficiariesDigitized').value = data.beneficiaries_digitized || 0;
            if (document.getElementById('bankAccountDetails')) document.getElementById('bankAccountDetails').value = data.bank_account_details || 0;
            if (document.getElementById('aadhaarSeeded')) document.getElementById('aadhaarSeeded').value = data.aadhaar_seeded || 0;
            if (document.getElementById('aadhaarAuthenticated')) document.getElementById('aadhaarAuthenticated').value = data.aadhaar_authenticated || 0;
            if (document.getElementById('mobileAvailable')) document.getElementById('mobileAvailable').value = data.mobile_available || 0;
            if (document.getElementById('electronicModeBeneficiaries')) document.getElementById('electronicModeBeneficiaries').value = data.electronic_mode_beneficiaries || 0;
            if (document.getElementById('nonElectronicBeneficiaries')) document.getElementById('nonElectronicBeneficiaries').value = data.non_electronic_beneficiaries || 0;
            if (document.getElementById('electronicTransactions')) document.getElementById('electronicTransactions').value = data.electronic_transactions || 0;
            if (document.getElementById('nonElectronicTransactions')) document.getElementById('nonElectronicTransactions').value = data.non_electronic_transactions || 0;

            if (document.getElementById('deduplicationAadhaar')) document.getElementById('deduplicationAadhaar').value = data.deduplication_aadhaar || 0;
            if (document.getElementById('ghostBeneficiaries')) document.getElementById('ghostBeneficiaries').value = data.ghost_beneficiaries || 0;
            if (document.getElementById('otherSavings')) document.getElementById('otherSavings').value = data.other_savings || 0;
            if (document.getElementById('savingAmount')) document.getElementById('savingAmount').value = data.saving_amount || 0;
            
            if (typeof DBTCalculations !== 'undefined') {
                DBTCalculations.calculateTotalAmount();
                DBTCalculations.calculateTotalBeneficiaries();
                DBTCalculations.calculateSavings();
            }
            // updateProgress(); // Removed
            
            showAlert('पिछला ड्राफ्ट लोड किया गया।', 'info');
            
        } catch (error) {
                console.error('Error loading draft:', error);
            localStorage.removeItem('dbtFormDraft');
        }
    }
}

setInterval(() => {
    // if (formProgress > 10) { // Removed formProgress condition
        const formData = collectFormData();
        localStorage.setItem('dbtFormDraft', JSON.stringify(formData));
    // }
}, 120000); // Auto-save draft every 2 minutes

// --- User Profile Actions ---
function showProfile() {
    window.open('profile.html', '_blank');
}

function changePassword() {
    window.open('change-password.html', '_blank');
}

function showMyActivity() {
    window.open('my-activity.html', '_blank');
}

function viewAllNotifications() {
    window.open('notifications.html', '_blank');
}

function resetForm() {
    if (confirm('क्या आप वाकई फॉर्म रीसेट करना चाहते हैं? सभी DBT डेटा खो जाएगा। (Budget Master डेटा सुरक्षित रहेगा)')) {
        document.getElementById('dbtForm').reset();
        localStorage.removeItem('dbtFormDraft');
        // updateProgress(); // Removed
        
        const selectedSchemeId = document.getElementById('schemeSelect')?.value;
        if (selectedSchemeId && typeof BudgetMaster !== 'undefined' && BudgetMaster.hasBudgetMaster(selectedSchemeId)) {
            BudgetMaster.populateBudgetFieldsInMainForm(selectedSchemeId);
        }
    }
}

function logout() {
    if (confirm('क्या आप वाकई लॉगआउट करना चाहते हैं?')) {
        DBTAuth.logout();
    }
}

// --- Utility Functions ---
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.alert-custom');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-custom`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        <span class="hindi">${message}</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const formCard = document.querySelector('.form-card');
    if (formCard) {
        formCard.insertBefore(alertDiv, formCard.firstChild);
    } else {
        document.body.prepend(alertDiv);
    }
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DBT Data Entry System                     ║
║                संचालनालय कृषि छत्तीसगढ़                      ║
║                                                              ║
║  ✅ Collapsible Sections Fixed                               ║
║  ✅ "Processing..." Overlay Fixed                            ║
║  ✅ Navbar Dropdown Z-index Fixed                            ║
║  ✅ Navbar Button Responsiveness Fixed                       ║
║  ✅ Progress Indicator Removed                               ║
║  ✅ Header Green Color Strip Fixed                           ║
║  ✅ Budget Master Modal Scheme Pre-selection Fixed           ║
║  ✅ Report Buttons Responsive & Comprehensive                ║
║                                                              ║
║  Modular Architecture:                                       ║
║  • dbt-main.js: Core + Budget Master + Reports              ║
║  • dbt-auth.js: Authentication handling                     ║
║  • dbt-validation.js: Form validation                       ║
║  • dbt-calculations.js: Auto calculations                   ║
║  • dbt-admin.js: Admin features                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

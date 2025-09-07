// Supabase configuration
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let currentUser = null;
let formProgress = 0;
let isDraftMode = false;
let isAdmin = false;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all deferred scripts are loaded
    setTimeout(() => {
        initializeApp();
    }, 100);
});
async function initializeApp() {
    try {
        // Check authentication first
        if (!DBTAuth.checkUserAuthentication()) {
            return; // User will be redirected to login
        }

        // Get current user data
        currentUser = DBTAuth.getCurrentUser();
        isAdmin = DBTAuth.isAdmin();

        // Initialize UI components
        await initializeUI();
        
        // Setup form functionality
        setupForm();
        
        // Load initial data
        await loadInitialData();
        
        console.log('DBT Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showAlert('एप्लिकेशन शुरू करने में त्रुटि हुई।', 'danger');
    }
}

async function initializeUI() {
    // Setup header and navigation
    setupHeader();
    
    // Setup admin controls if user is admin
    if (isAdmin) {
        DBTAdmin.setupAdminControls();
        await DBTAdmin.loadAdminStats();
    }
    
    // Setup notifications
    setupNotifications();
    
    // Setup modals
    setupModals();
    
    // Setup collapsible sections
    setupCollapsibleSections();
    
    // Setup role-based access
    setupRoleBasedAccess();
}

function setupHeader() {
    // Update user info in header
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && currentUser) {
        userInfoElement.textContent = `${currentUser.fullName} - ${currentUser.districtName}`;
    }
    
    // Show admin badge if user is admin
    if (isAdmin) {
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.style.display = 'inline-block';
        }
    }
    
    // Setup user menu
    setupUserMenu();
    
    // Setup admin navigation
    if (isAdmin) {
        setupAdminNavigation();
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
    
    // Load notifications
    loadNotifications();
}

function setupModals() {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) return;
    
    modalContainer.innerHTML = `
        <!-- Success Modal -->
        <div class="modal fade" id="successModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-check-circle me-2"></i>
                            <span class="hindi">सफलतापूर्वक सबमिट</span>
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                        </div>
                        <h4 class="hindi">DBT डेटा सफलतापूर्वक अपडेट हो गया!</h4>
                        <p class="hindi">आपका डेटा सुरक्षित रूप से सेव हो गया है।</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="window.location.reload()">
                            <span class="hindi">नया एंट्री करें</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Scheme Modal (Admin Only) -->
        <div class="modal fade" id="addSchemeModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-plus-circle me-2"></i>
                            Add New Scheme
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addSchemeForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Scheme Name *</label>
                                    <input type="text" class="form-control" id="newSchemeName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Scheme Code *</label>
                                    <input type="text" class="form-control" id="newSchemeCode" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Scheme Type *</label>
                                    <select class="form-select" id="newSchemeType" required>
                                        <option value="">-- Select Type --</option>
                                        <option value="Centrally Sponsored">Centrally Sponsored</option>
                                        <option value="State Scheme">State Scheme</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Benefit Type *</label>
                                    <select class="form-select" id="newBenefitType" required>
                                        <option value="">-- Select Benefit Type --</option>
                                        <option value="Cash">Cash</option>
                                        <option value="In Kind">In Kind</option>
                                        <option value="Cash & In Kind">Cash & In Kind</option>
                                    </select>
                                </div>
                                <div class="col-12 mb-3">
                                    <label class="form-label">Department Name</label>
                                    <input type="text" class="form-control" id="newDepartmentName" 
                                           value="Agriculture Development & Farmer Welfare & Bio-Technology Department (Agriculture)">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Budget Type</label>
                                    <select class="form-select" id="newBudgetType">
                                        <option value="Budget">Budget</option>
                                        <option value="Non-Budget">Non-Budget</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="DBTAdmin.saveNewScheme()">
                            <i class="fas fa-save me-2"></i>Save Scheme
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupForm() {
    // Initialize form
    const form = document.getElementById('dbtForm');
    if (!form) return;
    
    // Reset form
    form.reset();
    
    // Setup form fields
    setupFormFields();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup auto-calculations
    DBTCalculations.setupAutoCalculations();
    
    // Set default date
    setDefaultDate();
    
    // Update progress
    updateProgress();
    
    // Load draft data if exists
    loadDraftData();
}

function setupFormFields() {
    // Setup budget allocation fields
    const budgetSection = document.getElementById('budgetSection');
    if (budgetSection) {
        budgetSection.innerHTML = `
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Central Allocation for the State (INR)</label>
                    <input type="number" class="form-control" id="centralAllocation" step="0.01" min="0">
                </div>
                <div class="mb-3 currency-input">
                    <label class="form-label">State Normative Allocation (INR)</label>
                    <input type="number" class="form-control" id="stateNormativeAllocation" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Additional State Allocation (if any) (INR)</label>
                    <input type="number" class="form-control" id="additionalStateAllocation" step="0.01" min="0">
                </div>
                <div class="mb-3">
                    <label class="form-label">Remarks (if any relate to budget allocation)</label>
                    <textarea class="form-control" id="budgetRemarks" rows="3" style="height: auto;"></textarea>
                </div>
            </div>
        `;
    }
    
    // Setup benefits section
    const benefitsSection = document.getElementById('benefitsSection');
    if (benefitsSection) {
        benefitsSection.innerHTML = `
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Total Amount Disbursed</label>
                    <input type="number" class="form-control auto-calculated" id="totalAmountDisbursed" step="0.01" min="0" readonly>
                    <small class="calculation-indicator">Auto-calculated from below fields</small>
                </div>
                <div class="mb-3 currency-input">
                    <label class="form-label">Central Share Fund Transferred</label>
                    <input type="number" class="form-control" id="centralShareFund" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Normative - State Share Fund Transferred</label>
                    <input type="number" class="form-control" id="normativeStateShare" step="0.01" min="0">
                </div>
                <div class="mb-3 currency-input">
                    <label class="form-label">Additional State Contributed Fund Transferred</label>
                    <input type="number" class="form-control" id="additionalStateContributed" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row full-width">
                <div class="mb-3 currency-input">
                    <label class="form-label">State Share Fund Transferred To Additional beneficiaries Supported By State</label>
                    <input type="number" class="form-control" id="stateShareAdditional" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row full-width">
                <div class="mb-3 currency-input">
                    <label class="form-label">Total Amount Disbursed Through Non Electronic Mode (Cash, Cheque, Demand Draft, Money Order etc)</label>
                    <input type="number" class="form-control" id="nonElectronicDisbursed" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row full-width">
                <div class="mb-3 currency-input">
                    <label class="form-label">Total Amount Disbursed Through Electronic Mode (ABP, NEFT, RTGS, AEPS etc)</label>
                    <input type="number" class="form-control" id="electronicDisbursed" step="0.01" min="0">
                </div>
            </div>
        `;
    }
    
    // Setup benefit details section
    setupBenefitDetailsSection();
    
    // Setup savings section
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
    // Form submission
    const form = document.getElementById('dbtForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    // Save draft button
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }
    
    // Add scheme button
    const addSchemeBtn = document.getElementById('addSchemeBtn');
    if (addSchemeBtn) {
        addSchemeBtn.addEventListener('click', () => {
            if (isAdmin) {
                const modal = new bootstrap.Modal(document.getElementById('addSchemeModal'));
                modal.show();
            }
        });
    }
    
    // Form inputs for progress tracking and validation
    const formInputs = document.querySelectorAll('#dbtForm input, #dbtForm select, #dbtForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', updateProgress);
        input.addEventListener('change', updateProgress);
        input.addEventListener('blur', (e) => DBTValidation.validateField(e));
    });

    // Scheme selection handler
    const schemeSelect = document.getElementById('schemeSelect');
    if (schemeSelect) {
        schemeSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                const schemeType = selectedOption.dataset.type;
                const benefitType = selectedOption.dataset.benefitType;
                updateFormFieldsBasedOnScheme(schemeType, benefitType);
            }
        });
    }
    
    // Keyboard shortcuts
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
    
    // Handle page unload
    window.addEventListener('beforeunload', function(e) {
        const formData = collectFormData();
        const hasData = Object.values(formData).some(value => 
            value !== '' && value !== 0 && value !== false
        );
        
        if (hasData && formProgress > 10) {
            localStorage.setItem('dbtFormDraft', JSON.stringify(formData));
            e.preventDefault();
            e.returnValue = 'आपका काम सेव नहीं हुआ है। क्या आप वाकई पेज छोड़ना चाहते हैं?';
        }
    });
}

function setupCollapsibleSections() {
    const headers = document.querySelectorAll('.subsection-header');
    
    headers.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const content = document.getElementById(targetId);
            const icon = this.querySelector('.expand-icon i');
            
            if (content && icon) {
                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    this.classList.remove('collapsed');
                    icon.style.transform = 'rotate(0deg)';
                } else {
                    content.classList.add('collapsed');
                    this.classList.add('collapsed');
                    icon.style.transform = 'rotate(-90deg)';
                }
            }
        });
    });
}

function setupRoleBasedAccess() {
    if (!isAdmin) {
        // Disable certain admin-only fields for regular users
        const adminOnlyFields = [
            'centralAllocation',
            'stateNormativeAllocation', 
            'additionalStateAllocation'
        ];
        
        adminOnlyFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.setAttribute('readonly', true);
                field.style.backgroundColor = '#f8f9fa';
                field.title = 'This field is admin-only';
            }
        });
        
        // Hide admin-only sections
        const adminSections = document.querySelectorAll('.admin-only-section');
        adminSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Hide add scheme button
        const addSchemeBtn = document.getElementById('addSchemeBtn');
        if (addSchemeBtn) {
            addSchemeBtn.style.display = 'none';
        }
    } else {
        // Show add scheme button for admins
        const addSchemeBtn = document.getElementById('addSchemeBtn');
        if (addSchemeBtn) {
            addSchemeBtn.style.display = 'inline-block';
        }
    }
}

async function loadInitialData() {
    // Load schemes
    await loadSchemes();
    
    // Load notifications if admin
    if (isAdmin) {
        loadNotifications();
    }
}

async function loadSchemes() {
    try {
        const schemeSelect = document.getElementById('schemeSelect');
        if (!schemeSelect) return;
        
        schemeSelect.innerHTML = '<option value="">Loading schemes...</option>';
        
        const { data, error } = await supabaseClient
            .from('schemes')
            .select('id, scheme_name, scheme_code, scheme_type, benefit_type')
            .eq('is_active', true)
            .order('scheme_name');
        
        if (error) {
            console.warn('Schemes table error (likely not found or RLS issue), loading fallback data:', error);
            loadFallbackSchemes();
            return;
        }
        
        schemeSelect.innerHTML = '<option value="">-- Select Scheme --</option>';
        
        if (data && data.length > 0) {
            const centrallySponsored = data.filter(s => s.scheme_type === 'Centrally Sponsored');
            const stateSchemes = data.filter(s => s.scheme_type === 'State Scheme');
            
            if (centrallySponsored.length > 0) {
                const csGroup = document.createElement('optgroup');
                csGroup.label = 'Centrally Sponsored Schemes';
                centrallySponsored.forEach(scheme => {
                    const option = document.createElement('option');
                    option.value = scheme.id;
                    option.textContent = `${scheme.scheme_name} (${scheme.scheme_code})`;
                    option.dataset.type = scheme.scheme_type;
                    option.dataset.benefitType = scheme.benefit_type;
                    csGroup.appendChild(option);
                });
                schemeSelect.appendChild(csGroup);
            }
            
            if (stateSchemes.length > 0) {
                const ssGroup = document.createElement('optgroup');
                ssGroup.label = 'State Schemes';
                stateSchemes.forEach(scheme => {
                    const option = document.createElement('option');
                    option.value = scheme.id;
                    option.textContent = `${scheme.scheme_name} (${scheme.scheme_code})`;
                    option.dataset.type = scheme.scheme_type;
                    option.dataset.benefitType = scheme.benefit_type;
                    ssGroup.appendChild(option);
                });
                schemeSelect.appendChild(ssGroup);
            }
            
            console.log(`Loaded ${data.length} schemes successfully`);
        } else {
            loadFallbackSchemes();
        }
        
    } catch (error) {
        console.error('Error loading schemes:', error);
        loadFallbackSchemes();
    }
}

function loadFallbackSchemes() {
    const schemeSelect = document.getElementById('schemeSelect');
    if (!schemeSelect) return;
    
    schemeSelect.innerHTML = '<option value="">-- Select Scheme --</option>';
    
    const fallbackSchemes = [
        { id: 1, name: 'SubMission on Agroforestry', code: 'CS1', type: 'Centrally Sponsored' },
        { id: 2, name: 'Rajiv Gandhi Nyay Yojana', code: 'SS1', type: 'State Scheme' },
        { id: 3, name: 'National Food Security Mission', code: 'CS8', type: 'Centrally Sponsored' },
        { id: 4, name: 'Godhan Nyay Yojana', code: 'SS7', type: 'State Scheme' },
        { id: 5, name: 'Pradhan Mantri Krishi Sinchai Yojana - Agriculture', code: 'CS12', type: 'Centrally Sponsored' },
        { id: 6, name: 'Kisan Samrudhi Yojana', code: 'SS12', type: 'State Scheme' }
    ];
    
    const csGroup = document.createElement('optgroup');
    csGroup.label = 'Centrally Sponsored Schemes';
    const ssGroup = document.createElement('optgroup');
    ssGroup.label = 'State Schemes';
    
    fallbackSchemes.forEach(scheme => {
        const option = document.createElement('option');
        option.value = scheme.id;
        option.textContent = `${scheme.name} (${scheme.code})`;
        option.dataset.type = scheme.type;
        
        if (scheme.type === 'Centrally Sponsored') {
            csGroup.appendChild(option);
        } else {
            ssGroup.appendChild(option);
        }
    });
    
    schemeSelect.appendChild(csGroup);
    schemeSelect.appendChild(ssGroup);
    
    console.log('Loaded fallback schemes successfully');
}

function loadNotifications() {
    // Simulate notifications - in real app, load from database
    const notifications = [
        { id: 1, message: 'New DBT entry submitted for approval', time: '2 minutes ago', type: 'info' },
        { id: 2, message: 'System backup completed successfully', time: '1 hour ago', type: 'success' },
        { id: 3, message: 'User registration requires approval', time: '3 hours ago', type: 'warning' }
    ];

    if (notifications.length > 0) {
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            notificationBadge.style.display = 'inline-block';
            notificationBadge.textContent = notifications.length;
        }

        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            notificationList.innerHTML = '';

            notifications.forEach(notif => {
                const item = document.createElement('div');
                item.className = 'dropdown-item-text border-bottom pb-2 mb-2';
                item.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${notif.time}</small>
                        <i class="fas fa-${notif.type === 'info' ? 'info-circle text-info' : notif.type === 'success' ? 'check-circle text-success' : 'exclamation-triangle text-warning'}"></i>
                    </div>
                    <div>${notif.message}</div>
                `;
                notificationList.appendChild(item);
            });
        }
    }
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dbtDateInput = document.getElementById('dbtDate');
    if (dbtDateInput) {
        dbtDateInput.value = today;
    }
}

function updateProgress() {
    const formInputs = document.querySelectorAll('#dbtForm input:not([readonly]), #dbtForm select, #dbtForm textarea');
    let filledInputs = 0;
    
    formInputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            if (input.checked) filledInputs++;
        } else if (input.value.trim() !== '') {
            filledInputs++;
        }
    });
    
    formProgress = Math.round((filledInputs / formInputs.length) * 100);
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) progressFill.style.width = formProgress + '%';
    if (progressText) progressText.textContent = formProgress + '%';
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

// Generate unique entry ID
function generateEntryId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `DBT${year}${month}${day}${timestamp}`;
}

// UUID validation helper
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
}

// Collect form data - Explicitly map to database column names
function collectFormData() {
    const formData = {};
    
    // Generate unique entry_id
    formData.entry_id = generateEntryId();
    
    // Basic Information
    formData.scheme_id = parseInt(document.getElementById('schemeSelect')?.value) || null;
    
    // Get scheme name for scheme_select field
    const schemeSelect = document.getElementById('schemeSelect');
    formData.scheme_select = schemeSelect?.options[schemeSelect.selectedIndex]?.textContent || null;
    
    formData.dbt_date = document.getElementById('dbtDate')?.value || null;

    // Budget Allocation (Section A.2)
    formData.central_allocation = parseFloat(document.getElementById('centralAllocation')?.value) || 0;
    formData.state_normative_allocation = parseFloat(document.getElementById('stateNormativeAllocation')?.value) || 0;
    formData.additional_state_allocation = parseFloat(document.getElementById('additionalStateAllocation')?.value) || 0;
    formData.budget_remarks = document.getElementById('budgetRemarks')?.value.trim() || null;

    // Benefits Transferred (Section B.1)
    formData.total_amount_disbursed = parseFloat(document.getElementById('totalAmountDisbursed')?.value) || 0;
    formData.central_share_fund = parseFloat(document.getElementById('centralShareFund')?.value) || 0;
    formData.normative_state_share = parseFloat(document.getElementById('normativeStateShare')?.value) || 0;
    formData.additional_state_contributed = parseFloat(document.getElementById('additionalStateContributed')?.value) || 0;
    formData.state_share_additional = parseFloat(document.getElementById('stateShareAdditional')?.value) || 0;
    formData.non_electronic_disbursed = parseFloat(document.getElementById('nonElectronicDisbursed')?.value) || 0;
    formData.electronic_disbursed = parseFloat(document.getElementById('electronicDisbursed')?.value) || 0;

    // Benefit Details (Section B.2)
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

    // DBT Savings Data (Section B.3)
    formData.deduplication_aadhaar = parseInt(document.getElementById('deduplicationAadhaar')?.value) || 0;
    formData.ghost_beneficiaries = parseInt(document.getElementById('ghostBeneficiaries')?.value) || 0;
    formData.other_savings = parseFloat(document.getElementById('otherSavings')?.value) || 0;
    formData.saving_amount = parseFloat(document.getElementById('savingAmount')?.value) || 0;
    
    return formData;
}

// Handle form submission
async function handleFormSubmission(event) {
    event.preventDefault();
    
    if (!DBTValidation.validateForm()) {
        showAlert('कृपया सभी आवश्यक फील्ड भरें और त्रुटियों को सुधारें।', 'danger');
        return;
    }
    
    isDraftMode = false;
    await saveFormData();
}

// Save as draft
async function saveDraft() {
    isDraftMode = true;
    await saveFormData();
}

// Save form data to database
async function saveFormData() {
    try {
        showLoading(true);
        
        const formData = collectFormData();
        
        // Validate required fields
        if (!formData.entry_id || !formData.dbt_date) {
            throw new Error('Required fields are missing');
        }
        
        // Add status and metadata
        formData.is_draft = isDraftMode;
        formData.status = isDraftMode ? 'draft' : 'pending';
        
        // User information
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
        
        console.log('Sending data:', formData); // Debug log
        
        // Supabase insert
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

// Load draft data
function loadDraftData() {
    const draftData = localStorage.getItem('dbtFormDraft');
    
    if (draftData) {
        try {
            const data = JSON.parse(draftData);
            
            // Explicitly map keys from draft data to form elements
            if (document.getElementById('schemeSelect')) document.getElementById('schemeSelect').value = data.scheme_id || '';
            if (document.getElementById('dbtDate')) document.getElementById('dbtDate').value = data.dbt_date || '';
            if (document.getElementById('centralAllocation')) document.getElementById('centralAllocation').value = data.central_allocation || 0;
            if (document.getElementById('stateNormativeAllocation')) document.getElementById('stateNormativeAllocation').value = data.state_normative_allocation || 0;
            if (document.getElementById('additionalStateAllocation')) document.getElementById('additionalStateAllocation').value = data.additional_state_allocation || 0;
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
            
            DBTCalculations.calculateTotalAmount();
            DBTCalculations.calculateTotalBeneficiaries();
            DBTCalculations.calculateSavings();
            updateProgress();
            
            showAlert('पिछला ड्राफ्ट लोड किया गया।', 'info');
            
        } catch (error) {
            console.error('Error loading draft:', error);
            localStorage.removeItem('dbtFormDraft');
        }
    }
}

// Auto-save draft every 2 minutes
setInterval(() => {
    const formData = collectFormData();
    localStorage.setItem('dbtFormDraft', JSON.stringify(formData));
}, 120000);

// User Profile Functions
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
    if (confirm('क्या आप वाकई फॉर्म रीसेट करना चाहते हैं? सभी डेटा खो जाएगा।')) {
        document.getElementById('dbtForm').reset();
        localStorage.removeItem('dbtFormDraft');
        updateProgress();
        location.reload();
    }
}

function logout() {
    if (confirm('क्या आप वाकई लॉगआउट करना चाहते हैं?')) {
        DBTAuth.logout();
    }
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type) {
    // Remove existing alerts to prevent clutter
    const existingAlerts = document.querySelectorAll('.alert-custom');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-custom`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        <span class="hindi">${message}</span>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    // Insert at top of form-card for visibility
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

// Console welcome message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DBT Data Entry System                     ║
║                संचालनालय कृषि छत्तीसगढ़                      ║
║                                                              ║
║  📊 Advanced Form Validation Active                          ║
║  💾 Auto-save Draft Every 2 Minutes                         ║
║  🧮 Real-time Calculations Enabled                          ║
║  📱 Responsive Design Implemented                            ║
║  🔒 Secure Data Handling                                     ║
║  👑 Admin Controls Available                                 ║
║                                                              ║
║  Keyboard Shortcuts:                                         ║
║  • Ctrl + S: Save Draft                                      ║
║  • Ctrl + Enter: Submit Form                                 ║
║                                                              ║
║  Modular Architecture:                                       ║
║  • dbt-main.js: Core functionality                          ║
║  • dbt-auth.js: Authentication handling                     ║
║  • dbt-validation.js: Form validation                       ║
║  • dbt-calculations.js: Auto calculations                   ║
║  • dbt-admin.js: Admin features                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);


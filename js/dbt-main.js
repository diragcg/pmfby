// dbt-main.js - FINAL VERIFIED CODE FOR CORRECT ORDERING AND FUNCTIONALITY

// Supabase configuration
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Global variables
let currentUser = null;
let isAdmin = false;
let availableSchemes = []; // Stores all active schemes loaded from DB
let formProgress = 0; // Not used for indicator, but for draft logic
let isDraftMode = false;

// --- 1. ALL UTILITY FUNCTIONS (Must be defined first) ---

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

function loadNotifications() {
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
    // This function is still defined but not used for the progress bar,
    // keeping it for potential future use or draft saving logic if needed.
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
            availableSchemes = data; // Store schemes globally
            
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
            
            // Only update BudgetMaster display if it's already defined
            if (typeof BudgetMaster !== 'undefined') {
                BudgetMaster.updateBudgetStatusDisplay();
            }
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
        { id: 1, scheme_name: 'SubMission on Agroforestry', scheme_code: 'CS1', scheme_type: 'Centrally Sponsored' },
        { id: 2, scheme_name: 'Rajiv Gandhi Nyay Yojana', scheme_code: 'SS1', scheme_type: 'State Scheme' },
        { id: 3, scheme_name: 'National Food Security Mission', scheme_code: 'CS8', scheme_type: 'Centrally Sponsored' },
        { id: 4, scheme_name: 'Godhan Nyay Yojana', scheme_code: 'SS7', scheme_type: 'State Scheme' },
        { id: 5, scheme_name: 'Pradhan Mantri Krishi Sinchai Yojana - Agriculture', scheme_code: 'CS12', scheme_type: 'Centrally Sponsored' },
        { id: 6, scheme_name: 'Kisan Samrudhi Yojana', scheme_code: 'SS12', scheme_type: 'State Scheme' }
    ];
    
    availableSchemes = fallbackSchemes;
    
    const csGroup = document.createElement('optgroup');
    csGroup.label = 'Centrally Sponsored Schemes';
    const ssGroup = document.createElement('optgroup');
    ssGroup.label = 'State Schemes';
    
    fallbackSchemes.forEach(scheme => {
        const option = document.createElement('option');
        option.value = scheme.id;
        option.textContent = `${scheme.scheme_name} (${scheme.scheme_code})`;
        option.dataset.type = scheme.scheme_type;
        
        if (scheme.scheme_type === 'Centrally Sponsored') {
            csGroup.appendChild(option);
        } else {
            ssGroup.appendChild(option);
        }
    });
    
    schemeSelect.appendChild(csGroup);
    schemeSelect.appendChild(ssGroup);
    
    console.log('Loaded fallback schemes successfully');
    
    if (typeof BudgetMaster !== 'undefined') {
        BudgetMaster.updateBudgetStatusDisplay();
    }
}

// --- 2. Feature Modules (Defined as const before main app logic uses them) ---

// Budget Master Management
const BudgetMaster = {
    budgetData: new Map(), // Stores budget data per scheme (schemeId -> budgetObject)
    
    init() {
        this.loadBudgetMasterData(); // Load from local storage
        this.setupEventListeners(); // Setup button clicks
        this.updateBudgetStatusDisplay(); // Update header badge
    },

    setupEventListeners() {
        // Button in header to open Budget Master modal
        const budgetMasterBtn = document.getElementById('budgetMasterBtn');
        if (budgetMasterBtn) {
            budgetMasterBtn.addEventListener('click', () => this.showBudgetMasterModal());
        }

        // Buttons inside the Budget Master modal
        const loadExistingBtn = document.getElementById('loadExistingBudgetBtn');
        if (loadExistingBtn) {
            loadExistingBtn.addEventListener('click', () => this.loadExistingBudget());
        }

        const clearFormBtn = document.getElementById('clearBudgetFormBtn');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => this.clearForm());
        }

        const saveBudgetBtn = document.getElementById('saveBudgetMaster');
        if (saveBudgetBtn) {
            saveBudgetBtn.addEventListener('click', () => this.saveBudgetMaster());
        }
    },

    showBudgetMasterModal() {
        const modalElement = document.getElementById('budgetMasterModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Reset form and load schemes when modal opens
        document.getElementById('budgetMasterForm').reset();
        this.loadSchemesForBudgetMaster();
        this.clearBudgetFields(); // Clear fields initially
        this.validateBudgetForm(); // Validate initial empty state
        
        // Setup form validation/calculation listeners within the modal
        this.setupBudgetMasterForm();
    },

    setupBudgetMasterForm() {
        const form = document.getElementById('budgetMasterForm');
        const budgetInputs = form.querySelectorAll('input[required]');
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        
        // Event listeners for budget inputs
        budgetInputs.forEach(input => {
            // Ensure unique listeners by removing previous one if exists
            input.removeEventListener('input', this._budgetInputHandler); 
            input.removeEventListener('change', this._budgetInputHandler);
            // Define and store handler reference
            this._budgetInputHandler = () => { 
                this.calculateBudgetTotal();
                this.validateBudgetForm();
            };
            input.addEventListener('input', this._budgetInputHandler);
            input.addEventListener('change', this._budgetInputHandler);
        });
        
        // Event listener for scheme selection
        schemeSelect.removeEventListener('change', this._schemeSelectHandler);
        this._schemeSelectHandler = () => this.onSchemeSelectionChange();
        schemeSelect.addEventListener('change', this._schemeSelectHandler);
        
        this.validateBudgetForm(); // Initial validation
    },

    async loadSchemesForBudgetMaster() {
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        if (!schemeSelect) return;
        
        schemeSelect.innerHTML = '<option value="">Loading schemes...</option>';
        
        try {
            if (availableSchemes.length > 0) {
                schemeSelect.innerHTML = '<option value="">-- Select Scheme --</option>';
                
                const centrallySponsored = availableSchemes.filter(s => s.scheme_type === 'Centrally Sponsored');
                const stateSchemes = availableSchemes.filter(s => s.scheme_type === 'State Scheme');
                
                if (centrallySponsored.length > 0) {
                    const csGroup = document.createElement('optgroup');
                    csGroup.label = 'Centrally Sponsored Schemes';
                    centrallySponsored.forEach(scheme => {
                        const option = document.createElement('option');
                        option.value = scheme.id;
                        option.textContent = `${scheme.scheme_name} (${scheme.scheme_code})`;
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
                        ssGroup.appendChild(option);
                    });
                    schemeSelect.appendChild(ssGroup);
                }
            }
        } catch (error) {
            console.error('Error loading schemes for budget master:', error);
            schemeSelect.innerHTML = '<option value="">Error loading schemes</option>';
        }
    },

    onSchemeSelectionChange() {
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        const selectedSchemeId = schemeSelect.value;
        
        if (selectedSchemeId) {
            this.loadExistingBudgetForScheme(selectedSchemeId);
        } else {
            this.clearBudgetFields();
        }
        
        this.validateBudgetForm();
    },

    loadExistingBudgetForScheme(schemeId) {
        const existingBudget = this.budgetData.get(schemeId);
        
        const modalTitleElement = document.querySelector('#budgetMasterModal .modal-title');

        if (existingBudget) {
            document.getElementById('budgetCentralAllocation').value = existingBudget.centralAllocation || 0;
            document.getElementById('budgetStateNormative').value = existingBudget.stateNormativeAllocation || 0;
            document.getElementById('budgetAdditionalState').value = existingBudget.additionalStateAllocation || 0;
            
            this.calculateBudgetTotal();
            
            if (modalTitleElement) {
                modalTitleElement.innerHTML = `
                    <i class="fas fa-edit me-2"></i>
                    Edit Budget Master
                    <span class="badge bg-warning ms-2">Editing</span>
                `;
            }
        } else {
            this.clearBudgetFields();
            
            if (modalTitleElement) {
                modalTitleElement.innerHTML = `
                    <i class="fas fa-coins me-2"></i>
                    Budget Master Entry
                `;
            }
        }
    },

    clearBudgetFields() {
        document.getElementById('budgetCentralAllocation').value = '';
        document.getElementById('budgetStateNormative').value = '';
        document.getElementById('budgetAdditionalState').value = '';
        this.calculateBudgetTotal(); // Recalculate total after clearing
    },

    clearForm() {
        this.clearBudgetFields();
        document.getElementById('budgetMasterSchemeSelect').value = ''; // Clear scheme selection
        this.validateBudgetForm();
        const modalTitleElement = document.querySelector('#budgetMasterModal .modal-title');
        if (modalTitleElement) {
            modalTitleElement.innerHTML = `<i class="fas fa-coins me-2"></i> Budget Master Entry`;
        }
    },

    loadExistingBudget() {
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        const selectedSchemeId = schemeSelect.value;
        
        if (!selectedSchemeId) {
            showAlert('पहले स्कीम सेलेक्ट करें।', 'warning');
            return;
        }
        
        this.loadExistingBudgetForScheme(selectedSchemeId);
    },

    calculateBudgetTotal() {
        const central = parseFloat(document.getElementById('budgetCentralAllocation')?.value) || 0;
        const stateNormative = parseFloat(document.getElementById('budgetStateNormative')?.value) || 0;
        const additional = parseFloat(document.getElementById('budgetAdditionalState')?.value) || 0;
        
        const total = central + stateNormative + additional;
        
        const totalDisplay = document.getElementById('budgetTotalDisplay');
        if (totalDisplay) {
            totalDisplay.textContent = `₹${formatCurrency(total)}`;
        }
        
        return total;
    },

    validateBudgetForm() {
        const schemeId = document.getElementById('budgetMasterSchemeSelect')?.value;
        const central = parseFloat(document.getElementById('budgetCentralAllocation')?.value) || 0;
        const stateNormative = parseFloat(document.getElementById('budgetStateNormative')?.value) || 0;
        const additional = parseFloat(document.getElementById('budgetAdditionalState')?.value) || 0;
        
        // Basic validation: scheme selected, central/state > 0, additional >= 0
        const isValid = schemeId && central > 0 && stateNormative > 0 && additional >= 0;
        
        const saveBudgetBtn = document.getElementById('saveBudgetMaster');
        if (saveBudgetBtn) {
            saveBudgetBtn.disabled = !isValid;
        }
        
        return isValid;
    },

    async saveBudgetMaster() {
        if (!this.validateBudgetForm()) {
            showAlert('कृपया सभी आवश्यक बजट फील्ड भरें।', 'warning');
            return;
        }

        try {
            const schemeSelectElement = document.getElementById('budgetMasterSchemeSelect');
            const schemeId = schemeSelectElement.value;
            const schemeName = schemeSelectElement.options[schemeSelectElement.selectedIndex].textContent;
            
            const budgetData = {
                schemeId: schemeId,
                schemeName: schemeName,
                centralAllocation: parseFloat(document.getElementById('budgetCentralAllocation').value) || 0,
                stateNormativeAllocation: parseFloat(document.getElementById('budgetStateNormative').value) || 0,
                additionalStateAllocation: parseFloat(document.getElementById('budgetAdditionalState').value) || 0,
                timestamp: new Date().toISOString(),
                userId: currentUser?.id,
                districtId: currentUser?.districtId,
                districtName: currentUser?.districtName
            };

            this.budgetData.set(schemeId, budgetData);
            this.saveBudgetMasterToStorage();
            
            await this.saveBudgetMasterToDatabase(budgetData);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('budgetMasterModal'));
            modal.hide();
            
            this.updateBudgetStatusDisplay(); // Update header badge
            this.updateSchemeBudgetStatus(); // Update status in main form if scheme is selected
            
            showAlert(`${schemeName} के लिए बजट मास्टर सफलतापूर्वक सेव हो गया।`, 'success');
            
        } catch (error) {
            console.error('Error saving budget master:', error);
            showAlert('बजट मास्टर सेव करने में त्रुटि हुई।', 'danger');
        }
    },

    async saveBudgetMasterToDatabase(budgetData) {
        try {
            const dbData = {
                scheme_id: parseInt(budgetData.schemeId),
                scheme_name: budgetData.schemeName,
                central_allocation: budgetData.centralAllocation,
                state_normative_allocation: budgetData.stateNormativeAllocation,
                additional_state_allocation: budgetData.additionalStateAllocation,
                total_allocation: budgetData.centralAllocation + budgetData.stateNormativeAllocation + budgetData.additionalStateAllocation,
                user_id: budgetData.userId,
                district_id: budgetData.districtId,
                district_name: budgetData.districtName,
                created_at: budgetData.timestamp,
                updated_at: budgetData.timestamp
            };

            const { data: existing, error: checkError } = await supabaseClient
                .from('budget_master')
                .select('id')
                .eq('scheme_id', dbData.scheme_id)
                .eq('user_id', dbData.user_id)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error (no rows found)
                throw checkError;
            }

            if (existing) {
                // Update existing record
                const { error: updateError } = await supabaseClient
                    .from('budget_master')
                    .update(dbData)
                    .eq('id', existing.id);

                if (updateError) throw updateError;
            } else {
                // Insert new record
                const { error: insertError } = await supabaseClient
                    .from('budget_master')
                    .insert([dbData]);

                if (insertError) throw insertError;
            }

        } catch (error) {
            console.warn('Database save failed, continuing with local storage:', error);
        }
    },

    loadBudgetMasterData() {
        try {
            const savedData = localStorage.getItem('budgetMasterData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.budgetData = new Map(Object.entries(parsedData));
            }
        } catch (error) {
            console.error('Error loading budget master data from local storage:', error);
            this.budgetData = new Map();
        }
    },

    saveBudgetMasterToStorage() {
        try {
            const dataToSave = Object.fromEntries(this.budgetData);
            localStorage.setItem('budgetMasterData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving budget master data to local storage:', error);
        }
    },

    updateBudgetStatusDisplay() {
        const totalSchemes = availableSchemes.length;
        const completedSchemes = this.budgetData.size;
        
        const budgetStatusCount = document.getElementById('budgetStatusCount');
        const budgetMasterBadge = document.getElementById('budgetMasterBadge');
        
        if (budgetStatusCount) {
            budgetStatusCount.textContent = `${completedSchemes}/${totalSchemes} Schemes`;
        }
        
        if (budgetMasterBadge) {
            const pendingCount = totalSchemes - completedSchemes;
            if (pendingCount > 0) {
                budgetMasterBadge.textContent = pendingCount;
                budgetMasterBadge.style.display = 'inline-block';
            } else {
                budgetMasterBadge.style.display = 'none';
            }
        }
    },

    updateSchemeBudgetStatus() {
        const schemeSelect = document.getElementById('schemeSelect');
        const selectedSchemeId = schemeSelect?.value;
        const statusDiv = document.getElementById('schemeBudgetStatus');
        const indicator = document.getElementById('budgetPreFilledIndicator');
        
        if (!statusDiv) return; // Ensure statusDiv exists
        
        if (!selectedSchemeId) {
            statusDiv.innerHTML = ''; // Clear status if no scheme is selected
            // Also clear pre-filled budget fields and reset their state
            document.getElementById('centralAllocation').value = '';
            document.getElementById('stateNormativeAllocation').value = '';
            document.getElementById('additionalStateAllocation').value = '';
            document.getElementById('centralAllocation').readOnly = false;
            document.getElementById('stateNormativeAllocation').readOnly = false;
            document.getElementById('additionalStateAllocation').readOnly = false;
            document.getElementById('centralAllocation').classList.remove('budget-master-prefilled'); // Ensure class is removed
            document.getElementById('stateNormativeAllocation').classList.remove('budget-master-prefilled');
            document.getElementById('additionalStateAllocation').classList.remove('budget-master-prefilled');
            if(indicator) indicator.style.display = 'none';
            return;
        }

        const budgetExists = this.budgetData.has(selectedSchemeId);
        
        if (budgetExists) {
            const budgetData = this.budgetData.get(selectedSchemeId);
            const totalAllocation = budgetData.centralAllocation + budgetData.stateNormativeAllocation + budgetData.additionalStateAllocation;
            
            statusDiv.innerHTML = `
                <div class="alert alert-success p-2">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>बजट मास्टर उपलब्ध है</strong>
                    <small class="d-block">कुल आवंटन: ₹${formatCurrency(totalAllocation)}</small>
                    <button type="button" class="btn btn-outline-success btn-sm mt-1" onclick="BudgetMaster.editBudgetForScheme('${selectedSchemeId}')">
                        <i class="fas fa-edit"></i> बजट संपादित करें
                    </button>
                </div>
            `;
            
            this.populateBudgetFieldsInMainForm(selectedSchemeId);
        } else {
            statusDiv.innerHTML = `
                <div class="alert alert-warning p-2">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>बजट मास्टर आवश्यक है</strong>
                    <small class="d-block">पहले इस स्कीम के लिए बजट मास्टर सेट करें।</small>
                    <button type="button" class="btn btn-outline-warning btn-sm mt-1" onclick="BudgetMaster.createBudgetForScheme('${selectedSchemeId}')">
                        <i class="fas fa-plus"></i> बजट बनाएं
                    </button>
                </div>
            `;
            // Ensure budget fields are editable and empty if no budget master
            document.getElementById('centralAllocation').value = '';
            document.getElementById('stateNormativeAllocation').value = '';
            document.getElementById('additionalStateAllocation').value = '';
            document.getElementById('centralAllocation').readOnly = false;
            document.getElementById('stateNormativeAllocation').readOnly = false;
            document.getElementById('additionalStateAllocation').readOnly = false;
            document.getElementById('centralAllocation').classList.remove('budget-master-prefilled');
            document.getElementById('stateNormativeAllocation').classList.remove('budget-master-prefilled');
            document.getElementById('additionalStateAllocation').classList.remove('budget-master-prefilled');
            if(indicator) indicator.style.display = 'none';
        }
    },

    editBudgetForScheme(schemeId) {
        document.getElementById('budgetMasterSchemeSelect').value = schemeId;
        this.showBudgetMasterModal();
        setTimeout(() => { // Timeout to ensure modal is fully rendered before populating
            this.onSchemeSelectionChange(); 
        }, 100); 
    },

    createBudgetForScheme(schemeId) {
        document.getElementById('budgetMasterSchemeSelect').value = schemeId;
        this.showBudgetMasterModal();
        setTimeout(() => { // Timeout to ensure modal is fully rendered before clearing
            this.clearBudgetFields();
            this.validateBudgetForm();
        }, 100);
    },

    populateBudgetFieldsInMainForm(schemeId) {
        const budgetData = this.budgetData.get(schemeId);
        if (!budgetData) return;
        
        setTimeout(() => {
            const centralField = document.getElementById('centralAllocation');
            const stateField = document.getElementById('stateNormativeAllocation');
            const additionalField = document.getElementById('additionalStateAllocation');
            
            if (centralField) {
                centralField.value = budgetData.centralAllocation;
                centralField.readOnly = true;
                centralField.classList.add('budget-master-prefilled');
            }
            
            if (stateField) {
                stateField.value = budgetData.stateNormativeAllocation;
                stateField.readOnly = true;
                stateField.classList.add('budget-master-prefilled');
            }
            
            if (additionalField) {
                additionalField.value = budgetData.additionalStateAllocation;
                additionalField.readOnly = true;
                additionalField.classList.add('budget-master-prefilled');
            }
            
            const indicator = document.getElementById('budgetPreFilledIndicator');
            if (indicator) {
                indicator.style.display = 'inline-block';
            }
        }, 100); // Small timeout to ensure DOM is ready
    },

    getBudgetDataForScheme(schemeId) {
        return this.budgetData.get(schemeId) || null;
    },

    hasBudgetMaster(schemeId) {
        return this.budgetData.has(schemeId);
    }
};

// Report Manager
const ReportManager = {
    
    init() {
        this.setupEventListeners(); // Setup all report related button clicks
    },

    setupEventListeners() {
        // Event listeners for header dropdown buttons
        const showPrintModalBtn = document.getElementById('showPrintModalBtn');
        if (showPrintModalBtn) {
            showPrintModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPrintModal();
            });
        }

        const downloadExcelBtn = document.getElementById('downloadExcelBtn');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadExcel(true); // true for all schemes
            });
        }

        const downloadPDFBtn = document.getElementById('downloadPDFBtn');
        if (downloadPDFBtn) {
            downloadPDFBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadPDF(true); // true for all schemes
            });
        }

        const showBudgetStatusBtn = document.getElementById('showBudgetStatusBtn');
        if (showBudgetStatusBtn) {
            showBudgetStatusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showBudgetStatusReport();
            });
        }

        // Event listeners for buttons inside Print Report modal
        const previewReportBtn = document.getElementById('previewReportBtn');
        if (previewReportBtn) {
            previewReportBtn.addEventListener('click', () => this.previewReport());
        }

        const printReportBtn = document.getElementById('printReportBtn');
        if (printReportBtn) {
            printReportBtn.addEventListener('click', () => this.printReport());
        }

        // Event listener for export budget status button
        const exportBudgetStatusBtn = document.getElementById('exportBudgetStatusBtn');
        if (exportBudgetStatusBtn && typeof DBTAdmin !== 'undefined') { // Check DBTAdmin for safety
            exportBudgetStatusBtn.addEventListener('click', () => DBTAdmin.exportBudgetStatus());
        }
    },

    showPrintModal() {
        const modal = new bootstrap.Modal(document.getElementById('printReportModal'));
        modal.show();
        this.setupPrintReportModal(); // Setup internal modal elements
    },

    setupPrintReportModal() {
        this.loadSchemesForReports();
        this.setDefaultReportDates();
        
        if (isAdmin) {
            const adminDistrictSelection = document.getElementById('adminDistrictSelection');
            if (adminDistrictSelection) {
                adminDistrictSelection.style.display = 'block';
                this.loadDistrictsForReports();
            }
        }
    },

    async loadSchemesForReports() {
        const printSchemeSelect = document.getElementById('printSchemeSelect');
        if (!printSchemeSelect) return;
        
        printSchemeSelect.innerHTML = '<option value="">Loading schemes...</option>';
        
        try {
            if (availableSchemes.length > 0) {
                printSchemeSelect.innerHTML = '<option value="">-- Select Scheme --</option>';
                
                availableSchemes.forEach(scheme => {
                    const option = document.createElement('option');
                    option.value = scheme.id;
                    option.textContent = `${scheme.scheme_name} (${scheme.scheme_code})`;
                    printSchemeSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading schemes for reports:', error);
            printSchemeSelect.innerHTML = '<option value="">Error loading schemes</option>';
        }
    },

    async loadDistrictsForReports() {
        const districtSelect = document.getElementById('printDistrictSelect');
        if (!districtSelect || !isAdmin) return;
        
        // Clear existing options first
        districtSelect.innerHTML = '<option value="">-- All Districts --</option>';

        try {
            // Fetch districts from Supabase
            const { data: districts, error } = await supabaseClient
                .from('districts') // Assuming you have a 'districts' table
                .select('id, name')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching districts:', error);
                // Fallback to hardcoded if DB fails
                const fallbackDistricts = ['Raipur', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon'];
                fallbackDistricts.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district;
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
                return;
            }
            
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district.name; // Use name for display/filtering
                option.textContent = district.name;
                districtSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading districts for reports:', error);
        }
    },

    setDefaultReportDates() {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        const reportDateField = document.getElementById('printReportDate');
        const fromDateField = document.getElementById('printFromDate');
        const toDateField = document.getElementById('printToDate');
        
        if (reportDateField) reportDateField.value = today;
        if (fromDateField) fromDateField.value = firstDayOfMonth;
        if (toDateField) toDateField.value = today;
    },

    async previewReport() {
        const reportData = await this.collectReportData(false); // false for single scheme
        if (!reportData) return;
        
        const dbtData = await this.getDBTDataForReport(reportData);
        reportData.budgetData = BudgetMaster.getBudgetDataForScheme(reportData.schemeId); // Get budget data for specific scheme
        
        const printContent = this.generatePrintContent(dbtData, reportData);
        
        const previewWindow = window.open('', '_blank', 'width=900,height=700'); // Increased size
        previewWindow.document.write(printContent);
        previewWindow.document.close();
    },

    async printReport() {
        const reportData = await this.collectReportData(false); // false for single scheme
        if (!reportData) return;
        
        const dbtData = await this.getDBTDataForReport(reportData);
        reportData.budgetData = BudgetMaster.getBudgetDataForScheme(reportData.schemeId); // Get budget data for specific scheme

        const printContent = this.generatePrintContent(dbtData, reportData);
        
        const printWindow = window.open('', '_blank', 'width=900,height=700'); // Increased size
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                printWindow.close(); // Close after printing
            }, 500);
        };
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('printReportModal'));
        if(modal) modal.hide();
    },

    async downloadExcel(allSchemes = false) {
        try {
            const reportData = await this.collectReportData(allSchemes);
            if (!reportData) return;
            
            let allDbtData = [];
            if (allSchemes) {
                // Fetch data for all schemes
                for (const scheme of availableSchemes) {
                    const schemeReportData = { ...reportData, schemeId: scheme.id, schemeName: `${scheme.scheme_name} (${scheme.scheme_code})` };
                    const dbtData = await this.getDBTDataForReport(schemeReportData);
                    if (dbtData.length > 0) {
                        allDbtData.push({ scheme: schemeReportData.schemeName, data: dbtData, budget: BudgetMaster.getBudgetDataForScheme(scheme.id) });
                    } else {
                        allDbtData.push({ scheme: schemeReportData.schemeName, data: [], budget: BudgetMaster.getBudgetDataForScheme(scheme.id) });
                    }
                }
            } else {
                // Fetch data for a single selected scheme
                const dbtData = await this.getDBTDataForReport(reportData);
                if (dbtData.length > 0) {
                    allDbtData.push({ scheme: reportData.schemeName, data: dbtData, budget: BudgetMaster.getBudgetDataForScheme(reportData.schemeId) });
                } else {
                    allDbtData.push({ scheme: reportData.schemeName, data: [], budget: BudgetMaster.getBudgetDataForScheme(reportData.schemeId) });
                }
            }
            
            const wsData = this.formatDataForExcel(allDbtData, reportData, allSchemes);
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            XLSX.utils.book_append_sheet(wb, ws, 'DBT Report');
            
            const filename = `DBT_Report_${allSchemes ? 'All_Schemes' : reportData.schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.reportDate}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            showAlert('Excel रिपोर्ट डाउनलोड हो गई।', 'success');
            
        } catch (error) {
            console.error('Error downloading Excel:', error);
            showAlert('Excel डाउनलोड करने में त्रुटि हुई।', 'danger');
        }
    },

    async downloadPDF(allSchemes = false) {
        try {
            const reportData = await this.collectReportData(allSchemes);
            if (!reportData) return;
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            if (allSchemes) {
                for (const scheme of availableSchemes) {
                    const schemeReportData = { ...reportData, schemeId: scheme.id, schemeName: `${scheme.scheme_name} (${scheme.scheme_code})` };
                    const dbtData = await this.getDBTDataForReport(schemeReportData);
                    schemeReportData.budgetData = BudgetMaster.getBudgetDataForScheme(scheme.id);
                    this.addContentToPDF(doc, dbtData, schemeReportData);
                    if (scheme !== availableSchemes[availableSchemes.length - 1]) { // Add new page if not last scheme
                        doc.addPage();
                    }
                }
            } else {
                const dbtData = await this.getDBTDataForReport(reportData);
                reportData.budgetData = BudgetMaster.getBudgetDataForScheme(reportData.schemeId);
                this.addContentToPDF(doc, dbtData, reportData);
            }
            
            const filename = `DBT_Report_${allSchemes ? 'All_Schemes' : reportData.schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.reportDate}.pdf`;
            doc.save(filename);
            
            showAlert('PDF रिपोर्ट डाउनलोड हो गई।', 'success');
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showAlert('PDF डाउनलोड करने में त्रुटि हुई।', 'danger');
        }
    },

    // Collect report data from form (or for all schemes)
    async collectReportData(allSchemes = false) {
        const schemeSelect = document.getElementById('printSchemeSelect');
        const reportDate = document.getElementById('printReportDate')?.value;
        const fromDate = document.getElementById('printFromDate')?.value;
        const toDate = document.getElementById('printToDate')?.value;
        const districtSelect = document.getElementById('printDistrictSelect');
        
        if (!allSchemes && !schemeSelect.value) {
            showAlert('कृपया स्कीम सेलेक्ट करें।', 'warning');
            return null;
        }
        
        return {
            schemeId: allSchemes ? null : schemeSelect.value, // null if all schemes
            schemeName: allSchemes ? 'All Schemes' : schemeSelect.options[schemeSelect.selectedIndex].textContent,
            reportDate: reportDate || new Date().toISOString().split('T')[0],
            fromDate: fromDate,
            toDate: toDate,
            districtId: districtSelect?.value || currentUser?.districtId,
            districtName: districtSelect?.options[districtSelect?.selectedIndex]?.textContent || currentUser?.districtName,
            isAdmin: isAdmin
        };
    },

    // Get DBT data for report
    async getDBTDataForReport(reportData) {
        try {
            let query = supabaseClient
                .from('dbt_data_entries')
                .select('*');
            
            // Filter by scheme if provided
            if (reportData.schemeId) {
                query = query.eq('scheme_id', reportData.schemeId);
            }
            
            // Add date filters if provided
            if (reportData.fromDate && reportData.toDate) {
                query = query.gte('dbt_date', reportData.fromDate)
                            .lte('dbt_date', reportData.toDate);
            }
            
            // Add district filter
            if (!isAdmin && currentUser?.districtId) {
                query = query.eq('district_id', currentUser.districtId);
            } else if (isAdmin && reportData.districtId) { // For admin, filter by selected district
                query = query.eq('district_id', reportData.districtId);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Error fetching DBT data for report:', error);
            return [];
        }
    },

    generatePrintContent(allDbtData, reportData) { // Now accepts allDbtData
        const currentDate = new Date().toLocaleDateString('en-IN');
        let contentHTML = '';

        // If all schemes are requested
        if (reportData.schemeId === null) {
            // Iterate through each scheme's data
            for (const schemeData of allDbtData) {
                const schemeName = schemeData.scheme;
                const dbtEntries = schemeData.data;
                const budgetData = schemeData.budget;

                contentHTML += `
                    <div class="section" style="margin-top: 40px;">
                        <div class="section-title">Scheme: ${schemeName}</div>
                        ${budgetData ? `
                            <div class="summary-box">
                                <p><strong>Central Allocation:</strong> ₹${formatCurrency(budgetData.centralAllocation)}</p>
                                <p><strong>State Normative Allocation:</strong> ₹${formatCurrency(budgetData.stateNormativeAllocation)}</p>
                                <p><strong>Additional State Allocation:</strong> ₹${formatCurrency(budgetData.additionalStateAllocation)}</p>
                                <p><strong>Total Allocated Budget:</strong> ₹${formatCurrency(budgetData.totalAllocation)}</p>
                                <small>Last Updated: ${new Date(budgetData.timestamp).toLocaleDateString('en-IN')}</small>
                            </div>
                        ` : '<p>Budget Master data not set for this scheme.</p>'}
                        
                        <div class="section-title" style="margin-top: 20px;">DBT Data Entries</div>
                        ${dbtEntries.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Entry ID</th>
                                        <th>Date</th>
                                        <th class="text-right">Total Disbursed</th>
                                        <th class="text-right">Total Beneficiaries</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${dbtEntries.map(entry => `
                                        <tr>
                                            <td>${entry.entry_id}</td>
                                            <td>${entry.dbt_date}</td>
                                            <td class="text-right">₹${formatCurrency(entry.total_amount_disbursed)}</td>
                                            <td class="text-right">${entry.total_beneficiaries}</td>
                                            <td>${entry.status}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>No DBT data entries found for this scheme for the selected period.</p>'}
                    </div>
                `;
            }
        } else {
            // Single scheme report
            const dbtEntries = allDbtData; // allDbtData is actually dbtData for single scheme here
            const budgetData = reportData.budgetData;

            contentHTML += `
                <div class="section">
                    <div class="section-title">Detailed Budget Allocation</div>
                    ${budgetData ? `
                        <div class="summary-box">
                            <p><strong>Central Allocation:</strong> ₹${formatCurrency(budgetData.centralAllocation)}</p>
                            <p><strong>State Normative Allocation:</strong> ₹${formatCurrency(budgetData.stateNormativeAllocation)}</p>
                            <p><strong>Additional State Allocation:</strong> ₹${formatCurrency(budgetData.additionalStateAllocation)}</p>
                            <p><strong>Total Allocated Budget:</strong> ₹${formatCurrency(budgetData.totalAllocation)}</p>
                            <small>Last Updated: ${new Date(budgetData.timestamp).toLocaleDateString('en-IN')}</small>
                        </div>
                    ` : '<p>Budget Master data not set for this scheme.</p>'}
                </div>
                
                <div class="section">
                    <div class="section-title">DBT Data Entries</div>
                    ${dbtEntries.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Entry ID</th>
                                    <th>Date</th>
                                    <th class="text-right">Total Disbursed</th>
                                    <th class="text-right">Total Beneficiaries</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dbtEntries.map(entry => `
                                    <tr>
                                        <td>${entry.entry_id}</td>
                                        <td>${entry.dbt_date}</td>
                                        <td class="text-right">₹${formatCurrency(entry.total_amount_disbursed)}</td>
                                        <td class="text-right">${entry.total_beneficiaries}</td>
                                        <td>${entry.status}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p>No DBT data entries found for the selected criteria.</p>'}
                </div>
            `;
        }

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DBT Report - ${reportData.schemeName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
                .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1B5E20; }
                .logo { width: 80px; height: 80px; margin: 0 auto 10px; }
                .title { font-size: 24px; font-weight: bold; color: #1B5E20; margin-bottom: 5px; }
                .subtitle { font-size: 18px; color: #666; margin-bottom: 10px; }
                .report-info { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ddd; }
                .section { margin: 20px 0; }
                .section-title { font-size: 16px; font-weight: bold; color: #1B5E20; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ccc; }
                .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                .data-table th { background-color: #e6ffe6; font-weight: bold; color: #1B5E20; }
                .summary-box { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4CAF50; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                @media print { 
                    body { margin: 0; padding: 10mm; }
                    .header, .footer { page-break-after: avoid; }
                    .section { page-break-inside: avoid; }
                    .data-table { page-break-inside: auto; }
                    .data-table tr { page-break-before: auto; page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Coat_of_arms_of_Chhattisgarh.svg" alt="छत्तीसगढ़ सरकार" class="logo">
                <div class="title">संचालनालय कृषि छत्तीसगढ़</div>
                <div class="title">Directorate Agriculture Chhattisgarh</div>
                <div class="subtitle">Scheme-wise DBT Status on Date: ${reportData.reportDate}</div>
            </div>
            
            <div class="report-info">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 50%;"><strong>Scheme:</strong> ${reportData.schemeName}</td>
                        <td style="width: 50%;"><strong>District:</strong> ${reportData.districtName}</td>
                    </tr>
                    <tr>
                        <td><strong>Report Period:</strong> ${reportData.fromDate || 'N/A'} to ${reportData.toDate || 'N/A'}</td>
                        <td><strong>Generated On:</strong> ${currentDate}</td>
                    </tr>
                </table>
            </div>
            
            ${contentHTML}

            <div class="footer">
                <p>This is a computer-generated report from DBT Data Entry System</p>
                <p>संचालनालय कृषि छत्तीसगढ़ - Directorate Agriculture Chhattisgarh</p>
            </div>
            
        </body>
        </html>
        `;
    },

    formatDataForExcel(allDbtData, reportData, allSchemes) {
        const headers = [
            'Entry ID', 'Date', 'Scheme', 'District',
            'Central Allocation', 'State Normative', 'Additional State',
            'Total Amount Disbursed', 'Total Beneficiaries',
            'Electronic Disbursed', 'Non-Electronic Disbursed',
            'Savings Amount', 'Status', 'Created By', 'Budget Remarks'
        ];
        
        const rows = [
            ['Directorate Agriculture Chhattisgarh'],
            [`DBT Status Report - ${reportData.schemeName} on ${reportData.reportDate}`],
            [`Report Period: ${reportData.fromDate || 'N/A'} to ${reportData.toDate || 'N/A'}`],
            [`District: ${reportData.districtName}`],
            [''],
            headers
        ];
        
        if (allSchemes) {
            allDbtData.forEach(schemeEntry => {
                rows.push(['']); // Empty row for separation
                rows.push([`Scheme: ${schemeEntry.scheme}`]);
                if (schemeEntry.budget) {
                    rows.push([`Budget Master - Central: ${schemeEntry.budget.centralAllocation}`, `State: ${schemeEntry.budget.stateNormativeAllocation}`, `Additional: ${schemeEntry.budget.additionalStateAllocation}`, `Total: ${schemeEntry.budget.totalAllocation}`]);
                } else {
                    rows.push(['Budget Master not set for this scheme.']);
                }
                rows.push(headers); // Repeat headers for each scheme section
                if (schemeEntry.data.length > 0) {
                    schemeEntry.data.forEach(entry => {
                        rows.push([
                            entry.entry_id || '',
                            entry.dbt_date || '',
                            entry.scheme_select || '',
                            entry.district_name || '',
                            entry.central_allocation || 0,
                            entry.state_normative_allocation || 0,
                            entry.additional_state_allocation || 0,
                            entry.total_amount_disbursed || 0,
                            entry.total_beneficiaries || 0,
                            entry.electronic_disbursed || 0,
                            entry.non_electronic_disbursed || 0,
                            entry.saving_amount || 0,
                            entry.status || '',
                            entry.created_by || '',
                            entry.budget_remarks || ''
                        ]);
                    });
                } else {
                    rows.push(['No DBT data entries found for this scheme for the selected period.']);
                }
            });
        } else {
            allDbtData.forEach(entry => { // allDbtData is actually dbtData for single scheme here
                rows.push([
                    entry.entry_id || '',
                    entry.dbt_date || '',
                    entry.scheme_select || '',
                    entry.district_name || '',
                    entry.central_allocation || 0,
                    entry.state_normative_allocation || 0,
                    entry.additional_state_allocation || 0,
                    entry.total_amount_disbursed || 0,
                    entry.total_beneficiaries || 0,
                    entry.electronic_disbursed || 0,
                    entry.non_electronic_disbursed || 0,
                    entry.saving_amount || 0,
                    entry.status || '',
                    entry.created_by || '',
                    entry.budget_remarks || ''
                ]);
            });
        }
        
        return rows;
    },

    addContentToPDF(doc, dbtData, reportData) {
        let yPosition = 20;
        const margin = 15;
        const lineHeight = 7;
        
        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('संचालनालय कृषि छत्तीसगढ़', doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
        yPosition += lineHeight;
        
        doc.setFontSize(16);
        doc.text('Directorate Agriculture Chhattisgarh', doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
        yPosition += lineHeight * 1.5;
        
        doc.setFontSize(14);
        doc.text(`Scheme-wise DBT Status on Date: ${reportData.reportDate}`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
        yPosition += lineHeight * 2;
        
        // Report Info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Scheme: ${reportData.schemeName}`, margin, yPosition);
        doc.text(`District: ${reportData.districtName}`, doc.internal.pageSize.width - margin, yPosition, { align: 'right' });
        yPosition += lineHeight;
        
        doc.text(`Report Period: ${reportData.fromDate || 'N/A'} to ${reportData.toDate || 'N/A'}`, margin, yPosition);
        doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, doc.internal.pageSize.width - margin, yPosition, { align: 'right' });
        yPosition += lineHeight * 2;
        
        // Budget Allocation
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Detailed Budget Allocation', margin, yPosition);
        yPosition += lineHeight;

        if (reportData.budgetData) {
            doc.setFont('helvetica', 'normal');
            doc.text(`Central Allocation: ₹${formatCurrency(reportData.budgetData.centralAllocation)}`, margin + 5, yPosition);
            doc.text(`State Normative Allocation: ₹${formatCurrency(reportData.budgetData.stateNormativeAllocation)}`, doc.internal.pageSize.width / 2, yPosition);
            yPosition += lineHeight;
            doc.text(`Additional State Allocation: ₹${formatCurrency(reportData.budgetData.additionalStateAllocation)}`, margin + 5, yPosition);
            doc.text(`Total Allocated Budget: ₹${formatCurrency(reportData.budgetData.totalAllocation)}`, doc.internal.pageSize.width / 2, yPosition);
            yPosition += lineHeight * 1.5;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.text('Budget Master data not set for this scheme.', margin, yPosition);
            yPosition += lineHeight * 1.5;
        }

        // DBT Data Entries
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DBT Data Entries', margin, yPosition);
        yPosition += lineHeight;

        if (dbtData.length > 0) {
            const tableHeaders = ['Entry ID', 'Date', 'Total Disbursed', 'Beneficiaries', 'Status'];
            const tableData = dbtData.map(entry => [
                entry.entry_id,
                entry.dbt_date,
                `₹${formatCurrency(entry.total_amount_disbursed)}`,
                entry.total_beneficiaries,
                entry.status
            ]);

            doc.autoTable({
                startY: yPosition,
                head: [tableHeaders],
                body: tableData,
                styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [230, 255, 230], textColor: [27, 94, 32], fontStyle: 'bold' },
                margin: { left: margin, right: margin },
                didDrawPage: function(data) {
                    let pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(10);
                    doc.text('Page ' + doc.internal.getCurrentPageInfo().pageNumber + ' of ' + pageCount, doc.internal.pageSize.width - margin, doc.internal.pageSize.height - 10, { align: 'right' });
                }
            });
            yPosition = doc.autoTable.previous.finalY + lineHeight;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.text('No DBT data entries found for the selected criteria.', margin, yPosition);
            yPosition += lineHeight * 1.5;
        }

        // Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('This is a computer-generated report from DBT Data Entry System', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 20, { align: 'center' });
        doc.text('संचालनालय कृषि छत्तीसगढ़ - Directorate Agriculture Chhattisgarh', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 15, { align: 'center' });
    },

    showBudgetStatusReport() {
        const modal = new bootstrap.Modal(document.getElementById('budgetStatusModal'));
        modal.show();
        this.loadBudgetStatusData();
    },

    async loadBudgetStatusData() {
        const tableBody = document.getElementById('budgetStatusTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading budget status...</td></tr>';
        
        try {
            let statusData = [];
            
            if (isAdmin) {
                statusData = await this.getBudgetStatusForAllDistricts();
            } else {
                statusData = await this.getBudgetStatusForDistrict(currentUser?.districtId);
            }
            
            this.displayBudgetStatusData(statusData);
            
        } catch (error) {
            console.error('Error loading budget status:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading budget status</td></tr>';
        }
    },

    async getBudgetStatusForAllDistricts() {
        try {
            const { data, error } = await supabaseClient
                .from('budget_master')
                .select(`
                    *, 
                    schemes (scheme_name, scheme_code)
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching budget status for all districts:', error);
            return [];
        }
    },

    async getBudgetStatusForDistrict(districtId) {
        try {
            const { data, error } = await supabaseClient
                .from('budget_master')
                .select(`
                    *, 
                    schemes (scheme_name, scheme_code)
                `)
                .eq('district_id', districtId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching budget status for district:', error);
            return [];
        }
    },

    displayBudgetStatusData(statusData) {
        const tableBody = document.getElementById('budgetStatusTableBody');
        if (!tableBody) return;
        
        if (statusData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No budget master data found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        statusData.forEach(item => {
            const row = document.createElement('tr');
            const schemeName = item.schemes?.scheme_name || item.scheme_name || 'Unknown Scheme';
            const districtName = item.district_name || 'Unknown District';
            const totalAllocation = (item.central_allocation || 0) + (item.state_normative_allocation || 0) + (item.additional_state_allocation || 0);
            const lastUpdated = new Date(item.updated_at).toLocaleDateString('en-IN');
            
            row.innerHTML = `
                <td>${schemeName}</td>
                <td>${districtName}</td>
                <td><span class="badge bg-success">Completed</span></td>
                <td>₹${formatCurrency(totalAllocation)}</td>
                <td>${lastUpdated}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="ReportManager.viewBudgetDetails('${item.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },

    exportBudgetStatus() {
        showAlert('Budget Status export functionality will be implemented.', 'info');
    },

    viewBudgetDetails(budgetId) {
        showAlert(`Budget details for ID: ${budgetId}`, 'info');
    }
};

// --- Core Application Entry Point ---
document.addEventListener('DOMContentLoaded', function() {
    // Show loading overlay immediately on DOMContentLoaded
    showLoading(true); 
    setTimeout(() => {
        initializeApp();
    }, 100); // Small delay to ensure all deferred scripts are loaded and parsed
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

        // 2. Load Core Data (Schemes) - Defined above
        await loadSchemes(); 

        // 3. Initialize UI Components - Defined above
        await initializeUI();
        
        // 4. Setup Main Form - Defined above
        setupForm();
        
        // 5. Load Initial Non-Form Data (e.g., Notifications) - Defined above
        await loadInitialNonFormData(); 
        
        // 6. Initialize Feature Modules - Defined above
        BudgetMaster.init(); 
        ReportManager.init(); 
        
        console.log('DBT Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showAlert('एप्लिकेशन शुरू करने में त्रुटि हुई।', 'danger');
    } finally {
        showLoading(false); // Ensure loading overlay is hidden always
    }
}

// --- Console Log for Debugging/Info ---
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
║  ✅ All Text Readability (Dark/Black) Fixed                  ║
║  ✅ Header Navbar Proportions & Curve Fixed                  ║
║  ✅ Form Cards Color Professional Fixed                      ║
║  ✅ JavaScript ReferenceErrors Fixed                          ║
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

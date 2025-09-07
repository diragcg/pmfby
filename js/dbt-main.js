
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
let availableSchemes = [];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all deferred scripts are loaded
    setTimeout(() => {
        initializeApp();
    }, 100);
});

async function initializeApp() {
    try {
        // Wait for all modules to be loaded
        await waitForModules();
        
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
        
        // Initialize Budget Master and Report Manager
        BudgetMaster.init();
        ReportManager.init();
        
        console.log('DBT Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showAlert('एप्लिकेशन शुरू करने में त्रुटि हुई।', 'danger');
    }
}

// Wait for all required modules to be loaded
function waitForModules() {
    return new Promise((resolve) => {
        const checkModules = () => {
            if (typeof DBTAuth !== 'undefined' && 
                typeof DBTValidation !== 'undefined' && 
                typeof DBTCalculations !== 'undefined') {
                resolve();
            } else {
                setTimeout(checkModules, 50); // Check every 50ms
            }
        };
        checkModules();
    });
}

// Budget Master Management - Redesigned
const BudgetMaster = {
    budgetData: new Map(), // Store budget data per scheme
    
    init() {
        this.loadBudgetMasterData();
        this.updateBudgetStatusDisplay();
    },

    // Show budget master modal (manual trigger)
    showBudgetMasterModal() {
        const modal = new bootstrap.Modal(document.getElementById('budgetMasterModal'));
        modal.show();
        
        // Setup budget master form
        this.setupBudgetMasterForm();
        
        // Load schemes in budget master modal
        this.loadSchemesForBudgetMaster();
    },

    // Setup budget master form functionality
    setupBudgetMasterForm() {
        const form = document.getElementById('budgetMasterForm');
        const saveBudgetBtn = document.getElementById('saveBudgetMaster');
        const budgetInputs = form.querySelectorAll('input[required]');
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        
        // Setup real-time total calculation
        budgetInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateBudgetTotal();
                this.validateBudgetForm();
            });
        });
        
        // Setup scheme selection handler
        schemeSelect.addEventListener('change', () => {
            this.onSchemeSelectionChange();
        });
        
        // Setup save button
        saveBudgetBtn.addEventListener('click', () => this.saveBudgetMaster());
        
        // Initial validation
        this.validateBudgetForm();
    },

    // Load schemes for budget master modal
    async loadSchemesForBudgetMaster() {
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        if (!schemeSelect) return;
        
        schemeSelect.innerHTML = '<option value="">Loading schemes...</option>';
        
        try {
            // Use the same schemes data as main form
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
                        option.dataset.type = scheme.scheme_type;
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

    // Handle scheme selection change in budget master
    onSchemeSelectionChange() {
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        const selectedSchemeId = schemeSelect.value;
        
        if (selectedSchemeId) {
            // Load existing budget data for this scheme if available
            this.loadExistingBudgetForScheme(selectedSchemeId);
        } else {
            this.clearBudgetFields();
        }
        
        this.validateBudgetForm();
    },

    // Load existing budget for selected scheme
    loadExistingBudgetForScheme(schemeId) {
        const existingBudget = this.budgetData.get(schemeId);
        
        if (existingBudget) {
            document.getElementById('budgetCentralAllocation').value = existingBudget.centralAllocation || 0;
            document.getElementById('budgetStateNormative').value = existingBudget.stateNormativeAllocation || 0;
            document.getElementById('budgetAdditionalState').value = existingBudget.additionalStateAllocation || 0;
            
            this.calculateBudgetTotal();
            
            // Show edit mode indicator
            const modal = document.querySelector('#budgetMasterModal .modal-title');
            if (modal) {
                modal.innerHTML = `
                    <i class="fas fa-edit me-2"></i>
                    Edit Budget Master
                    <span class="badge bg-warning ms-2">Editing</span>
                `;
            }
        } else {
            this.clearBudgetFields();
            
            // Show add mode indicator
            const modal = document.querySelector('#budgetMasterModal .modal-title');
            if (modal) {
                modal.innerHTML = `
                    <i class="fas fa-coins me-2"></i>
                    Budget Master Entry
                `;
            }
        }
    },

    // Clear budget fields
    clearBudgetFields() {
        document.getElementById('budgetCentralAllocation').value = '';
        document.getElementById('budgetStateNormative').value = '';
        document.getElementById('budgetAdditionalState').value = '';
        this.calculateBudgetTotal();
    },

    // Clear form (button handler)
    clearForm() {
        this.clearBudgetFields();
        document.getElementById('budgetMasterSchemeSelect').value = '';
        this.validateBudgetForm();
    },

    // Load existing budget (button handler)
    loadExistingBudget() {
        const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
        const selectedSchemeId = schemeSelect.value;
        
        if (!selectedSchemeId) {
            showAlert('पहले स्कीम सेलेक्ट करें।', 'warning');
            return;
        }
        
        this.loadExistingBudgetForScheme(selectedSchemeId);
    },

    // Calculate total budget
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

    // Validate budget master form
    validateBudgetForm() {
        const schemeId = document.getElementById('budgetMasterSchemeSelect')?.value;
        const central = parseFloat(document.getElementById('budgetCentralAllocation')?.value) || 0;
        const stateNormative = parseFloat(document.getElementById('budgetStateNormative')?.value) || 0;
        const additional = parseFloat(document.getElementById('budgetAdditionalState')?.value) || 0;
        
        const isValid = schemeId && central > 0 && stateNormative > 0 && additional >= 0;
        
        const saveBudgetBtn = document.getElementById('saveBudgetMaster');
        if (saveBudgetBtn) {
            saveBudgetBtn.disabled = !isValid;
        }
        
        return isValid;
    },

    // Save budget master data
    async saveBudgetMaster() {
        if (!this.validateBudgetForm()) {
            showAlert('कृपया सभी आवश्यक बजट फील्ड भरें।', 'warning');
            return;
        }

        try {
            const schemeId = document.getElementById('budgetMasterSchemeSelect').value;
            const schemeSelect = document.getElementById('budgetMasterSchemeSelect');
            const schemeName = schemeSelect.options[schemeSelect.selectedIndex].textContent;
            
            // Collect budget data
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

            // Save to local storage (scheme-wise)
            this.budgetData.set(schemeId, budgetData);
            this.saveBudgetMasterToStorage();
            
            // Save to database
            await this.saveBudgetMasterToDatabase(budgetData);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('budgetMasterModal'));
            modal.hide();
            
            // Update displays
            this.updateBudgetStatusDisplay();
            this.updateSchemeBudgetStatus();
            
            showAlert(`${schemeName} के लिए बजट मास्टर सफलतापूर्वक सेव हो गया।`, 'success');
            
        } catch (error) {
            console.error('Error saving budget master:', error);
            showAlert('बजट मास्टर सेव करने में त्रुटि हुई।', 'danger');
        }
    },

    // Save budget master to database
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

            // Check if budget master already exists for this scheme and user
            const { data: existing, error: checkError } = await supabaseClient
                .from('budget_master')
                .select('id')
                .eq('scheme_id', dbData.scheme_id)
                .eq('user_id', dbData.user_id)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
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
            // Continue with local storage even if database fails
        }
    },

    // Load budget master data from storage
    loadBudgetMasterData() {
        try {
            const savedData = localStorage.getItem('budgetMasterData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.budgetData = new Map(Object.entries(parsedData));
            }
        } catch (error) {
            console.error('Error loading budget master data:', error);
            this.budgetData = new Map();
        }
    },

    // Save budget master data to storage
    saveBudgetMasterToStorage() {
        try {
            const dataToSave = Object.fromEntries(this.budgetData);
            localStorage.setItem('budgetMasterData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving budget master data to storage:', error);
        }
    },

    // Update budget status display in header
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

    // Update scheme budget status when scheme is selected
    updateSchemeBudgetStatus() {
        const schemeSelect = document.getElementById('schemeSelect');
        const selectedSchemeId = schemeSelect?.value;
        const statusDiv = document.getElementById('schemeBudgetStatus');
        
        if (!statusDiv || !selectedSchemeId) return;
        
        const budgetExists = this.budgetData.has(selectedSchemeId);
        
        if (budgetExists) {
            const budgetData = this.budgetData.get(selectedSchemeId);
            const totalAllocation = budgetData.centralAllocation + budgetData.stateNormativeAllocation + budgetData.additionalStateAllocation;
            
            statusDiv.innerHTML = `
                <div class="alert alert-success alert-sm">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Budget Master Available</strong>
                    <br>
                    <small>Total Allocation: ₹${formatCurrency(totalAllocation)}</small>
                    <button type="button" class="btn btn-outline-success btn-sm ms-2" onclick="BudgetMaster.editBudgetForScheme('${selectedSchemeId}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            `;
            
            // Auto-populate budget fields in main form
            this.populateBudgetFieldsInMainForm(selectedSchemeId);
        } else {
            statusDiv.innerHTML = `
                <div class="alert alert-warning alert-sm">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Budget Master Required</strong>
                    <br>
                    <small>Please set budget master for this scheme first.</small>
                    <button type="button" class="btn btn-outline-warning btn-sm ms-2" onclick="BudgetMaster.createBudgetForScheme('${selectedSchemeId}')">
                        <i class="fas fa-plus"></i> Create
                    </button>
                </div>
            `;
        }
    },

    // Edit budget for specific scheme
    editBudgetForScheme(schemeId) {
        document.getElementById('budgetMasterSchemeSelect').value = schemeId;
        this.showBudgetMasterModal();
        setTimeout(() => {
            this.onSchemeSelectionChange();
        }, 500);
    },

    // Create budget for specific scheme
    createBudgetForScheme(schemeId) {
        document.getElementById('budgetMasterSchemeSelect').value = schemeId;
        this.showBudgetMasterModal();
        setTimeout(() => {
            this.clearBudgetFields();
        }, 500);
    },

    // Populate budget fields in main form
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
            
            // Show pre-filled indicator
            const indicator = document.getElementById('budgetPreFilledIndicator');
            if (indicator) {
                indicator.style.display = 'inline-block';
            }
        }, 500);
    },

    // Get budget data for scheme
    getBudgetDataForScheme(schemeId) {
        return this.budgetData.get(schemeId) || null;
    },

    // Check if scheme has budget master
    hasBudgetMaster(schemeId) {
        return this.budgetData.has(schemeId);
    }
};

// Report Manager - New functionality
const ReportManager = {
    
    init() {
        this.setupReportModals();
    },

    setupReportModals() {
        // Setup print report modal
        this.loadSchemesForReports();
        this.setDefaultReportDates();
        
        // Show admin district selection if admin
        if (isAdmin) {
            const adminDistrictSelection = document.getElementById('adminDistrictSelection');
            if (adminDistrictSelection) {
                adminDistrictSelection.style.display = 'block';
                this.loadDistrictsForReports();
            }
        }
    },

    // Load schemes for report modals
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

    // Load districts for admin reports
    async loadDistrictsForReports() {
        const districtSelect = document.getElementById('printDistrictSelect');
        if (!districtSelect || !isAdmin) return;
        
        try {
            // Load districts (implement based on your district data source)
            const districts = [
                'Raipur', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Raigarh',
                'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund', 'Kanker'
            ];
            
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading districts for reports:', error);
        }
    },

    // Set default report dates
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

    // Show print modal
    showPrintModal() {
        const modal = new bootstrap.Modal(document.getElementById('printReportModal'));
        modal.show();
    },

    // Preview report
    previewReport() {
        const reportData = this.collectReportData();
        if (!reportData) return;
        
        const printContent = this.generatePrintContent(reportData);
        
        // Show preview in new window
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        previewWindow.document.write(printContent);
        previewWindow.document.close();
    },

    // Print report
    printReport() {
        const reportData = this.collectReportData();
        if (!reportData) return;
        
        const printContent = this.generatePrintContent(reportData);
        
        // Create print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Trigger print
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('printReportModal'));
        modal.hide();
    },

    // Download Excel
    async downloadExcel() {
        try {
            const reportData = this.collectReportData();
            if (!reportData) return;
            
            // Get DBT data for the selected scheme
            const dbtData = await this.getDBTDataForReport(reportData);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Create worksheet data
            const wsData = this.formatDataForExcel(dbtData, reportData);
            
            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'DBT Report');
            
            // Generate filename
            const filename = `DBT_Report_${reportData.schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.reportDate}.xlsx`;
            
            // Download file
            XLSX.writeFile(wb, filename);
            
            showAlert('Excel रिपोर्ट डाउनलोड हो गई।', 'success');
            
        } catch (error) {
            console.error('Error downloading Excel:', error);
            showAlert('Excel डाउनलोड करने में त्रुटि हुई।', 'danger');
        }
    },

    // Download PDF
    async downloadPDF() {
        try {
            const reportData = this.collectReportData();
            if (!reportData) return;
            
            // Get DBT data for the selected scheme
            const dbtData = await this.getDBTDataForReport(reportData);
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add content to PDF
            this.addContentToPDF(doc, dbtData, reportData);
            
            // Generate filename
            const filename = `DBT_Report_${reportData.schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.reportDate}.pdf`;
            
            // Download PDF
            doc.save(filename);
            
            showAlert('PDF रिपोर्ट डाउनलोड हो गई।', 'success');
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showAlert('PDF डाउनलोड करने में त्रुटि हुई।', 'danger');
        }
    },

    // Collect report data from form
    collectReportData() {
        const schemeSelect = document.getElementById('printSchemeSelect');
        const reportDate = document.getElementById('printReportDate')?.value;
        const fromDate = document.getElementById('printFromDate')?.value;
        const toDate = document.getElementById('printToDate')?.value;
        const districtSelect = document.getElementById('printDistrictSelect');
        
        if (!schemeSelect.value) {
            showAlert('कृपया स्कीम सेलेक्ट करें।', 'warning');
            return null;
        }
        
        return {
            schemeId: schemeSelect.value,
            schemeName: schemeSelect.options[schemeSelect.selectedIndex].textContent,
            reportDate: reportDate || new Date().toISOString().split('T')[0],
            fromDate: fromDate,
            toDate: toDate,
            districtId: districtSelect?.value || currentUser?.districtId,
            districtName: districtSelect?.value || currentUser?.districtName,
            isAdmin: isAdmin
        };
    },

    // Get DBT data for report
    async getDBTDataForReport(reportData) {
        try {
            let query = supabaseClient
                .from('dbt_data_entries')
                .select('*')
                .eq('scheme_id', reportData.schemeId);
            
            // Add date filters if provided
            if (reportData.fromDate && reportData.toDate) {
                query = query.gte('dbt_date', reportData.fromDate)
                            .lte('dbt_date', reportData.toDate);
            }
            
            // Add district filter for non-admin users
            if (!isAdmin && currentUser?.districtId) {
                query = query.eq('district_id', currentUser.districtId);
            } else if (isAdmin && reportData.districtId) {
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

    // Generate print content
    generatePrintContent(reportData) {
        const currentDate = new Date().toLocaleDateString('en-IN');
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DBT Report - ${reportData.schemeName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .logo { width: 80px; height: 80px; margin: 0 auto 10px; }
                .title { font-size: 24px; font-weight: bold; color: #1B5E20; margin-bottom: 5px; }
                .subtitle { font-size: 18px; color: #666; margin-bottom: 10px; }
                .report-info { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .section { margin: 20px 0; }
                .section-title { font-size: 16px; font-weight: bold; color: #1B5E20; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
                .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .data-table th { background-color: #f2f2f2; font-weight: bold; }
                .summary-box { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
                @media print { 
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Coat_of_arms_of_Chhattisgarh.svg" alt="छत्तीसगढ़ सरकार" class="logo">
                <div class="title">संचालनालय कृषि छत्तीसगढ़</div>
                <div class="title">Directorate Agriculture Chhattisgarh</div>
                <div class="subtitle">Scheme-wise DBT Status Report</div>
            </div>
            
            <div class="report-info">
                <table style="width: 100%;">
                    <tr>
                        <td><strong>Scheme:</strong> ${reportData.schemeName}</td>
                        <td><strong>Report Date:</strong> ${reportData.reportDate}</td>
                    </tr>
                    <tr>
                        <td><strong>District:</strong> ${reportData.districtName}</td>
                        <td><strong>Generated On:</strong> ${currentDate}</td>
                    </tr>
                </table>
            </div>
            
            <div class="section">
                <div class="section-title">Budget Allocation Summary</div>
                <div id="budgetSummary">Loading budget data...</div>
            </div>
            
            <div class="section">
                <div class="section-title">DBT Data Summary</div>
                <div id="dbtSummary">Loading DBT data...</div>
            </div>
            
            <div class="footer">
                <p>This is a computer-generated report from DBT Data Entry System</p>
                <p>संचालनालय कृषि छत्तीसगढ़ - Directorate Agriculture Chhattisgarh</p>
            </div>
            
            <script>
                // Load and display data
                window.onload = function() {
                    // This will be populated with actual data
                    document.getElementById('budgetSummary').innerHTML = 'Budget data will be loaded here';
                    document.getElementById('dbtSummary').innerHTML = 'DBT data will be loaded here';
                };
            </script>
        </body>
        </html>
        `;
    },

    // Format data for Excel
    formatDataForExcel(dbtData, reportData) {
        const headers = [
            'Entry ID', 'Date', 'Scheme', 'District',
            'Central Allocation', 'State Normative', 'Additional State',
            'Total Amount Disbursed', 'Total Beneficiaries',
            'Electronic Disbursed', 'Non-Electronic Disbursed',
            'Savings Amount', 'Status', 'Created By'
        ];
        
        const rows = [
            ['Directorate Agriculture Chhattisgarh'],
            [`Scheme-wise DBT Status Report - ${reportData.schemeName}`],
            [`Report Date: ${reportData.reportDate}`],
            [''],
            headers
        ];
        
        dbtData.forEach(entry => {
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
                entry.created_by || ''
            ]);
        });
        
        return rows;
    },

    // Add content to PDF
    addContentToPDF(doc, dbtData, reportData) {
        let yPosition = 20;
        
        // Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('संचालनालय कृषि छत्तीसगढ़', 105, yPosition, { align: 'center' });
        yPosition += 10;
        
        doc.setFontSize(16);
        doc.text('Directorate Agriculture Chhattisgarh', 105, yPosition, { align: 'center' });
        yPosition += 15;
        
        doc.setFontSize(14);
        doc.text('Scheme-wise DBT Status Report', 105, yPosition, { align: 'center' });
        yPosition += 20;
        
        // Report Info
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Scheme: ${reportData.schemeName}`, 20, yPosition);
        doc.text(`Report Date: ${reportData.reportDate}`, 120, yPosition);
        yPosition += 10;
        
        doc.text(`District: ${reportData.districtName}`, 20, yPosition);
        doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 120, yPosition);
        yPosition += 20;
        
        // Data Summary
        if (dbtData.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Summary:', 20, yPosition);
            yPosition += 10;
            
            doc.setFont(undefined, 'normal');
            doc.text(`Total Entries: ${dbtData.length}`, 20, yPosition);
            yPosition += 8;
            
            const totalAmount = dbtData.reduce((sum, entry) => sum + (parseFloat(entry.total_amount_disbursed) || 0), 0);
            doc.text(`Total Amount Disbursed: ₹${formatCurrency(totalAmount)}`, 20, yPosition);
            yPosition += 8;
            
            const totalBeneficiaries = dbtData.reduce((sum, entry) => sum + (parseInt(entry.total_beneficiaries) || 0), 0);
            doc.text(`Total Beneficiaries: ${totalBeneficiaries}`, 20, yPosition);
        } else {
            doc.text('No data found for the selected criteria.', 20, yPosition);
        }
    },

    // Show budget status report
    showBudgetStatusReport() {
        const modal = new bootstrap.Modal(document.getElementById('budgetStatusModal'));
        modal.show();
        this.loadBudgetStatusData();
    },

    // Load budget status data
    async loadBudgetStatusData() {
        const tableBody = document.getElementById('budgetStatusTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading budget status...</td></tr>';
        
        try {
            let statusData = [];
            
            // For admin users, show all districts
            if (isAdmin) {
                // Load budget status for all districts (implement based on your data structure)
                statusData = await this.getBudgetStatusForAllDistricts();
            } else {
                // Load budget status for current user's district
                statusData = await this.getBudgetStatusForDistrict(currentUser?.districtId);
            }
            
            this.displayBudgetStatusData(statusData);
            
        } catch (error) {
            console.error('Error loading budget status:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading budget status</td></tr>';
        }
    },

    // Get budget status for all districts (admin)
    async getBudgetStatusForAllDistricts() {
        try {
            const { data, error } = await supabaseClient
                .from('budget_master')
                .select(`
                    *, 
                    schemes (scheme_name, scheme_code),
                    test_users (full_name, districts (name))
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching budget status for all districts:', error);
            return [];
        }
    },

    // Get budget status for specific district
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

    // Display budget status data
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
            const districtName = item.test_users?.districts?.name || item.district_name || 'Unknown District';
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

    // Export budget status
    exportBudgetStatus() {
        // Implementation for exporting budget status
        showAlert('Budget Status export functionality will be implemented.', 'info');
    },

    // View budget details
    viewBudgetDetails(budgetId) {
        // Implementation for viewing budget details
        showAlert(`Budget details for ID: ${budgetId}`, 'info');
    }
};

async function initializeUI() {
    // Setup header and navigation
    setupHeader();
    
    // Setup admin controls if user is admin
    if (isAdmin) {
        try {
            if (typeof DBTAdmin !== 'undefined') {
                DBTAdmin.setupAdminControls();
                await DBTAdmin.loadAdminStats();
            } else {
                console.warn('DBTAdmin module not loaded yet');
                // Retry after a short delay
                setTimeout(() => {
                    if (typeof DBTAdmin !== 'undefined') {
                        DBTAdmin.setupAdminControls();
                        DBTAdmin.loadAdminStats();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error setting up admin controls:', error);
        }
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
    // Modals are already in HTML, just ensure they're properly initialized
    console.log('Modals setup completed');
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
    if (typeof DBTCalculations !== 'undefined') {
        DBTCalculations.setupAutoCalculations();
    }
    
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
                    <input type="number" class="form-control pistachio-field budget-master-field" id="centralAllocation" step="0.01" min="0">
                    <small class="text-muted">Auto-filled from Budget Master</small>
                </div>
                <div class="mb-3 currency-input">
                    <label class="form-label">State Normative Allocation (INR)</label>
                    <input type="number" class="form-control pistachio-field budget-master-field" id="stateNormativeAllocation" step="0.01" min="0">
                    <small class="text-muted">Auto-filled from Budget Master</small>
                </div>
            </div>
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Additional State Allocation (if any) (INR)</label>
                    <input type="number" class="form-control pistachio-field budget-master-field" id="additionalStateAllocation" step="0.01" min="0">
                    <small class="text-muted">Auto-filled from Budget Master</small>
                </div>
                <div class="mb-3">
                    <label class="form-label">Remarks (if any relate to budget allocation)</label>
                    <textarea class="form-control pistachio-field" id="budgetRemarks" rows="3" style="height: auto;"></textarea>
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
                    <input type="number" class="form-control pistachio-field" id="centralShareFund" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row two-col">
                <div class="mb-3 currency-input">
                    <label class="form-label">Normative - State Share Fund Transferred</label>
                    <input type="number" class="form-control pistachio-field" id="normativeStateShare" step="0.01" min="0">
                </div>
                <div class="mb-3 currency-input">
                    <label class="form-label">Additional State Contributed Fund Transferred</label>
                    <input type="number" class="form-control pistachio-field" id="additionalStateContributed" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row full-width">
                <div class="mb-3 currency-input">
                    <label class="form-label">State Share Fund Transferred To Additional beneficiaries Supported By State</label>
                    <input type="number" class="form-control pistachio-field" id="stateShareAdditional" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row full-width">
                <div class="mb-3 currency-input">
                    <label class="form-label">Total Amount Disbursed Through Non Electronic Mode (Cash, Cheque, Demand Draft, Money Order etc)</label>
                    <input type="number" class="form-control pistachio-field" id="nonElectronicDisbursed" step="0.01" min="0">
                </div>
            </div>
            <div class="form-row full-width">
                <div class="mb-3 currency-input">
                    <label class="form-label">Total Amount Disbursed Through Electronic Mode (ABP, NEFT, RTGS, AEPS etc)</label>
                    <input type="number" class="form-control pistachio-field" id="electronicDisbursed" step="0.01" min="0">
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
                <input type="number" class="form-control pistachio-field" id="additionalBeneficiariesCSS" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Additional Beneficiaries Supported By State, If Any (Applicable For State Scheme)</label>
                <input type="number" class="form-control pistachio-field" id="additionalBeneficiariesState" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Digitized</label>
                <input type="number" class="form-control pistachio-field" id="beneficiariesDigitized" min="0" value="0">
            </div>
        </div>
        <div class="form-row full-width">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Bank Account Details Available With Department</label>
                <input type="number" class="form-control pistachio-field" id="bankAccountDetails" min="0" value="0">
            </div>
        </div>
        <div class="form-row two-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Aadhaar Seeded (Aadhaar Number Of Beneficiaries Available With Department)</label>
                <input type="number" class="form-control pistachio-field" id="aadhaarSeeded" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Aadhaar Authenticated</label>
                <input type="number" class="form-control pistachio-field" id="aadhaarAuthenticated" min="0" value="0">
            </div>
        </div>
        <div class="form-row two-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Mobile Number Available With Department</label>
                <input type="number" class="form-control pistachio-field" id="mobileAvailable" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Amount Disbursed Through Electronic Mode (ABP NEFT AEPS etc.)</label>
                <input type="number" class="form-control pistachio-field" id="electronicModeBeneficiaries" min="0" value="0">
            </div>
        </div>
        <div class="form-row two-col">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Beneficiaries - Amount Disbursed Through Non Electronic Mode (Cash Cheque, Demand Draft etc.)</label>
                <input type="number" class="form-control pistachio-field" id="nonElectronicBeneficiaries" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Transactions Through Electronic Mode (ABP NEFT AEPS etc.)</label>
                <input type="number" class="form-control pistachio-field" id="electronicTransactions" min="0" value="0">
            </div>
        </div>
        <div class="form-row full-width">
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Transactions Through Non-Electronic Mode (Cash Cheque, Demand Draft, Money Order etc.)</label>
                <input type="number" class="form-control pistachio-field" id="nonElectronicTransactions" min="0" value="0">
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
                <input type="number" class="form-control pistachio-field" id="deduplicationAadhaar" min="0" value="0">
            </div>
            <div class="mb-3 number-input">
                <label class="form-label">Number Of Ghost/Fake Beneficiaries Removed</label>
                <input type="number" class="form-control pistachio-field" id="ghostBeneficiaries" min="0" value="0">
            </div>
            <div class="mb-3 currency-input">
                <label class="form-label">Other Savings Due To Process Reengineering/Efficiency</label>
                <input type="number" class="form-control pistachio-field" id="otherSavings" step="0.01" min="0" value="0">
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
        if (typeof DBTValidation !== 'undefined') {
            input.addEventListener('blur', (e) => DBTValidation.validateField(e));
        }
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
                
                // Update scheme budget status
                BudgetMaster.updateSchemeBudgetStatus();
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
        // Hide add scheme button for non-admin users
        const addSchemeBtn = document.getElementById('addSchemeBtn');
        if (addSchemeBtn) {
            addSchemeBtn.style.display = 'none';
        }
        
        // Hide admin-only sections
        const adminSections = document.querySelectorAll('.admin-only-section');
        adminSections.forEach(section => {
            section.style.display = 'none';
        });
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
            // Store schemes globally for other components
            availableSchemes = data;
            
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
            
            // Update budget status display after schemes are loaded
            BudgetMaster.updateBudgetStatusDisplay();
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
    
    // Store fallback schemes globally
    availableSchemes = fallbackSchemes;
    
    const csGroup = document.createElement('optgroup');
    csGroup.label = 'Centrally Sponsored Schemes';
    const ssGroup = document.createElement('optgroup');
    ssGroup.label = 'State Schemes';
    
    fallbackSchemes.forEach(scheme => {
        const option = document.createElement('option');
        option.value = scheme.id;
        option.textContent = `${scheme.scheme_name} (\${scheme.scheme_code})`;
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
    
    // Update budget status display after fallback schemes are loaded
    BudgetMaster.updateBudgetStatusDisplay();
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
                        <small class="text-muted">\${notif.time}</small>
                        <i class="fas fa-\${notif.type === 'info' ? 'info-circle text-info' : notif.type === 'success' ? 'check-circle text-success' : 'exclamation-triangle text-warning'}"></i>
                    </div>
                    <div>\${notif.message}</div>
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

    // Budget Allocation (Section A.2) - Include Budget Master data
    const selectedSchemeId = document.getElementById('schemeSelect')?.value;
    const budgetData = BudgetMaster.getBudgetDataForScheme(selectedSchemeId);
    
    if (budgetData) {
        formData.central_allocation = budgetData.centralAllocation;
        formData.state_normative_allocation = budgetData.stateNormativeAllocation;
        formData.additional_state_allocation = budgetData.additionalStateAllocation;
    } else {
        formData.central_allocation = parseFloat(document.getElementById('centralAllocation')?.value) || 0;
        formData.state_normative_allocation = parseFloat(document.getElementById('stateNormativeAllocation')?.value) || 0;
        formData.additional_state_allocation = parseFloat(document.getElementById('additionalStateAllocation')?.value) || 0;
    }
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
    
    // Check if budget master exists for selected scheme
    const selectedSchemeId = document.getElementById('schemeSelect')?.value;
    if (!isAdmin && selectedSchemeId && !BudgetMaster.hasBudgetMaster(selectedSchemeId)) {
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
            
            // Load form fields (excluding budget master fields)
            if (document.getElementById('schemeSelect')) document.getElementById('schemeSelect').value = data.scheme_id || '';
            if (document.getElementById('dbtDate')) document.getElementById('dbtDate').value = data.dbt_date || '';
            if (document.getElementById('budgetRemarks')) document.getElementById('budgetRemarks').value = data.budget_remarks || '';

            // Load other sections
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
    if (formProgress > 10) { // Only auto-save if there's significant progress
        const formData = collectFormData();
        localStorage.setItem('dbtFormDraft', JSON.stringify(formData));
    }
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
    if (confirm('क्या आप वाकई फॉर्म रीसेट करना चाहते हैं? सभी DBT डेटा खो जाएगा। (Budget Master डेटा सुरक्षित रहेगा)')) {
        document.getElementById('dbtForm').reset();
        localStorage.removeItem('dbtFormDraft');
        updateProgress();
        
        // Re-populate budget fields if budget master exists for selected scheme
        const selectedSchemeId = document.getElementById('schemeSelect')?.value;
        if (selectedSchemeId && BudgetMaster.hasBudgetMaster(selectedSchemeId)) {
            BudgetMaster.populateBudgetFieldsInMainForm(selectedSchemeId);
        }
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
    alertDiv.className = `alert alert-\${type} alert-custom`;
    alertDiv.innerHTML = `
        <i class="fas fa-\${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        <span class="hindi">\${message}</span>
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
║  💰 Scheme-wise Budget Master System                        ║
║  📄 Print & Download Reports                                ║
║  🎨 Pistachio Green Input Fields                            ║
║                                                              ║
║  Keyboard Shortcuts:                                         ║
║  • Ctrl + S: Save Draft                                      ║
║  • Ctrl + Enter: Submit Form                                 ║
║                                                              ║
║  New Features:                                               ║
║  • Manual Budget Master (Click to Open)                     ║
║  • Scheme-wise Budget Tracking                              ║
║  • Print Reports with Government Header                     ║
║  • Excel & PDF Download Options                             ║
║  • Budget Status Dashboard                                   ║
║                                                              ║
║  Modular Architecture:                                       ║
║  • dbt-main.js: Core + Budget Master + Reports              ║
║  • dbt-auth.js: Authentication handling                     ║
║  • dbt-validation.js: Form validation                       ║
║  • dbt-calculations.js: Auto calculations                   ║
║  • dbt-admin.js: Admin features                             ║
║                                                              
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);



/**
 * Ground Truth Surveys functionality for the application
 */

const Surveys = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    // DataTable instance
    dataTable: null,
    
    /**
     * Initialize surveys module
     * @param {Object} user - Current user object
     * @param {Object} supabaseClient - Supabase client instance
     */
    init: function(user, supabaseClient) {
        this.currentUser = user;
        this.supabaseClient = supabaseClient;
        
        // Set up event listeners
        document.getElementById('addGroundTruthBtn').addEventListener('click', this.showAddGroundTruthModal.bind(this));
        document.getElementById('saveGroundTruthBtn').addEventListener('click', this.saveGroundTruth.bind(this));
        
        // Initialize DataTable
        this.initDataTable();
        
        // Set up survey tabs
        document.getElementById('groundTruthTab').addEventListener('shown.bs.tab', () => {
            this.loadData();
        });
    },
    
    /**
     * Initialize DataTable for ground truth surveys
     */
    initDataTable: function() {
        this.dataTable = Utils.initDataTable('groundTruthTable', {
            columns: [
                { data: 'division_name' },
                { data: 'team_number' },
                { 
                    data: 'survey_date',
                    render: function(data) {
                        return Utils.formatDate(data);
                    }
                },
                { data: 'total_surveys' },
                { data: 'completed_surveys' },
                { 
                    data: 'expenditure_amount',
                    render: function(data) {
                        return Utils.formatCurrency(data);
                    }
                },
                { 
                    data: 'id',
                    render: function(data) {
                        return `
                            <button class="btn btn-sm btn-primary me-1" onclick="Surveys.editGroundTruth('${data}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="App.showDeleteConfirmation('${data}', 'groundTruth')">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }
                }
            ]
        });
    },
    
    /**
     * Load ground truth survey data
     */
    loadData: function() {
        Utils.showLoading();
        
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .select('*')
            .match(divisionFilter)
            .order('survey_date', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading ground truth surveys:', error);
                    Utils.showError('Failed to load ground truth survey data');
                    Utils.hideLoading();
                    return;
                }
                
                // Clear existing data and add new data
                this.dataTable.clear().draw();
                if (data && data.length > 0) {
                    this.dataTable.rows.add(data).draw();
                }
                
                Utils.hideLoading();
            });
    },
    
    /**
     * Show add ground truth survey modal
     */
    showAddGroundTruthModal: function() {
        // Reset form
        document.getElementById('groundTruthForm').reset();
        document.getElementById('groundTruthId').value = '';
        
        // Set modal title
        document.getElementById('groundTruthModalTitle').textContent = 'Add Ground Truth Survey';
        
        // Populate division dropdown
        Utils.populateDivisionDropdown('gtsDivision', this.currentUser.division_id);
        
        // Set current date as default
        document.getElementById('gtsDate').valueAsDate = new Date();
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('groundTruthModal'));
        modal.show();
    },
    
    /**
     * Edit ground truth survey
     * @param {string} id - Survey ID
     */
    editGroundTruth: function(id) {
        Utils.showLoading();
        
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data, error }) => {
                Utils.hideLoading();
                
                if (error) {
                    console.error('Error loading ground truth survey:', error);
                    Utils.showError('Failed to load survey data');
                    return;
                }
                
                if (data) {
                    // Set form values
                    document.getElementById('groundTruthId').value = data.id;
                    document.getElementById('gtsDivision').value = data.division_id;
                    document.getElementById('gtsTeam').value = data.team_number;
                    document.getElementById('gtsOfficers').value = data.officer_names;
                    document.getElementById('gtsDate').value = data.survey_date;
                    document.getElementById('gtsTotalSurveys').value = data.total_surveys;
                    document.getElementById('gtsCompletedSurveys').value = data.completed_surveys;
                    document.getElementById('gtsExpenditure').value = data.expenditure_amount;
                    document.getElementById('gtsAmountDemanded').value = data.total_amount_demanded;
                    document.getElementById('gtsCropSurveys').value = data.total_crop_surveys || '';
                    document.getElementById('gtsRemarks').value = data.remarks || '';
                    
                    // Set modal title
                    document.getElementById('groundTruthModalTitle').textContent = 'Edit Ground Truth Survey';
                    
                    // Show modal
                    const modal = new bootstrap.Modal(document.getElementById('groundTruthModal'));
                    modal.show();
                }
            });
    },
    
    /**
     * Save ground truth survey data
     */
    saveGroundTruth: function() {
        // Validate form
        const form = document.getElementById('groundTruthForm');
        if (!Utils.validateForm(form)) {
            return;
        }
        
        Utils.showLoading();
        
        const groundTruthId = document.getElementById('groundTruthId').value;
        const formData = {
            division_id: document.getElementById('gtsDivision').value,
            division_name: document.getElementById('gtsDivision').options[document.getElementById('gtsDivision').selectedIndex].text,
            team_number: document.getElementById('gtsTeam').value,
            officer_names: document.getElementById('gtsOfficers').value,
            survey_date: document.getElementById('gtsDate').value,
            total_surveys: document.getElementById('gtsTotalSurveys').value,
            completed_surveys: document.getElementById('gtsCompletedSurveys').value,
            expenditure_amount: document.getElementById('gtsExpenditure').value,
            total_amount_demanded: document.getElementById('gtsAmountDemanded').value,
            total_crop_surveys: document.getElementById('gtsCropSurveys').value || null,
            remarks: document.getElementById('gtsRemarks').value || null
        };
        
        // Add or update ground truth survey
        let promise;
        
        if (groundTruthId) {
            // Update existing survey
            promise = this.supabaseClient
                .from(CONFIG.TABLES.GROUND_TRUTH)
                .update(formData)
                .eq('id', groundTruthId);
        } else {
            // Add new survey
            promise = this.supabaseClient
                .from(CONFIG.TABLES.GROUND_TRUTH)
                .insert([formData]);
        }
        
        promise.then(({ data, error }) => {
            Utils.hideLoading();
            
            if (error) {
                console.error('Error saving ground truth survey:', error);
                Utils.showError('Failed to save survey data');
                return;
            }
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('groundTruthModal')).hide();
            
            // Show success message
            Utils.showSuccess('Ground Truth Survey saved successfully');
            
            // Reload surveys data
            this.loadData();
            
            // Refresh dashboard
            Dashboard.loadData();
        });
    },
    
    /**
     * Delete ground truth survey
     * @param {string} id - Survey ID
     */
    deleteGroundTruth: function(id) {
        Utils.showLoading();
        
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .delete()
            .eq('id', id)
            .then(({ error }) => {
                Utils.hideLoading();
                
                if (error) {
                    console.error('Error deleting ground truth survey:', error);
                    Utils.showError('Failed to delete survey');
                    return;
                }
                
                Utils.showSuccess('Ground Truth Survey deleted successfully');
                
                // Reload surveys data
                this.loadData();
                
                // Refresh dashboard
                Dashboard.loadData();
            });
    }
};


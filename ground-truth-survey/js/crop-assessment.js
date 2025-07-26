/**
 * Crop Assessment functionality for the Ground Truth Survey application
 */

const CropAssessment = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    // DataTable instance
    dataTable: null,
    
    /**
     * Initialize crop assessment module
     * @param {Object} user - Current user object
     * @param {Object} supabaseClient - Supabase client instance
     */
    init: function(user, supabaseClient) {
        this.currentUser = user;
        this.supabaseClient = supabaseClient;
        
        // Set up event listeners
        document.getElementById('addCropAssessmentBtn').addEventListener('click', this.showAddCropAssessmentModal.bind(this));
        document.getElementById('saveCropAssessmentBtn').addEventListener('click', this.saveCropAssessment.bind(this));
        
        // Set up division change listener
        document.getElementById('caDivision').addEventListener('change', function() {
            Utils.populateDistrictDropdown('caDivision', 'caDistrict');
        });
        
        // Set up district change listener
        document.getElementById('caDistrict').addEventListener('change', function() {
            Utils.populateBlockDropdown('caDistrict', 'caBlock');
        });
        
        // Initialize DataTable
        this.initDataTable();
        
        // Set up crop assessment tab
        document.getElementById('cropAssessmentTab').addEventListener('shown.bs.tab', () => {
            this.loadData();
        });
    },
    
    /**
     * Initialize DataTable for crop assessments
     */
    initDataTable: function() {
        this.dataTable = Utils.initDataTable('cropAssessmentTable', {
            columns: [
                { data: 'division_name' },
                { data: 'district_name' },
                { data: 'block_name' },
                { data: 'village_name' },
                { data: 'crop_irrigation_status' },
                { data: 'total_crop_surveys' },
                { 
                    data: 'id',
                    render: function(data) {
                        return `
                            <button class="btn btn-sm btn-primary me-1" onclick="CropAssessment.editCropAssessment('${data}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="App.showDeleteConfirmation('${data}', 'cropAssessment')">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }
                }
            ]
        });
    },
    
    /**
     * Load crop assessment data
     */
    loadData: function() {
        Utils.showLoading();
        
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.CROP_ASSESSMENT)
            .select('*')
            .match(divisionFilter)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading crop assessments:', error);
                    Utils.showError('Failed to load crop assessment data');
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
     * Show add crop assessment modal
     */
    showAddCropAssessmentModal: function() {
        // Reset form
        document.getElementById('cropAssessmentForm').reset();
        document.getElementById('cropAssessmentId').value = '';
        
        // Set modal title
        document.getElementById('cropAssessmentModalTitle').textContent = 'Add Crop Assessment';
        
        // Populate division dropdown
        Utils.populateDivisionDropdown('caDivision', this.currentUser.division_id);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('cropAssessmentModal'));
        modal.show();
    },
    
    /**
     * Edit crop assessment
     * @param {string} id - Crop assessment ID
     */
    editCropAssessment: function(id) {
        Utils.showLoading();
        
        this.supabaseClient
            .from(CONFIG.TABLES.CROP_ASSESSMENT)
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data, error }) => {
                Utils.hideLoading();
                
                if (error) {
                    console.error('Error loading crop assessment:', error);
                    Utils.showError('Failed to load crop assessment data');
                    return;
                }
                
                if (data) {
                    // Set form values
                    document.getElementById('cropAssessmentId').value = data.id;
                    
                    // Set division and populate districts
                    document.getElementById('caDivision').value = data.division_id;
                    Utils.populateDistrictDropdown('caDivision', 'caDistrict');
                    
                    // Need to wait for districts to be populated
                    setTimeout(() => {
                        // Set district and populate blocks
                        document.getElementById('caDistrict').value = data.district_id;
                        Utils.populateBlockDropdown('caDistrict', 'caBlock');
                        
                        // Need to wait for blocks to be populated
                        setTimeout(() => {
                            document.getElementById('caBlock').value = data.block_name;
                            document.getElementById('caVillage').value = data.village_name;
                            document.getElementById('caCropType').value = data.crop_irrigation_status;
                            document.getElementById('caTotalSurveys').value = data.total_crop_surveys;
                            document.getElementById('caCompletedSurveys').value = data.completed_surveys;
                            document.getElementById('caRemarks').value = data.remarks || '';
                            
                            // Set modal title
                            document.getElementById('cropAssessmentModalTitle').textContent = 'Edit Crop Assessment';
                            
                            // Show modal
                            const modal = new bootstrap.Modal(document.getElementById('cropAssessmentModal'));
                            modal.show();
                        }, 100);
                    }, 100);
                }
            });
    },
    
    /**
     * Save crop assessment data
     */
    saveCropAssessment: function() {
        // Validate form
        const form = document.getElementById('cropAssessmentForm');
        if (!Utils.validateForm(form)) {
            return;
        }
        
        Utils.showLoading();
        
        const cropAssessmentId = document.getElementById('cropAssessmentId').value;
        const formData = {
            division_id: document.getElementById('caDivision').value,
            division_name: document.getElementById('caDivision').options[document.getElementById('caDivision').selectedIndex].text,
            district_id: document.getElementById('caDistrict').value,
            district_name: document.getElementById('caDistrict').options[document.getElementById('caDistrict').selectedIndex].text,
            block_name: document.getElementById('caBlock').value,
            village_name: document.getElementById('caVillage').value,
            crop_irrigation_status: document.getElementById('caCropType').value,
            total_crop_surveys: document.getElementById('caTotalSurveys').value,
            completed_surveys: document.getElementById('caCompletedSurveys').value,
            remarks: document.getElementById('caRemarks').value || null,
            assessment_date: new Date().toISOString().split('T')[0]
        };
        
        // Add or update crop assessment
        let promise;
        
        if (cropAssessmentId) {
            // Update existing crop assessment
            promise = this.supabaseClient
                .from(CONFIG.TABLES.CROP_ASSESSMENT)
                .update(formData)
                .eq('id', cropAssessmentId);
        } else {
            // Add new crop assessment
            promise = this.supabaseClient
                .from(CONFIG.TABLES.CROP_ASSESSMENT)
                .insert([formData]);
        }
        
        promise.then(({ data, error }) => {
            Utils.hideLoading();
            
            if (error) {
                console.error('Error saving crop assessment:', error);
                Utils.showError('Failed to save crop assessment data');
                return;
            }
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('cropAssessmentModal')).hide();
            
            // Show success message
            Utils.showSuccess('Crop Assessment saved successfully');
            
            // Reload crop assessments data
            this.loadData();
            
            // Refresh dashboard
            Dashboard.loadData();
        });
    },
    
    /**
     * Delete crop assessment
     * @param {string} id - Crop assessment ID
     */
    deleteCropAssessment: function(id) {
        Utils.showLoading();
        
        this.supabaseClient
            .from(CONFIG.TABLES.CROP_ASSESSMENT)
            .delete()
            .eq('id', id)
            .then(({ error }) => {
                Utils.hideLoading();
                
                if (error) {
                    console.error('Error deleting crop assessment:', error);
                    Utils.showError('Failed to delete crop assessment');
                    return;
                }
                
                Utils.showSuccess('Crop Assessment deleted successfully');
                
                // Reload crop assessments data
                this.loadData();
                
                // Refresh dashboard
                Dashboard.loadData();
            });
    }
};


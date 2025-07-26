/**
 * Officers management functionality for the Ground Truth Survey application
 */

const Officers = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    // DataTable instance
    dataTable: null,
    
    /**
     * Initialize officers module
     * @param {Object} user - Current user object
     * @param {Object} supabaseClient - Supabase client instance
     */
    init: function(user, supabaseClient) {
        this.currentUser = user;
        this.supabaseClient = supabaseClient;
        
        // Set up event listeners
        document.getElementById('addOfficerBtn').addEventListener('click', this.showAddOfficerModal.bind(this));
        document.getElementById('saveOfficerBtn').addEventListener('click', this.saveOfficer.bind(this));
        
        // Set up division change listener
        document.getElementById('officerDivision').addEventListener('change', function() {
            Utils.populateDistrictDropdown('officerDivision', 'officerDistrict');
        });
        
        // Set up district change listener
        document.getElementById('officerDistrict').addEventListener('change', function() {
            Utils.populateBlockDropdown('officerDistrict', 'officerBlock');
        });
        
        // Initialize DataTable
        this.initDataTable();
    },
    
    /**
     * Initialize DataTable for officers
     */
    initDataTable: function() {
        this.dataTable = Utils.initDataTable('officersTable', {
            columns: [
                { data: 'name' },
                { data: 'designation' },
                { data: 'division_name' },
                { data: 'district_name' },
                { data: 'block_name' },
                { data: 'mobile_number' },
                { 
                    data: 'id',
                    render: function(data) {
                        return `
                            <button class="btn btn-sm btn-primary me-1" onclick="Officers.editOfficer('${data}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="App.showDeleteConfirmation('${data}', 'officer')">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }
                }
            ]
        });
    },
    
    /**
     * Load officers data
     */
    loadData: function() {
        Utils.showLoading();
        
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.OFFICERS)
            .select('*')
            .match(divisionFilter)
            .order('name')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading officers data:', error);
                    Utils.showError('Failed to load officers data');
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
     * Show add officer modal
     */
    showAddOfficerModal: function() {
        // Reset form
        document.getElementById('officerForm').reset();
        document.getElementById('officerId').value = '';
        
        // Set modal title
        document.getElementById('officerModalTitle').textContent = 'Add Officer';
        
        // Populate division dropdown
        Utils.populateDivisionDropdown('officerDivision', this.currentUser.division_id);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('officerModal'));
        modal.show();
    },
    
    /**
     * Edit officer
     * @param {string} id - Officer ID
     */
    editOfficer: function(id) {
        Utils.showLoading();
        
        this.supabaseClient
            .from(CONFIG.TABLES.OFFICERS)
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data, error }) => {
                Utils.hideLoading();
                
                if (error) {
                    console.error('Error loading officer data:', error);
                    Utils.showError('Failed to load officer data');
                    return;
                }
                
                if (data) {
                    // Set form values
                    document.getElementById('officerId').value = data.id;
                    document.getElementById('officerName').value = data.name;
                    document.getElementById('officerDesignation').value = data.designation;
                    
                    // Set division and populate districts
                    document.getElementById('officerDivision').value = data.division_id;
                    Utils.populateDistrictDropdown('officerDivision', 'officerDistrict');
                    
                    // Need to wait for districts to be populated
                    setTimeout(() => {
                        // Set district and populate blocks
                        document.getElementById('officerDistrict').value = data.district_id;
                        Utils.populateBlockDropdown('officerDistrict', 'officerBlock');
                        
                        // Need to wait for blocks to be populated
                        setTimeout(() => {
                            document.getElementById('officerBlock').value = data.block_name;
                            document.getElementById('officerTeam').value = data.team_number;
                            document.getElementById('officerMobile').value = data.mobile_number;
                            document.getElementById('officerEmail').value = data.email || '';
                            
                            // Set modal title
                            document.getElementById('officerModalTitle').textContent = 'Edit Officer';
                            
                            // Show modal
                            const modal = new bootstrap.Modal(document.getElementById('officerModal'));
                            modal.show();
                        }, 100);
                    }, 100);
                }
            });
    },
    
    /**
     * Save officer data
     */
    saveOfficer: function() {
        // Validate form
        const form = document.getElementById('officerForm');
        if (!Utils.validateForm(form)) {
            return;
        }
        
        Utils.showLoading();
        
        const officerId = document.getElementById('officerId').value;
        const formData = {
            name: document.getElementById('officerName').value,
            designation: document.getElementById('officerDesignation').value,
            division_id: document.getElementById('officerDivision').value,
            division_name: document.getElementById('officerDivision').options[document.getElementById('officerDivision').selectedIndex].text,
            district_id: document.getElementById('officerDistrict').value,
            district_name: document.getElementById('officerDistrict').options[document.getElementById('officerDistrict').selectedIndex].text,
            block_name: document.getElementById('officerBlock').value,
            team_number: document.getElementById('officerTeam').value,
            mobile_number: document.getElementById('officerMobile').value,
            email: document.getElementById('officerEmail').value || null
        };
        
        // Add or update officer
        let promise;
        
        if (officerId) {
            // Update existing officer
            promise = this.supabaseClient
                .from(CONFIG.TABLES.OFFICERS)
                .update(formData)
                .eq('id', officerId);
        } else {
            // Add new officer
            promise = this.supabaseClient
                .from(CONFIG.TABLES.OFFICERS)
                .insert([formData]);
        }
        
        promise.then(({ data, error }) => {
            Utils.hideLoading();
            
            if (error) {
                console.error('Error saving officer data:', error);
                Utils.showError('Failed to save officer data');
                return;
            }
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('officerModal')).hide();
            
            // Show success message
            Utils.showSuccess('Officer data saved successfully');
            
            // Reload officers data
            this.loadData();
            
            // Refresh dashboard
            Dashboard.loadData();
        });
    },
    
    /**
     * Delete officer
     * @param {string} id - Officer ID
     */
    deleteOfficer: function(id) {
        Utils.showLoading();
        
        this.supabaseClient
            .from(CONFIG.TABLES.OFFICERS)
            .delete()
            .eq('id', id)
            .then(({ error }) => {
                Utils.hideLoading();
                
                if (error) {
                    console.error('Error deleting officer:', error);
                    Utils.showError('Failed to delete officer');
                    return;
                }
                
                Utils.showSuccess('Officer deleted successfully');
                
                // Reload officers data
                this.loadData();
                
                // Refresh dashboard
                Dashboard.loadData();
            });
    }
};


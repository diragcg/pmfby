/**
 * Main application file for the Ground Truth Survey application
 */

const App = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    /**
     * Initialize application
     * @param {Object} user - Current user object
     */
    init: function(user) {
        this.currentUser = user;
        this.supabaseClient = Utils.initSupabase();
        
        if (!this.supabaseClient) {
            Utils.showError('Failed to connect to database. Please check your internet connection and try again.');
            return;
        }
        
        // Set current date
        this.setCurrentDate();
        
        // Initialize tab navigation
        this.initTabNavigation();
        
        // Initialize modules
        Dashboard.init(this.currentUser, this.supabaseClient);
        Officers.init(this.currentUser, this.supabaseClient);
        Surveys.init(this.currentUser, this.supabaseClient);
        CropAssessment.init(this.currentUser, this.supabaseClient);
        Reports.init(this.currentUser, this.supabaseClient);
        
        // Set up delete confirmation modal
        this.setupDeleteConfirmation();
    },
    
    /**
     * Set current date in the UI
     */
    setCurrentDate: function() {
        const today = new Date();
        document.getElementById('currentDate').textContent = today.toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },
    
    /**
     * Initialize tab navigation
     */
    initTabNavigation: function() {
        document.querySelectorAll('.nav-link[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('click', function(event) {
                // Get section name from data attribute
                const section = this.getAttribute('data-section');
                if (section) {
                    // Load data for the selected section
                    App.loadSectionData(section);
                }
            });
        });
    },
    
    /**
     * Load data for a specific section
     * @param {string} section - Section name
     */
    loadSectionData: function(section) {
        switch (section) {
            case 'dashboard':
                Dashboard.loadData();
                break;
            case 'officers':
                Officers.loadData();
                break;
            case 'surveys':
                Surveys.loadData();
                break;
            case 'reports':
                // Reports are generated on demand
                break;
            default:
                break;
        }
    },
    
    /**
     * Set up delete confirmation modal
     */
    setupDeleteConfirmation: function() {
        const confirmDeleteModal = document.getElementById('confirmDeleteModal');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        confirmDeleteBtn.addEventListener('click', function() {
            const itemId = document.getElementById('deleteItemId').value;
            const itemType = document.getElementById('deleteItemType').value;
            
            // Hide modal
            bootstrap.Modal.getInstance(confirmDeleteModal).hide();
            
            // Handle deletion based on item type
            switch (itemType) {
                case 'officer':
                    Officers.deleteOfficer(itemId);
                    break;
                case 'groundTruth':
                    Surveys.deleteGroundTruth(itemId);
                    break;
                case 'cropAssessment':
                    CropAssessment.deleteCropAssessment(itemId);
                    break;
                default:
                    Utils.showError('Unknown item type');
                    break;
            }
        });
    },
    
    /**
     * Show delete confirmation modal
     * @param {string} itemId - ID of item to delete
     * @param {string} itemType - Type of item to delete
     */
    showDeleteConfirmation: function(itemId, itemType) {
        document.getElementById('deleteItemId').value = itemId;
        document.getElementById('deleteItemType').value = itemType;
        
        const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
        modal.show();
    }
};

// Initialize authentication when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
});


/**
 * Dashboard functionality for the Ground Truth Survey application
 */

const Dashboard = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    /**
     * Initialize dashboard
     * @param {Object} user - Current user object
     * @param {Object} supabaseClient - Supabase client instance
     */
    init: function(user, supabaseClient) {
        this.currentUser = user;
        this.supabaseClient = supabaseClient;
        
        // Set up event listeners
        document.getElementById('refreshDashboardBtn').addEventListener('click', this.loadData.bind(this));
        
        // Load initial data
        this.loadData();
    },
    
    /**
     * Load dashboard data
     */
    loadData: function() {
        Utils.showLoading();
        
        // Load summary data
        this.loadSummaryData();
        
        // Load recent surveys
        this.loadRecentSurveys();
    },
    
    /**
     * Load summary data (cards at the top of dashboard)
     */
    loadSummaryData: function() {
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        // Get officers count
        this.supabaseClient
            .from(CONFIG.TABLES.OFFICERS)
            .select('*', { count: 'exact', head: true })
            .match(divisionFilter)
            .then(({ count, error }) => {
                if (error) {
                    console.error('Error loading officers count:', error);
                    return;
                }
                document.getElementById('totalOfficers').textContent = count || 0;
            });
        
        // Get ground truth surveys
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .select('*')
            .match(divisionFilter)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading ground truth surveys:', error);
                    return;
                }
                
                // Calculate totals
                const totalSurveys = data ? data.length : 0;
                let completedSurveys = 0;
                let totalBudget = 0;
                
                if (data && data.length > 0) {
                    data.forEach(survey => {
                        if (survey.total_surveys && survey.completed_surveys && 
                            survey.completed_surveys >= survey.total_surveys) {
                            completedSurveys++;
                        }
                        
                        if (survey.total_amount_demanded) {
                            totalBudget += parseFloat(survey.total_amount_demanded);
                        }
                    });
                }
                
                // Update dashboard cards
                document.getElementById('totalSurveys').textContent = totalSurveys;
                document.getElementById('completedSurveys').textContent = completedSurveys;
                document.getElementById('totalBudget').textContent = Utils.formatCurrency(totalBudget);
                
                // Hide loading spinner when all data is loaded
                Utils.hideLoading();
            });
    },
    
    /**
     * Load recent surveys for the dashboard table
     */
    loadRecentSurveys: function() {
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .select('*')
            .match(divisionFilter)
            .order('survey_date', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading recent surveys:', error);
                    Utils.showError('Failed to load recent surveys');
                    Utils.hideLoading();
                    return;
                }
                
                // Update recent surveys table
                const tableBody = document.getElementById('recentSurveysTable').getElementsByTagName('tbody')[0];
                tableBody.innerHTML = '';
                
                if (data && data.length > 0) {
                    data.forEach(survey => {
                        const row = tableBody.insertRow();
                        
                        // Division
                        let cell = row.insertCell();
                        cell.textContent = survey.division_name;
                        
                        // Team
                        cell = row.insertCell();
                        cell.textContent = survey.team_number;
                        
                        // Date
                        cell = row.insertCell();
                        cell.textContent = Utils.formatDate(survey.survey_date);
                        
                        // Total
                        cell = row.insertCell();
                        cell.textContent = survey.total_surveys;
                        
                        // Completed
                        cell = row.insertCell();
                        cell.textContent = survey.completed_surveys;
                        
                        // Status
                        cell = row.insertCell();
                        cell.innerHTML = Utils.formatStatusBadge(null, survey.completed_surveys, survey.total_surveys);
                    });
                } else {
                    // No data
                    const row = tableBody.insertRow();
                    const cell = row.insertCell();
                    cell.colSpan = 6;
                    cell.textContent = 'No recent surveys found';
                    cell.className = 'text-center';
                }
                
                Utils.hideLoading();
            });
    }
};


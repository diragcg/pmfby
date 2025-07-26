/**
 * Reports functionality for the Ground Truth Survey application
 */

const Reports = {
    // Supabase client instance
    supabaseClient: null,
    
    // Current user data
    currentUser: null,
    
    /**
     * Initialize reports module
     * @param {Object} user - Current user object
     * @param {Object} supabaseClient - Supabase client instance
     */
    init: function(user, supabaseClient) {
        this.currentUser = user;
        this.supabaseClient = supabaseClient;
        
        // Set up event listeners
        document.getElementById('generateReportBtn').addEventListener('click', this.generateReport.bind(this));
        
        // Set default dates (current month)
        this.setDefaultDates();
    },
    
    /**
     * Set default dates for report (current month)
     */
    setDefaultDates: function() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('reportDateFrom').valueAsDate = firstDay;
        document.getElementById('reportDateTo').valueAsDate = lastDay;
    },
    
    /**
     * Generate report based on selected parameters
     */
    generateReport: function() {
        const reportType = document.getElementById('reportType').value;
        const dateFrom = document.getElementById('reportDateFrom').value;
        const dateTo = document.getElementById('reportDateTo').value;
        
        if (!dateFrom || !dateTo) {
            Utils.showError('Please select date range for the report');
            return;
        }
        
        Utils.showLoading();
        
        // Get report data based on type
        switch (reportType) {
            case 'division':
                this.generateDivisionReport(dateFrom, dateTo);
                break;
            case 'district':
                this.generateDistrictReport(dateFrom, dateTo);
                break;
            case 'officer':
                this.generateOfficerReport(dateFrom, dateTo);
                break;
            case 'budget':
                this.generateBudgetReport(dateFrom, dateTo);
                break;
            default:
                Utils.hideLoading();
                Utils.showError('Invalid report type');
                break;
        }
    },
    
    /**
     * Generate division-wise report
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateDivisionReport: function(dateFrom, dateTo) {
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .select('division_id, division_name, total_surveys, completed_surveys, total_amount_demanded')
            .gte('survey_date', dateFrom)
            .lte('survey_date', dateTo)
            .match(divisionFilter)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error generating division report:', error);
                    Utils.showError('Failed to generate division report');
                    Utils.hideLoading();
                    return;
                }
                
                // Process data to aggregate by division
                const divisionData = {};
                
                if (data && data.length > 0) {
                    data.forEach(item => {
                        if (!divisionData[item.division_id]) {
                            divisionData[item.division_id] = {
                                division_name: item.division_name,
                                total_surveys: 0,
                                completed_surveys: 0,
                                total_budget: 0
                            };
                        }
                        
                        divisionData[item.division_id].total_surveys += parseInt(item.total_surveys) || 0;
                        divisionData[item.division_id].completed_surveys += parseInt(item.completed_surveys) || 0;
                        divisionData[item.division_id].total_budget += parseFloat(item.total_amount_demanded) || 0;
                    });
                }
                
                // Convert to array and sort by division name
                const reportData = Object.values(divisionData).sort((a, b) => 
                    a.division_name.localeCompare(b.division_name)
                );
                
                // Display report
                this.displayReport('Division-wise Report', reportData, [
                    { key: 'division_name', label: 'Division' },
                    { key: 'total_surveys', label: 'Total Surveys' },
                    { key: 'completed_surveys', label: 'Completed' },
                    { 
                        key: 'completion_percentage', 
                        label: 'Completion %',
                        calculate: (item) => {
                            return item.total_surveys > 0 ? 
                                Math.round((item.completed_surveys / item.total_surveys) * 100) + '%' : 
                                '0%';
                        }
                    },
                    { 
                        key: 'total_budget', 
                        label: 'Budget Demanded',
                        format: (value) => Utils.formatCurrency(value)
                    }
                ]);
            });
    },
    
    /**
     * Generate district-wise report
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateDistrictReport: function(dateFrom, dateTo) {
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.CROP_ASSESSMENT)
            .select('division_name, district_id, district_name, total_crop_surveys, completed_surveys')
            .gte('assessment_date', dateFrom)
            .lte('assessment_date', dateTo)
            .match(divisionFilter)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error generating district report:', error);
                    Utils.showError('Failed to generate district report');
                    Utils.hideLoading();
                    return;
                }
                
                // Process data to aggregate by district
                const districtData = {};
                
                if (data && data.length > 0) {
                    data.forEach(item => {
                        if (!districtData[item.district_id]) {
                            districtData[item.district_id] = {
                                district_name: item.district_name,
                                division_name: item.division_name,
                                total_surveys: 0,
                                completed_surveys: 0
                            };
                        }
                        
                        districtData[item.district_id].total_surveys += parseInt(item.total_crop_surveys) || 0;
                        districtData[item.district_id].completed_surveys += parseInt(item.completed_surveys) || 0;
                    });
                }
                
                // Convert to array and sort by district name
                const reportData = Object.values(districtData).sort((a, b) => 
                    a.district_name.localeCompare(b.district_name)
                );
                
                // Display report
                this.displayReport('District-wise Report', reportData, [
                    { key: 'district_name', label: 'District' },
                    { key: 'division_name', label: 'Division' },
                    { key: 'total_surveys', label: 'Total Surveys' },
                    { key: 'completed_surveys', label: 'Completed' },
                    { 
                        key: 'completion_percentage', 
                        label: 'Completion %',
                        calculate: (item) => {
                            return item.total_surveys > 0 ? 
                                Math.round((item.completed_surveys / item.total_surveys) * 100) + '%' : 
                                '0%';
                        }
                    }
                ]);
            });
    },
    
    /**
     * Generate officer-wise report
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateOfficerReport: function(dateFrom, dateTo) {
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.OFFICERS)
            .select('id, name, designation, division_name')
            .match(divisionFilter)
            .then(({ data: officersData, error: officersError }) => {
                if (officersError) {
                    console.error('Error loading officers data:', officersError);
                    Utils.showError('Failed to generate officer report');
                    Utils.hideLoading();
                    return;
                }
                
                if (!officersData || officersData.length === 0) {
                    Utils.hideLoading();
                    document.getElementById('reportResult').innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No officers found.
                        </div>
                    `;
                    return;
                }
                
                // Get ground truth surveys
                this.supabaseClient
                    .from(CONFIG.TABLES.GROUND_TRUTH)
                    .select('officer_names, total_surveys, completed_surveys')
                    .gte('survey_date', dateFrom)
                    .lte('survey_date', dateTo)
                    .match(divisionFilter)
                    .then(({ data: surveysData, error: surveysError }) => {
                        if (surveysError) {
                            console.error('Error loading surveys data:', surveysError);
                            Utils.showError('Failed to generate officer report');
                            Utils.hideLoading();
                            return;
                        }
                        
                        // Process data to match officers with surveys
                        const officerStats = {};
                        
                        // Initialize officer stats
                        officersData.forEach(officer => {
                            officerStats[officer.name] = {
                                officer_name: officer.name,
                                designation: officer.designation,
                                division_name: officer.division_name,
                                total_surveys: 0,
                                completed_surveys: 0
                            };
                        });
                        
                        // Add survey data to officers
                        if (surveysData && surveysData.length > 0) {
                            surveysData.forEach(survey => {
                                const officerNames = survey.officer_names.split(',').map(name => name.trim());
                                
                                officerNames.forEach(name => {
                                    if (officerStats[name]) {
                                        officerStats[name].total_surveys += parseInt(survey.total_surveys) || 0;
                                        officerStats[name].completed_surveys += parseInt(survey.completed_surveys) || 0;
                                    }
                                });
                            });
                        }
                        
                        // Convert to array and sort by officer name
                        const reportData = Object.values(officerStats).sort((a, b) => 
                            a.officer_name.localeCompare(b.officer_name)
                        );
                        
                        // Display report
                        this.displayReport('Officer-wise Report', reportData, [
                            { key: 'officer_name', label: 'Officer Name' },
                            { key: 'designation', label: 'Designation' },
                            { key: 'division_name', label: 'Division' },
                            { key: 'total_surveys', label: 'Total Surveys' },
                            { key: 'completed_surveys', label: 'Completed' },
                            { 
                                key: 'completion_percentage', 
                                label: 'Completion %',
                                calculate: (item) => {
                                    return item.total_surveys > 0 ? 
                                        Math.round((item.completed_surveys / item.total_surveys) * 100) + '%' : 
                                        '0%';
                                }
                            }
                        ]);
                    });
            });
    },
    
    /**
     * Generate budget report
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateBudgetReport: function(dateFrom, dateTo) {
        const divisionFilter = this.currentUser.division_id !== 0 ? 
            { division_id: this.currentUser.division_id } : {};
        
        this.supabaseClient
            .from(CONFIG.TABLES.GROUND_TRUTH)
            .select('division_id, division_name, expenditure_amount, total_amount_demanded')
            .gte('survey_date', dateFrom)
            .lte('survey_date', dateTo)
            .match(divisionFilter)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error generating budget report:', error);
                    Utils.showError('Failed to generate budget report');
                    Utils.hideLoading();
                    return;
                }
                
                // Process data to aggregate by division
                const budgetData = {};
                
                if (data && data.length > 0) {
                    data.forEach(item => {
                        if (!budgetData[item.division_id]) {
                            budgetData[item.division_id] = {
                                division_name: item.division_name,
                                expenditure_amount: 0,
                                total_amount_demanded: 0
                            };
                        }
                        
                        budgetData[item.division_id].expenditure_amount += parseFloat(item.expenditure_amount) || 0;
                        budgetData[item.division_id].total_amount_demanded += parseFloat(item.total_amount_demanded) || 0;
                    });
                }
                
                // Convert to array and calculate balance
                const reportData = Object.values(budgetData).map(item => ({
                    ...item,
                    balance: item.total_amount_demanded - item.expenditure_amount
                })).sort((a, b) => 
                    a.division_name.localeCompare(b.division_name)
                );
                
                // Display report
                this.displayReport('Budget Report', reportData, [
                    { key: 'division_name', label: 'Division' },
                    { 
                        key: 'expenditure_amount', 
                        label: 'Expenditure Amount',
                        format: (value) => Utils.formatCurrency(value)
                    },
                    { 
                        key: 'total_amount_demanded', 
                        label: 'Amount Demanded',
                        format: (value) => Utils.formatCurrency(value)
                    },
                    { 
                        key: 'balance', 
                        label: 'Balance',
                        format: (value) => Utils.formatCurrency(value)
                    }
                ]);
            });
    },

    /**
     * Display report in the UI
     * @param {string} title - Report title
     * @param {Array} data - Report data
     * @param {Array} columns - Column definitions
     */
    displayReport: function(title, data, columns) {
        Utils.hideLoading();
        
        let reportHtml = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>${title} (${Utils.formatDate(document.getElementById('reportDateFrom').value)} to \${Utils.formatDate(document.getElementById('reportDateTo').value)})</span>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary me-2" onclick="Reports.exportCurrentReportToPDF()">
                            <i class="fas fa-file-pdf me-1"></i> PDF
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="Reports.exportCurrentReportToExcel()">
                            <i class="fas fa-file-excel me-1"></i> Excel
                        </button>
                    </div>
                </div>
                <div class="card-body">
        `;
        
        if (data && data.length > 0) {
            reportHtml += `
                <div class="table-responsive">
                    <table class="table table-bordered table-striped" id="reportDataTable">
                        <thead>
                            <tr>
                                <th>क्र.सं.</th>
            `;
            
            // Add column headers
            columns.forEach(column => {
                reportHtml += `<th>\${column.label}</th>`;
            });
            
            reportHtml += `
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add data rows
            data.forEach((row, index) => {
                reportHtml += `<tr><td>${index + 1}</td>`;
                
                columns.forEach(column => {
                    let value = row[column.key];
                    if (column.format) {
                        value = column.format(value);
                    } else if (column.calculate) {
                        value = column.calculate(row);
                    }
                    reportHtml += `<td>${value}</td>`;
                });
                
                reportHtml += `</tr>`;
            });
            
            reportHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No


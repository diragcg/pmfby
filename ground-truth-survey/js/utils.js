/**
 * Utility functions for the Ground Truth Survey application
 */

const Utils = {
    /**
     * Initialize Supabase client
     * @returns {Object} Supabase client
     */
    initSupabase: function() {
        try {
            return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            Utils.showError('Failed to connect to database. Please check your internet connection and try again.');
            return null;
        }
    },

    /**
     * Show loading spinner
     */
    showLoading: function() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    },

    /**
     * Hide loading spinner
     */
    hideLoading: function() {
        document.getElementById('loadingSpinner').style.display = 'none';
    },

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    showSuccess: function(message) {
        const successAlert = document.getElementById('successAlert');
        document.getElementById('successMessage').textContent = message;
        successAlert.style.display = 'block';
        
        // Scroll to message if it's not in view
        if (!Utils.isInViewport(successAlert)) {
            successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 3000);
    },

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError: function(message) {
        const errorAlert = document.getElementById('errorAlert');
        document.getElementById('errorMessage').textContent = message;
        errorAlert.style.display = 'block';
        
        // Scroll to message if it's not in view
        if (!Utils.isInViewport(errorAlert)) {
            errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    },

    /**
     * Check if an element is in the viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is in viewport
     */
    isInViewport: function(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Format date to locale string
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date string
     */
    formatDate: function(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('hi-IN');
    },

    /**
     * Format currency with Indian locale
     * @param {number} amount - Amount to format
     * @returns {string} Formatted amount string
     */
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined) return '₹0';
        return '₹' + parseFloat(amount).toLocaleString('en-IN');
    },

    /**
     * Get districts for a division
     * @param {number} divisionId - Division ID
     * @returns {Array} Array of district objects
     */
    getDistrictsForDivision: function(divisionId) {
        return Object.entries(CONFIG.DISTRICTS)
            .filter(([_, district]) => district.division_id == divisionId)
            .map(([id, district]) => ({ id, name: district.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Get blocks for a district
     * @param {number} districtId - District ID
     * @returns {Array} Array of block names
     */
    getBlocksForDistrict: function(districtId) {
        return CONFIG.BLOCKS[districtId] || [];
    },

    /**
     * Populate a division dropdown
     * @param {string} selectId - ID of select element
     * @param {number} currentUserDivisionId - Current user's division ID
     */
    populateDivisionDropdown: function(selectId, currentUserDivisionId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">संभाग चुनें</option>';
        
        // If user is division admin, only show their division
        if (currentUserDivisionId !== 0) {
            const option = document.createElement('option');
            option.value = currentUserDivisionId;
            option.textContent = CONFIG.DIVISIONS[currentUserDivisionId];
            select.appendChild(option);
        } else {
            // Admin can see all divisions
            Object.entries(CONFIG.DIVISIONS).forEach(([id, name]) => {
                if (id != 6) { // Skip Pradesh
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = name;
                    select.appendChild(option);
                }
            });
        }
    },

    /**
     * Populate a district dropdown based on selected division
     * @param {string} divisionSelectId - ID of division select element
     * @param {string} districtSelectId - ID of district select element
     */
    populateDistrictDropdown: function(divisionSelectId, districtSelectId) {
        const divisionId = document.getElementById(divisionSelectId).value;
        const districtSelect = document.getElementById(districtSelectId);
        
        districtSelect.innerHTML = '<option value="">जिला चुनें</option>';
        
        if (!divisionId) return;
        
        Utils.getDistrictsForDivision(divisionId).forEach(district => {
            const option = document.createElement('option');
            option.value = district.id;
            option.textContent = district.name;
            districtSelect.appendChild(option);
        });
    },

    /**
     * Populate a block dropdown based on selected district
     * @param {string} districtSelectId - ID of district select element
     * @param {string} blockSelectId - ID of block select element
     */
    populateBlockDropdown: function(districtSelectId, blockSelectId) {
        const districtId = document.getElementById(districtSelectId).value;
        const blockSelect = document.getElementById(blockSelectId);
        
        blockSelect.innerHTML = '<option value="">विकासखंड चुनें</option>';
        
        if (!districtId) return;
        
        const blocks = Utils.getBlocksForDistrict(districtId);
        blocks.forEach(block => {
            const option = document.createElement('option');
            option.value = block;
            option.textContent = block;
            blockSelect.appendChild(option);
        });
    },

    /**
     * Validate form
     * @param {HTMLFormElement} form - Form to validate
     * @returns {boolean} True if form is valid
     */
    validateForm: function(form) {
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        return true;
    },

    /**
     * Reset form
     * @param {string} formId - ID of form to reset
     */
    resetForm: function(formId) {
        document.getElementById(formId).reset();
    },

    /**
     * Format status badge
     * @param {string} status - Status text
     * @param {number} completed - Completed count
     * @param {number} total - Total count
     * @returns {string} HTML for status badge
     */
    formatStatusBadge: function(status, completed, total) {
        if (status) {
            if (status === 'Completed') {
                return '<span class="badge bg-success">पूर्ण</span>';
            } else if (status === 'In Progress') {
                return '<span class="badge bg-warning">प्रगति में</span>';
            } else {
                return '<span class="badge bg-secondary">शुरू नहीं</span>';
            }
        } else if (completed !== undefined && total !== undefined) {
            if (completed >= total) {
                return '<span class="badge bg-success">पूर्ण</span>';
            } else if (completed > 0) {
                return '<span class="badge bg-warning">प्रगति में</span>';
            } else {
                return '<span class="badge bg-secondary">शुरू नहीं</span>';
            }
        }
        return '';
    },

    /**
     * Export table to Excel
     * @param {string} tableId - ID of table to export
     * @param {string} fileName - File name for export
     */
    exportToExcel: function(tableId, fileName) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    },

    /**
     * Export table to PDF
     * @param {string} tableId - ID of table to export
     * @param {string} fileName - File name for export
     * @param {string} title - Title for PDF
     */
    exportToPDF: function(tableId, fileName, title) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        
        // Add date
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString('hi-IN')}`, 14, 30);
        
        // Add table
        doc.autoTable({ 
            html: `#${tableId}`,
            startY: 35,
            styles: { overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 'auto' } },
            margin: { top: 35 }
        });
        
        // Save PDF
        doc.save(`${fileName}.pdf`);
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    },

    /**
     * Get current user from local storage
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser: function() {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * Set current user in local storage
     * @param {Object} user - User object to store
     */
    setCurrentUser: function(user) {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    },

    /**
     * Initialize DataTable
     * @param {string} tableId - ID of table element
     * @param {Object} options - DataTable options
     * @returns {Object} DataTable instance
     */
    initDataTable: function(tableId, options = {}) {
        const defaultOptions = {
            pageLength: 10,
            lengthMenu: [5, 10, 25, 50],
            language: {
                search: "खोजें:",
                lengthMenu: "_MENU_ प्रविष्टियां दिखाएं",
                info: "_TOTAL_ में से _START_ से _END_ प्रविष्टियां दिखा रहे हैं",
                infoEmpty: "कोई प्रविष्टि नहीं मिली",
                infoFiltered: "(_MAX_ प्रविष्टियों में से फ़िल्टर किया गया)",
                paginate: {
                    first: "प्रथम",
                    last: "अंतिम",
                    next: "अगला",
                    previous: "पिछला"
                }
            },
            responsive: true
        };
        
        return $(`#${tableId}`).DataTable({...defaultOptions, ...options});
    }
};

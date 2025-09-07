// dbt-calculations.js

/**
 * DBT Calculations Module
 * Handles all automatic calculations, formula processing, and data computations
 */

const DBTCalculations = {
    
    // Configuration for calculations
    config: {
        // Average benefit amount for savings calculation (configurable)
        avgBenefitAmount: 2000, // INR
        
        // Calculation precision
        precision: {
            currency: 2,
            percentage: 2,
            number: 0
        },
        
        // Validation thresholds
        thresholds: {
            maxAmount: 100000000, // 10 crores
            maxBeneficiaries: 10000000, // 1 crore
            minPercentage: 0,
            maxPercentage: 100
        }
    },

    /**
     * Setup automatic calculations for all relevant fields
     */
    setupAutoCalculations() {
        // Amount calculation fields
        const amountFields = [
            'centralShareFund', 'normativeStateShare', 'additionalStateContributed', 
            'stateShareAdditional', 'nonElectronicDisbursed', 'electronicDisbursed'
        ];
        
        amountFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateTotalAmount());
                field.addEventListener('change', () => this.calculateTotalAmount());
            }
        });
        
        // Beneficiary calculation fields
        const beneficiaryFields = [
            'additionalBeneficiariesCSS', 'additionalBeneficiariesState', 'beneficiariesDigitized'
        ];
        
        beneficiaryFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateTotalBeneficiaries());
                field.addEventListener('change', () => this.calculateTotalBeneficiaries());
            }
        });
        
        // Savings calculation fields
        const savingsFields = ['deduplicationAadhaar', 'ghostBeneficiaries', 'otherSavings'];
        savingsFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateSavings());
                field.addEventListener('change', () => this.calculateSavings());
            }
        });

        // Percentage calculations
        this.setupPercentageCalculations();
        
        // Cross-validation calculations
        this.setupCrossValidationCalculations();
        
        console.log('Auto-calculations setup completed');
    },

    /**
     * Calculate total amount disbursed
     */
    calculateTotalAmount() {
        try {
            const fields = [
                'centralShareFund', 'normativeStateShare', 'additionalStateContributed', 
                'stateShareAdditional', 'nonElectronicDisbursed', 'electronicDisbursed'
            ];
            
            let total = 0;
            let hasValues = false;
            
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && field.value) {
                    const value = parseFloat(field.value) || 0;
                    if (value > 0) {
                        total += value;
                        hasValues = true;
                    }
                }
            });
            
            const totalField = document.getElementById('totalAmountDisbursed');
            if (totalField) {
                totalField.value = hasValues ? total.toFixed(this.config.precision.currency) : '';
                
                // Trigger validation
                const event = new Event('input', { bubbles: true });
                totalField.dispatchEvent(event);
            }
            
            // Update related calculations
            this.calculateAmountPercentages();
            
        } catch (error) {
            console.error('Error calculating total amount:', error);
        }
    },

    /**
     * Calculate total beneficiaries
     */
    calculateTotalBeneficiaries() {
        try {
            const fields = [
                'additionalBeneficiariesCSS', 'additionalBeneficiariesState', 'beneficiariesDigitized'
            ];
            
            let total = 0;
            let hasValues = false;
            
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && field.value) {
                    const value = parseInt(field.value) || 0;
                    if (value > 0) {
                        total += value;
                        hasValues = true;
                    }
                }
            });
            
            const totalField = document.getElementById('totalBeneficiaries');
            if (totalField) {
                totalField.value = hasValues ? total : '';
                
                // Trigger validation
                const event = new Event('input', { bubbles: true });
                totalField.dispatchEvent(event);
            }
            
            // Update related calculations
            this.calculateBeneficiaryPercentages();
            this.calculateAverageAmountPerBeneficiary();
            
        } catch (error) {
            console.error('Error calculating total beneficiaries:', error);
        }
    },

    /**
     * Calculate savings amount
     */
    calculateSavings() {
        try {
            const deduplication = parseInt(document.getElementById('deduplicationAadhaar')?.value) || 0;
            const ghost = parseInt(document.getElementById('ghostBeneficiaries')?.value) || 0;
            const other = parseFloat(document.getElementById('otherSavings')?.value) || 0;
            
            // Calculate savings from removed beneficiaries
            const beneficiarySavings = (deduplication + ghost) * this.config.avgBenefitAmount;
            
            // Total savings
            const totalSavings = beneficiarySavings + other;
            
            const savingField = document.getElementById('savingAmount');
            if (savingField) {
                savingField.value = totalSavings.toFixed(this.config.precision.currency);
                
                // Trigger validation
                const event = new Event('input', { bubbles: true });
                savingField.dispatchEvent(event);
            }
            
            // Update savings percentage
            this.calculateSavingsPercentage();
            
        } catch (error) {
            console.error('Error calculating savings:', error);
        }
    },

    /**
     * Calculate amount percentages (Electronic vs Non-Electronic)
     */
    calculateAmountPercentages() {
        try {
            const electronic = parseFloat(document.getElementById('electronicDisbursed')?.value) || 0;
            const nonElectronic = parseFloat(document.getElementById('nonElectronicDisbursed')?.value) || 0;
            const total = electronic + nonElectronic;
            
            if (total > 0) {
                const electronicPercentage = (electronic / total) * 100;
                const nonElectronicPercentage = (nonElectronic / total) * 100;
                
                // Display percentages (if you have display elements)
                this.displayPercentage('electronicAmountPercentage', electronicPercentage);
                this.displayPercentage('nonElectronicAmountPercentage', nonElectronicPercentage);
                
                // Validate electronic vs non-electronic ratio
                this.validateElectronicRatio(electronicPercentage);
            }
            
        } catch (error) {
            console.error('Error calculating amount percentages:', error);
        }
    },

    /**
     * Calculate beneficiary percentages
     */
    calculateBeneficiaryPercentages() {
        try {
            const electronic = parseInt(document.getElementById('electronicModeBeneficiaries')?.value) || 0;
            const nonElectronic = parseInt(document.getElementById('nonElectronicBeneficiaries')?.value) || 0;
            const total = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
            
            if (total > 0) {
                const electronicPercentage = (electronic / total) * 100;
                const nonElectronicPercentage = (nonElectronic / total) * 100;
                const coverage = ((electronic + nonElectronic) / total) * 100;
                
                // Display percentages
                this.displayPercentage('electronicBeneficiaryPercentage', electronicPercentage);
                this.displayPercentage('nonElectronicBeneficiaryPercentage', nonElectronicPercentage);
                this.displayPercentage('beneficiaryCoverage', coverage);
                
                // Validate coverage
                this.validateBeneficiaryCoverage(coverage);
            }
            
        } catch (error) {
            console.error('Error calculating beneficiary percentages:', error);
        }
    },

    /**
     * Calculate average amount per beneficiary
     */
    calculateAverageAmountPerBeneficiary() {
        try {
            const totalAmount = parseFloat(document.getElementById('totalAmountDisbursed')?.value) || 0;
            const totalBeneficiaries = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
            
            if (totalBeneficiaries > 0 && totalAmount > 0) {
                const averageAmount = totalAmount / totalBeneficiaries;
                
                // Display average amount
                this.displayCurrency('averageAmountPerBeneficiary', averageAmount);
                
                // Validate reasonable average amount
                this.validateAverageAmount(averageAmount);
            }
            
        } catch (error) {
            console.error('Error calculating average amount per beneficiary:', error);
        }
    },

    /**
     * Calculate savings percentage
     */
    calculateSavingsPercentage() {
        try {
            const savingsAmount = parseFloat(document.getElementById('savingAmount')?.value) || 0;
            const totalBudget = this.calculateTotalBudget();
            
            if (totalBudget > 0 && savingsAmount > 0) {
                const savingsPercentage = (savingsAmount / totalBudget) * 100;
                
                // Display savings percentage
                this.displayPercentage('savingsPercentage', savingsPercentage);
            }
            
        } catch (error) {
            console.error('Error calculating savings percentage:', error);
        }
    },

    /**
     * Calculate total budget allocation
     * @returns {number} - Total budget amount
     */
    calculateTotalBudget() {
        try {
            const central = parseFloat(document.getElementById('centralAllocation')?.value) || 0;
            const stateNormative = parseFloat(document.getElementById('stateNormativeAllocation')?.value) || 0;
            const additional = parseFloat(document.getElementById('additionalStateAllocation')?.value) || 0;
            
            return central + stateNormative + additional;
        } catch (error) {
            console.error('Error calculating total budget:', error);
            return 0;
        }
    },

    /**
     * Setup percentage calculations
     */
    setupPercentageCalculations() {
        // Aadhaar seeding percentage
        const aadhaarFields = ['aadhaarSeeded', 'totalBeneficiaries'];
        aadhaarFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateAadhaarPercentage());
            }
        });

        // Mobile availability percentage
        const mobileFields = ['mobileAvailable', 'totalBeneficiaries'];
        mobileFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.calculateMobilePercentage());
            }
        });
    },

    /**
     * Calculate Aadhaar seeding percentage
     */
    calculateAadhaarPercentage() {
        try {
            const aadhaarSeeded = parseInt(document.getElementById('aadhaarSeeded')?.value) || 0;
            const totalBeneficiaries = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
            
            if (totalBeneficiaries > 0) {
                const percentage = (aadhaarSeeded / totalBeneficiaries) * 100;
                this.displayPercentage('aadhaarPercentage', percentage);
                
                // Validate Aadhaar coverage
                this.validateAadhaarCoverage(percentage);
            }
        } catch (error) {
            console.error('Error calculating Aadhaar percentage:', error);
        }
    },

    /**
     * Calculate mobile availability percentage
     */
    calculateMobilePercentage() {
        try {
            const mobileAvailable = parseInt(document.getElementById('mobileAvailable')?.value) || 0;
            const totalBeneficiaries = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
            
            if (totalBeneficiaries > 0) {
                const percentage = (mobileAvailable / totalBeneficiaries) * 100;
                this.displayPercentage('mobilePercentage', percentage);
            }
        } catch (error) {
            console.error('Error calculating mobile percentage:', error);
        }
    },

    /**
     * Setup cross-validation calculations
     */
    setupCrossValidationCalculations() {
        // Validate transaction counts vs beneficiary counts
        const transactionFields = ['electronicTransactions', 'nonElectronicTransactions'];
        const beneficiaryFields = ['electronicModeBeneficiaries', 'nonElectronicBeneficiaries'];
        
        [...transactionFields, ...beneficiaryFields].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.validateTransactionBeneficiaryRatio());
            }
        });
    },

    /**
     * Validate transaction to beneficiary ratio
     */
    validateTransactionBeneficiaryRatio() {
        try {
            const electronicTxn = parseInt(document.getElementById('electronicTransactions')?.value) || 0;
            const electronicBen = parseInt(document.getElementById('electronicModeBeneficiaries')?.value) || 0;
            
            const nonElectronicTxn = parseInt(document.getElementById('nonElectronicTransactions')?.value) || 0;
            const nonElectronicBen = parseInt(document.getElementById('nonElectronicBeneficiaries')?.value) || 0;
            
            // Electronic ratio validation
            if (electronicBen > 0) {
                const electronicRatio = electronicTxn / electronicBen;
                this.displayRatio('electronicTxnRatio', electronicRatio);
                
                if (electronicRatio < 0.8 || electronicRatio > 5) {
                    this.showCalculationWarning('इलेक्ट्रॉनिक लेनदेन और लाभार्थी अनुपात असामान्य लग रहा है।');
                }
            }
            
            // Non-electronic ratio validation
            if (nonElectronicBen > 0) {
                const nonElectronicRatio = nonElectronicTxn / nonElectronicBen;
                this.displayRatio('nonElectronicTxnRatio', nonElectronicRatio);
                
                if (nonElectronicRatio < 0.8 || nonElectronicRatio > 2) {
                    this.showCalculationWarning('नॉन-इलेक्ट्रॉनिक लेनदेन और लाभार्थी अनुपात असामान्य लग रहा है।');
                }
            }
            
        } catch (error) {
            console.error('Error validating transaction-beneficiary ratio:', error);
        }
    },

    /**
     * Validate electronic disbursement ratio
     * @param {number} electronicPercentage - Electronic disbursement percentage
     */
    validateElectronicRatio(electronicPercentage) {
        // DBT guidelines recommend at least 80% electronic disbursement
        if (electronicPercentage < 80) {
            this.showCalculationWarning(
                `इलेक्ट्रॉनिक वितरण ${electronicPercentage.toFixed(1)}% है। DBT दिशानिर्देशों के अनुसार यह 80% से अधिक होना चाहिए।`
            );
        }
    },

    /**
     * Validate beneficiary coverage
     * @param {number} coverage - Beneficiary coverage percentage
     */
    validateBeneficiaryCoverage(coverage) {
        if (coverage > 100) {
            this.showCalculationError('लाभार्थी कवरेज 100% से अधिक नहीं हो सकती।');
        } else if (coverage < 90) {
            this.showCalculationWarning(
                `लाभार्थी कवरेज ${coverage.toFixed(1)}% है। यह 90% से अधिक होना चाहिए।`
            );
        }
    },

    /**
     * Validate average amount per beneficiary
     * @param {number} averageAmount - Average amount per beneficiary
     */
    validateAverageAmount(averageAmount) {
        const minAmount = 100; // Minimum reasonable amount
        const maxAmount = 50000; // Maximum reasonable amount
        
        if (averageAmount < minAmount) {
            this.showCalculationWarning(
                `प्रति लाभार्थी औसत राशि ₹${averageAmount.toFixed(2)} बहुत कम लग रही है।`
            );
        } else if (averageAmount > maxAmount) {
            this.showCalculationWarning(
                `प्रति लाभार्थी औसत राशि ₹${averageAmount.toFixed(2)} बहुत अधिक लग रही है।`
            );
        }
    },

    /**
     * Validate Aadhaar coverage
     * @param {number} percentage - Aadhaar seeding percentage
     */
    validateAadhaarCoverage(percentage) {
        if (percentage < 95) {
            this.showCalculationWarning(
                `आधार सीडिंग ${percentage.toFixed(1)}% है। यह 95% से अधिक होना चाहिए।`
            );
        }
    },

    /**
     * Display percentage value
     * @param {string} elementId - Element ID to display percentage
     * @param {number} percentage - Percentage value
     */
    displayPercentage(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${percentage.toFixed(this.config.precision.percentage)}%`;
        }
    },

    /**
     * Display currency value
     * @param {string} elementId - Element ID to display currency
     * @param {number} amount - Currency amount
     */
    displayCurrency(elementId, amount) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `₹${this.formatCurrency(amount)}`;
        }
    },

    /**
     * Display ratio value
     * @param {string} elementId - Element ID to display ratio
     * @param {number} ratio - Ratio value
     */
    displayRatio(elementId, ratio) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${ratio.toFixed(2)}:1`;
        }
    },

    /**
     * Format currency for display
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: this.config.precision.currency,
            maximumFractionDigits: this.config.precision.currency
        }).format(amount);
    },

    /**
     * Show calculation warning
     * @param {string} message - Warning message
     */
    showCalculationWarning(message) {
        // Use global showAlert if available
        if (typeof showAlert === 'function') {
            showAlert(message, 'warning');
        } else {
            console.warn('Calculation Warning:', message);
        }
    },

    /**
     * Show calculation error
     * @param {string} message - Error message
     */
    showCalculationError(message) {
        // Use global showAlert if available
        if (typeof showAlert === 'function') {
            showAlert(message, 'danger');
        } else {
            console.error('Calculation Error:', message);
        }
    },

    /**
     * Recalculate all dependent fields
     */
    recalculateAll() {
        try {
            this.calculateTotalAmount();
            this.calculateTotalBeneficiaries();
            this.calculateSavings();
            this.calculateAmountPercentages();
            this.calculateBeneficiaryPercentages();
            this.calculateAverageAmountPerBeneficiary();
            this.calculateAadhaarPercentage();
            this.calculateMobilePercentage();
            this.validateTransactionBeneficiaryRatio();
            
            console.log('All calculations updated');
        } catch (error) {
            console.error('Error in recalculateAll:', error);
        }
    },

    /**
     * Reset all calculated fields
     */
    resetCalculations() {
        const calculatedFields = [
            'totalAmountDisbursed', 'totalBeneficiaries', 'savingAmount'
        ];
        
        calculatedFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
        
        console.log('Calculations reset');
    },

    /**
     * Get calculation summary
     * @returns {Object} - Summary of all calculations
     */
    getCalculationSummary() {
        return {
            totalAmount: parseFloat(document.getElementById('totalAmountDisbursed')?.value) || 0,
            totalBeneficiaries: parseInt(document.getElementById('totalBeneficiaries')?.value) || 0,
            totalSavings: parseFloat(document.getElementById('savingAmount')?.value) || 0,
            averageAmount: this.calculateAverageAmount(),
            electronicPercentage: this.getElectronicPercentage(),
            aadhaarCoverage: this.getAadhaarCoverage(),
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Calculate average amount (helper)
     * @returns {number} - Average amount per beneficiary
     */
    calculateAverageAmount() {
        const totalAmount = parseFloat(document.getElementById('totalAmountDisbursed')?.value) || 0;
        const totalBeneficiaries = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
        
        return totalBeneficiaries > 0 ? totalAmount / totalBeneficiaries : 0;
    },

    /**
     * Get electronic disbursement percentage (helper)
     * @returns {number} - Electronic disbursement percentage
     */
    getElectronicPercentage() {
        const electronic = parseFloat(document.getElementById('electronicDisbursed')?.value) || 0;
        const total = parseFloat(document.getElementById('totalAmountDisbursed')?.value) || 0;
        
        return total > 0 ? (electronic / total) * 100 : 0;
    },

    /**
     * Get Aadhaar coverage percentage (helper)
     * @returns {number} - Aadhaar seeding percentage
     */
    getAadhaarCoverage() {
        const aadhaarSeeded = parseInt(document.getElementById('aadhaarSeeded')?.value) || 0;
        const totalBeneficiaries = parseInt(document.getElementById('totalBeneficiaries')?.value) || 0;
        
        return totalBeneficiaries > 0 ? (aadhaarSeeded / totalBeneficiaries) * 100 : 0;
    },

    /**
     * Initialize calculations module
     */
    init() {
        console.log('DBT Calculations module initialized');
        
        // Setup calculations when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupAutoCalculations();
            });
        } else {
            this.setupAutoCalculations();
        }
    }
};

// Initialize calculations module
DBTCalculations.init();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBTCalculations;
}

console.log('DBT Calculations module loaded successfully');

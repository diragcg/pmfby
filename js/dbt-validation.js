// dbt-validation.js

/**
 * DBT Form Validation Module
 * Handles all form validation logic, field validation, and error messaging
 */

const DBTValidation = {
    
    // Validation rules configuration
    validationRules: {
        required: [
            'schemeSelect', 'dbtDate'
        ],
        currency: [
            'centralAllocation', 'stateNormativeAllocation', 'additionalStateAllocation', 
            'totalAmountDisbursed', 'centralShareFund', 'normativeStateShare', 
            'additionalStateContributed', 'stateShareAdditional', 'nonElectronicDisbursed', 
            'electronicDisbursed', 'otherSavings', 'savingAmount'
        ],
        number: [
            'totalBeneficiaries', 'additionalBeneficiariesCSS', 'additionalBeneficiariesState', 
            'beneficiariesDigitized', 'bankAccountDetails', 'aadhaarSeeded', 'aadhaarAuthenticated', 
            'mobileAvailable', 'electronicModeBeneficiaries', 'nonElectronicBeneficiaries', 
            'electronicTransactions', 'nonElectronicTransactions', 'deduplicationAadhaar', 
            'ghostBeneficiaries'
        ],
        email: [],
        phone: [],
        date: ['dbtDate']
    },

    // Custom validation rules
    customRules: {
        // Beneficiary validation rules
        beneficiaryLogic: {
            // Electronic + Non-electronic should not exceed total
            totalBeneficiaryCheck: function(formData) {
                const electronic = parseInt(formData.electronicModeBeneficiaries) || 0;
                const nonElectronic = parseInt(formData.nonElectronicBeneficiaries) || 0;
                const total = parseInt(formData.totalBeneficiaries) || 0;
                
                if ((electronic + nonElectronic) > total) {
                    return {
                        isValid: false,
                        message: 'इलेक्ट्रॉनिक और नॉन-इलेक्ट्रॉनिक लाभार्थियों का योग कुल लाभार्थियों से अधिक नहीं हो सकता।'
                    };
                }
                return { isValid: true };
            },
            
            // Aadhaar authenticated should not exceed Aadhaar seeded
            aadhaarLogicCheck: function(formData) {
                const seeded = parseInt(formData.aadhaarSeeded) || 0;
                const authenticated = parseInt(formData.aadhaarAuthenticated) || 0;
                
                if (authenticated > seeded) {
                    return {
                        isValid: false,
                        message: 'आधार प्रमाणित लाभार्थी आधार सीडेड लाभार्थियों से अधिक नहीं हो सकते।'
                    };
                }
                return { isValid: true };
            }
        },

        // Amount validation rules
        amountLogic: {
            // Electronic + Non-electronic should equal total disbursed
            totalAmountCheck: function(formData) {
                const electronic = parseFloat(formData.electronicDisbursed) || 0;
                const nonElectronic = parseFloat(formData.nonElectronicDisbursed) || 0;
                const total = parseFloat(formData.totalAmountDisbursed) || 0;
                
                const calculatedTotal = electronic + nonElectronic;
                const difference = Math.abs(calculatedTotal - total);
                
                // Allow small rounding differences
                if (difference > 0.01) {
                    return {
                        isValid: false,
                        message: 'इलेक्ट्रॉनिक और नॉन-इलेक्ट्रॉनिक राशि का योग कुल वितरित राशि के बराबर होना चाहिए।'
                    };
                }
                return { isValid: true };
            }
        },

        // Date validation rules
        dateLogic: {
            // DBT date should not be in future
            futureDateCheck: function(formData) {
                const dbtDate = formData.dbtDate;
                if (!dbtDate) return { isValid: true };
                
                const selectedDate = new Date(dbtDate);
                const today = new Date();
                today.setHours(23, 59, 59, 999); // End of today
                
                if (selectedDate > today) {
                    return {
                        isValid: false,
                        message: 'DBT तारीख भविष्य की नहीं हो सकती।'
                    };
                }
                return { isValid: true };
            },

            // DBT date should not be too old (more than 1 year)
            oldDateCheck: function(formData) {
                const dbtDate = formData.dbtDate;
                if (!dbtDate) return { isValid: true };
                
                const selectedDate = new Date(dbtDate);
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                
                if (selectedDate < oneYearAgo) {
                    return {
                        isValid: false,
                        message: 'DBT तारीख एक साल से अधिक पुरानी नहीं हो सकती।'
                    };
                }
                return { isValid: true };
            }
        }
    },

    // Error messages in Hindi
    errorMessages: {
        required: 'यह फील्ड आवश्यक है।',
        invalidCurrency: 'कृपया वैध राशि दर्ज करें।',
        invalidNumber: 'कृपया वैध संख्या दर्ज करें।',
        invalidEmail: 'कृपया वैध ईमेल पता दर्ज करें।',
        invalidPhone: 'कृपया वैध फोन नंबर दर्ज करें।',
        invalidDate: 'कृपया वैध तारीख दर्ज करें।',
        negativeValue: 'मान शून्य या धनात्मक होना चाहिए।',
        exceedsLimit: 'मान निर्धारित सीमा से अधिक है।'
    },

    /**
     * Validate individual field
     * @param {Event} event - Field event
     * @returns {boolean} - Validation result
     */
    validateField(event) {
        const field = event.target;
        const fieldId = field.id;
        const value = field.value.trim();
        
        // Clear previous validation state
        this.clearFieldValidation(field);
        
        let isValid = true;
        let errorMessage = '';
        
        // Check if field is required
        if (this.validationRules.required.includes(fieldId) && !value) {
            isValid = false;
            errorMessage = this.errorMessages.required;
        }
        
        // Validate based on field type
        if (value && isValid) {
            if (this.validationRules.currency.includes(fieldId)) {
                const result = this.validateCurrency(value);
                isValid = result.isValid;
                errorMessage = result.message;
            } else if (this.validationRules.number.includes(fieldId)) {
                const result = this.validateNumber(value);
                isValid = result.isValid;
                errorMessage = result.message;
            } else if (this.validationRules.email.includes(fieldId)) {
                const result = this.validateEmail(value);
                isValid = result.isValid;
                errorMessage = result.message;
            } else if (this.validationRules.phone.includes(fieldId)) {
                const result = this.validatePhone(value);
                isValid = result.isValid;
                errorMessage = result.message;
            } else if (this.validationRules.date.includes(fieldId)) {
                const result = this.validateDate(value, fieldId);
                isValid = result.isValid;
                errorMessage = result.message;
            }
        }
        
        // Apply validation state
        this.applyFieldValidation(field, isValid, errorMessage);
        
        return isValid;
    },

    /**
     * Validate currency value
     * @param {string} value - Value to validate
     * @returns {Object} - Validation result
     */
    validateCurrency(value) {
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            return {
                isValid: false,
                message: this.errorMessages.invalidCurrency
            };
        }
        
        if (numValue < 0) {
            return {
                isValid: false,
                message: this.errorMessages.negativeValue
            };
        }
        
        // Check for reasonable upper limit (10 crores)
        if (numValue > 100000000) {
            return {
                isValid: false,
                message: 'राशि 10 करोड़ से अधिक नहीं हो सकती।'
            };
        }
        
        return { isValid: true };
    },

    /**
     * Validate number value
     * @param {string} value - Value to validate
     * @returns {Object} - Validation result
     */
    validateNumber(value) {
        const numValue = parseInt(value);
        
        if (isNaN(numValue)) {
            return {
                isValid: false,
                message: this.errorMessages.invalidNumber
            };
        }
        
        if (numValue < 0) {
            return {
                isValid: false,
                message: this.errorMessages.negativeValue
            };
        }
        
        // Check for reasonable upper limit (1 crore beneficiaries)
        if (numValue > 10000000) {
            return {
                isValid: false,
                message: 'संख्या 1 करोड़ से अधिक नहीं हो सकती।'
            };
        }
        
        return { isValid: true };
    },

    /**
     * Validate email address
     * @param {string} value - Email to validate
     * @returns {Object} - Validation result
     */
    validateEmail(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(value)) {
            return {
                isValid: false,
                message: this.errorMessages.invalidEmail
            };
        }
        
        return { isValid: true };
    },

    /**
     * Validate phone number
     * @param {string} value - Phone number to validate
     * @returns {Object} - Validation result
     */
    validatePhone(value) {
        // Indian phone number validation
        const phoneRegex = /^[6-9]\d{9}$/;
        
        if (!phoneRegex.test(value)) {
            return {
                isValid: false,
                message: this.errorMessages.invalidPhone
            };
        }
        
        return { isValid: true };
    },

    /**
     * Validate date
     * @param {string} value - Date to validate
     * @param {string} fieldId - Field identifier for specific validation
     * @returns {Object} - Validation result
     */
    validateDate(value, fieldId) {
        const dateObj = new Date(value);
        
        if (isNaN(dateObj.getTime())) {
            return {
                isValid: false,
                message: this.errorMessages.invalidDate
            };
        }
        
        // Specific validation for DBT date
        if (fieldId === 'dbtDate') {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            if (dateObj > today) {
                return {
                    isValid: false,
                    message: 'भविष्य की तारीख चुनी नहीं जा सकती।'
                };
            }
            
            // Check if date is not too old (more than 2 years)
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            
            if (dateObj < twoYearsAgo) {
                return {
                    isValid: false,
                    message: 'तारीख दो साल से अधिक पुरानी नहीं हो सकती।'
                };
            }
        }
        
        return { isValid: true };
    },

    /**
     * Clear field validation state
     * @param {HTMLElement} field - Field element
     */
    clearFieldValidation(field) {
        field.classList.remove('is-invalid', 'is-valid');
        
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }
    },

    /**
     * Apply validation state to field
     * @param {HTMLElement} field - Field element
     * @param {boolean} isValid - Validation result
     * @param {string} errorMessage - Error message if invalid
     */
    applyFieldValidation(field, isValid, errorMessage) {
        if (isValid && field.value.trim() !== '') {
            field.classList.add('is-valid');
        } else if (!isValid) {
            field.classList.add('is-invalid');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            errorDiv.textContent = errorMessage;
            field.parentNode.appendChild(errorDiv);
        }
    },

    /**
     * Validate entire form
     * @returns {boolean} - Form validation result
     */
    validateForm() {
        let isFormValid = true;
        const formInputs = document.querySelectorAll('#dbtForm input, #dbtForm select, #dbtForm textarea');
        
        // Validate individual fields
        formInputs.forEach(input => {
            const event = { target: input };
            if (!this.validateField(event)) {
                isFormValid = false;
            }
        });
        
        // Run custom validation rules
        if (isFormValid) {
            const customValidationResult = this.runCustomValidation();
            if (!customValidationResult.isValid) {
                isFormValid = false;
                this.showCustomValidationError(customValidationResult.message);
            }
        }
        
        // Scroll to first error if validation fails
        if (!isFormValid) {
            this.scrollToFirstError();
        }
        
        return isFormValid;
    },

    /**
     * Run custom validation rules
     * @returns {Object} - Validation result
     */
    runCustomValidation() {
        // Collect form data for validation
        const formData = this.collectFormDataForValidation();
        
        // Run beneficiary logic validation
        for (const ruleName in this.customRules.beneficiaryLogic) {
            const result = this.customRules.beneficiaryLogic[ruleName](formData);
            if (!result.isValid) {
                return result;
            }
        }
        
        // Run amount logic validation
        for (const ruleName in this.customRules.amountLogic) {
            const result = this.customRules.amountLogic[ruleName](formData);
            if (!result.isValid) {
                return result;
            }
        }
        
        // Run date logic validation
        for (const ruleName in this.customRules.dateLogic) {
            const result = this.customRules.dateLogic[ruleName](formData);
            if (!result.isValid) {
                return result;
            }
        }
        
        return { isValid: true };
    },

    /**
     * Collect form data for validation
     * @returns {Object} - Form data object
     */
    collectFormDataForValidation() {
        const formData = {};
        
        // Get all form fields
        const formInputs = document.querySelectorAll('#dbtForm input, #dbtForm select, #dbtForm textarea');
        
        formInputs.forEach(input => {
            if (input.id) {
                formData[input.id] = input.value;
            }
        });
        
        return formData;
    },

    /**
     * Show custom validation error
     * @param {string} message - Error message
     */
    showCustomValidationError(message) {
        // Use the global showAlert function if available
        if (typeof showAlert === 'function') {
            showAlert(message, 'danger');
        } else {
            // Fallback to alert
            alert(message);
        }
    },

    /**
     * Scroll to first validation error
     */
    scrollToFirstError() {
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
            firstError.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            firstError.focus();
        }
    },

    /**
     * Validate form section
     * @param {string} sectionId - Section identifier
     * @returns {boolean} - Section validation result
     */
    validateSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return true;
        
        const sectionInputs = section.querySelectorAll('input, select, textarea');
        let isSectionValid = true;
        
        sectionInputs.forEach(input => {
            const event = { target: input };
            if (!this.validateField(event)) {
                isSectionValid = false;
            }
        });
        
        return isSectionValid;
    },

    /**
     * Get validation summary
     * @returns {Object} - Validation summary
     */
    getValidationSummary() {
        const errors = [];
        const warnings = [];
        
        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            const label = field.previousElementSibling?.textContent || field.id;
            const errorMsg = field.parentNode.querySelector('.invalid-feedback')?.textContent;
            errors.push({
                field: field.id,
                label: label,
                message: errorMsg
            });
        });
        
        return {
            isValid: errors.length === 0,
            errorCount: errors.length,
            errors: errors,
            warnings: warnings
        };
    },

    /**
     * Real-time validation setup
     */
    setupRealTimeValidation() {
        const formInputs = document.querySelectorAll('#dbtForm input, #dbtForm select, #dbtForm textarea');
        
        formInputs.forEach(input => {
            // Validate on blur (when user leaves field)
            input.addEventListener('blur', (e) => {
                this.validateField(e);
            });
            
            // Clear validation on focus (when user enters field)
            input.addEventListener('focus', () => {
                this.clearFieldValidation(input);
            });
            
            // For number and currency fields, validate on input
            if (this.validationRules.number.includes(input.id) || 
                this.validationRules.currency.includes(input.id)) {
                
                input.addEventListener('input', (e) => {
                    // Debounce validation for better performance
                    clearTimeout(input.validationTimeout);
                    input.validationTimeout = setTimeout(() => {
                        this.validateField(e);
                    }, 500);
                });
            }
        });
    },

    /**
     * Initialize validation module
     */
    init() {
        console.log('DBT Validation module initialized');
        
        // Setup real-time validation when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupRealTimeValidation();
            });
        } else {
            this.setupRealTimeValidation();
        }
    }
};

// Initialize validation module
DBTValidation.init();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBTValidation;
}

console.log('DBT Validation module loaded successfully');

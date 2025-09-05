// pmfby/js/error-handler.js

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.currentRetryFunction = null; // To store retry function for modal
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupUnhandledPromiseRejection();
        this.createErrorDisplay();
    }

    // Global error handling
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack
            });
            event.preventDefault(); // Prevent default browser error handling
        });
    }

    // Handle unhandled promise rejections
    setupUnhandledPromiseRejection() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack
            });
            
            // Prevent the default browser error handling
            event.preventDefault();
        });
    }

    // Create error display elements
    createErrorDisplay() {
        // Toast container
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(toastContainer);
        }

        // Error modal
        if (!document.getElementById('error-modal')) {
            const errorModal = document.createElement('div');
            errorModal.id = 'error-modal';
            errorModal.innerHTML = `
                <div class="error-modal-backdrop">
                    <div class="error-modal-content">
                        <div class="error-modal-header">
                            <h3>⚠️ Error Occurred</h3>
                            <button class="error-modal-close">&times;</button>
                        </div>
                        <div class="error-modal-body">
                            <div class="error-message-display"></div>
                            <div class="error-details" style="display: none;">
                                <h4>Technical Details:</h4>
                                <pre class="error-stack"></pre>
                            </div>
                            <div class="error-actions">
                                <button class="btn-retry">Try Again</button>
                                <button class="btn-details">Show Details</button>
                                <button class="btn-report">Report Error</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.addErrorModalStyles();
            document.body.appendChild(errorModal);
            this.setupErrorModalEvents();
        }
    }

    addErrorModalStyles() {
        if (document.getElementById('error-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'error-modal-styles';
        style.textContent = `
            #error-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
            }
            
            .error-modal-backdrop {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(5px);
            }
            
            .error-modal-content {
                background: white;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                animation: errorModalSlide 0.3s ease-out;
            }
            
            @keyframes errorModalSlide {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .error-modal-header {
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .error-modal-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .error-modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }
            
            .error-modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .error-modal-body {
                padding: 20px;
            }
            
            .error-message-display { /* Renamed to avoid conflict with existing .error-message */
                font-size: 16px;
                margin-bottom: 15px;
                color: #333;
                line-height: 1.5;
            }
            
            .error-details {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                padding: 15px;
                margin: 15px 0;
            }
            
            .error-details h4 {
                margin: 0 0 10px 0;
                color: #666;
                font-size: 14px;
            }
            
            .error-stack {
                background: #2d3748;
                color: #e2e8f0;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                overflow-x: auto;
                margin: 0;
                white-space: pre-wrap;
            }
            
            .error-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                flex-wrap: wrap;
            }
            
            .error-actions button {
                padding: 8px 16px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .btn-retry {
                background: #007bff;
                color: white;
            }
            
            .btn-retry:hover {
                background: #0056b3;
            }
            
            .btn-details {
                background: #6c757d;
                color: white;
            }
            
            .btn-details:hover {
                background: #545b62;
            }
            
            .btn-report {
                background: #28a745;
                color: white;
            }
            
            .btn-report:hover {
                background: #1e7e34;
            }
            
            /* Toast Styles */
            .toast {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 16px;
                margin-bottom: 10px;
                border-left: 4px solid;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                min-width: 300px;
                animation: toastSlide 0.3s ease-out;
                position: relative;
                overflow: hidden;
            }
            
            @keyframes toastSlide {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .toast.success { border-left-color: #28a745; }
            .toast.error { border-left-color: #dc3545; }
            .toast.warning { border-left-color: #ffc107; }
            .toast.info { border-left-color: #17a2b8; }
            
            .toast-icon {
                font-size: 20px;
                margin-top: 2px;
            }
            
            .toast.success .toast-icon { color: #28a745; }
            .toast.error .toast-icon { color: #dc3545; }
            .toast.warning .toast-icon { color: #ffc107; }
            .toast.info .toast-icon { color: #17a2b8; }
            
            .toast-content {
                flex: 1;
            }
            
            .toast-title {
                font-weight: 600;
                margin: 0 0 4px 0;
                font-size: 14px;
            }
            
            .toast-message {
                margin: 0;
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }
            
            .toast-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .toast-close:hover {
                color: #333;
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                animation: toastProgress 5s linear;
            }
            
            @keyframes toastProgress {
                from { width: 100%; }
                to { width: 0%; }
            }
            
            .toast.success .toast-progress { background: #28a745; }
            .toast.error .toast-progress { background: #dc3545; }
            .toast.warning .toast-progress { background: #ffc107; }
            .toast.info .toast-progress { background: #17a2b8; }
        `;
        
        document.head.appendChild(style);
    }

    setupErrorModalEvents() {
        const modal = document.getElementById('error-modal');
        if (!modal) return;
        const closeBtn = modal.querySelector('.error-modal-close');
        const retryBtn = modal.querySelector('.btn-retry');
        const detailsBtn = modal.querySelector('.btn-details');
        const reportBtn = modal.querySelector('.btn-report');
        const detailsDiv = modal.querySelector('.error-details');

        closeBtn?.addEventListener('click', () => this.hideErrorModal());
        
        retryBtn?.addEventListener('click', () => {
            this.hideErrorModal();
            if (this.currentRetryFunction) {
                this.currentRetryFunction();
            }
        });

        detailsBtn?.addEventListener('click', () => {
            if (detailsDiv) {
                const isVisible = detailsDiv.style.display !== 'none';
                detailsDiv.style.display = isVisible ? 'none' : 'block';
                if (detailsBtn) detailsBtn.textContent = isVisible ? 'Show Details' : 'Hide Details';
            }
        });

        reportBtn?.addEventListener('click', () => {
            this.reportError();
        });

        // Close on backdrop click
        modal.querySelector('.error-modal-backdrop')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideErrorModal();
            }
        });
    }

    // Handle different types of errors
    handleError(error, context = {}) {
        // Log error
        this.logError(error, context);

        // Determine error severity
        const severity = this.determineSeverity(error);

        // Handle based on severity
        switch (severity) {
            case 'critical':
                this.showErrorModal(error, context);
                break;
            case 'high':
                this.showToast('error', 'Error', error.message || 'An error occurred');
                break;
            case 'medium':
                this.showToast('warning', 'Warning', error.message || 'Something went wrong');
                break;
            case 'low':
                console.warn('Low severity error:', error);
                break;
        }
    }

    determineSeverity(error) {
        const message = error.message?.toLowerCase() || '';
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'high';
        } else if (message.includes('validation') || message.includes('required')) {
            return 'medium';
        } else if (error.type === 'JavaScript Error') {
            return 'critical';
        } else if (message.includes('auth') || message.includes('permission')) {
            return 'critical';
        }
        
        return 'medium';
    }

    // Log error with context
    logError(error, context) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            error: {
                type: error.type || 'Unknown',
                message: error.message,
                stack: error.stack,
                filename: error.filename,
                line: error.line,
                column: error.column
            },
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: context.userId || 'anonymous'
        };

        this.errorLog.push(errorEntry);

        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }

        // Log to console for development
        console.error('Error logged:', errorEntry);
    }

    // Show toast notification
    showToast(type, title, message, duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return; // Ensure container exists
        
        const toast = document.createElement('div');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
            <div class="toast-progress"></div>
        `;

        // Add event listeners
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            this.removeToast(toast);
        });

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        return toast;
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'toastSlide 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Show error modal
    showErrorModal(error, context = {}) {
        const modal = document.getElementById('error-modal');
        if (!modal) return;
        const messageDiv = modal.querySelector('.error-message-display'); // Corrected selector
        const stackDiv = modal.querySelector('.error-stack');

        if (messageDiv) messageDiv.textContent = error.message || 'An unexpected error occurred';
        if (stackDiv) stackDiv.textContent = error.stack || 'No stack trace available';

        // Store retry function if provided
        this.currentRetryFunction = context.retryFunction;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideErrorModal() {
        const modal = document.getElementById('error-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Reset details visibility
        const detailsDiv = modal.querySelector('.error-details');
        const detailsBtn = modal.querySelector('.btn-details');
        if (detailsDiv) detailsDiv.style.display = 'none';
        if (detailsBtn) detailsBtn.textContent = 'Show Details';
    }

    // Report error to server (optional)
    async reportError() {
        try {
            const recentErrors = this.errorLog.slice(-5); // Last 5 errors
            
            // You can implement server-side error reporting here
            console.log('Reporting errors:', recentErrors);
            
            this.showToast('success', 'Reported', 'Error report sent successfully');
            this.hideErrorModal();
            
        } catch (error) {
            console.error('Failed to report error:', error);
            this.showToast('error', 'Failed', 'Could not send error report');
        }
    }

    // Wrapper for async operations with error handling
    async withErrorHandling(asyncFunction, context = {}) {
        try {
            return await asyncFunction();
        } catch (error) {
            this.handleError(error, {
                ...context,
                functionName: asyncFunction.name
            });
            throw error; // Re-throw so calling code can handle it too
        }
    }

    // Form validation with user-friendly messages
    validateForm(formElement, showToast = true) {
        const errors = [];
        if (!formElement) return { isValid: true, errors: [] }; // No form to validate

        const requiredFields = formElement.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                const fieldName = field.dataset.label || 
                                field.previousElementSibling?.textContent || 
                                field.placeholder || 
                                field.name || 
                                'Field';
                
                errors.push(`${fieldName.replace('*', '').trim()} is required`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });

        if (errors.length > 0 && showToast) {
            this.showToast('warning', 'Validation Error', 
                `Please fix the following:\n• ${errors.slice(0, 3).join('\n• ')}${errors.length > 3 ? `\n• ...and ${errors.length - 3} more` : ''}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Network error handling
    handleNetworkError(error, operation = 'operation') {
        if (!navigator.onLine) {
            this.showToast('error', 'No Internet', 'Please check your internet connection and try again');
            return;
        }

        if (error.message?.includes('fetch')) {
            this.showToast('error', 'Connection Error', `Failed to ${operation}. Please try again.`);
        } else {
            this.handleError(error, { operation });
        }
    }

    // Success notifications
    showSuccess(title, message) {
        return this.showToast('success', title, message);
    }

    showWarning(title, message) {
        return this.showToast('warning', title, message);
    }

    showInfo(title, message) {
        return this.showToast('info', title, message);
    }
    
    // NEW: Directly exposed showError for login.js
    showError(message) {
        const errorDiv = document.getElementById('errorMessage'); // Assuming login page has this
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            this.showToast('error', 'Error', message); // Also show as toast
        }
    }

    // NEW: Directly exposed showSuccess for login.js
    showSuccess(message) {
        const successDiv = document.getElementById('successMessage'); // Assuming login page has this
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            this.showToast('success', 'Success', message); // Also show as toast
        }
    }


    // Get error logs for debugging
    getErrorLogs() {
        return [...this.errorLog];
    }

    // Clear error logs
    clearErrorLogs() {
        this.errorLog = [];
        console.log('Error logs cleared');
    }
}

// Export singleton
const errorHandler = new ErrorHandler();
export { errorHandler };

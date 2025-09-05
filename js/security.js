// Input Sanitization and Security Utils
class SecurityUtils {
    
    // Remove HTML tags and dangerous characters
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove HTML tags
        let cleaned = input.replace(/<[^>]*>/g, '');
        
        // Remove dangerous characters
        cleaned = cleaned.replace(/[<>\"']/g, '');
        
        // Remove script-related content
        cleaned = cleaned.replace(/javascript:/gi, '');
        cleaned = cleaned.replace(/on\w+=/gi, '');
        
        // Trim whitespace
        return cleaned.trim();
    }

    // Sanitize entire form object
    static sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeInput(value);
            } else if (typeof value === 'number') {
                sanitized[key] = value;
            } else if (Array.isArray(value)) {
                sanitized[key] = value.map(item => 
                    typeof item === 'string' ? this.sanitizeInput(item) : item
                );
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeFormData(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    // Validate specific field types
    static validateField(value, type, fieldName) {
        const errors = [];

        switch (type) {
            case 'required':
                if (!value || value.toString().trim() === '') {
                    errors.push(`${fieldName} is required`);
                }
                break;

            case 'number':
                if (isNaN(value) || value < 0) {
                    errors.push(`${fieldName} must be a positive number`);
                }
                break;

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (value && !emailRegex.test(value)) {
                    errors.push(`${fieldName} must be a valid email`);
                }
                break;

            case 'date':
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (value && !dateRegex.test(value)) {
                    errors.push(`${fieldName} must be a valid date (YYYY-MM-DD)`);
                }
                break;

            case 'maxLength':
                if (typeof value === 'string' && value.length > 100) {
                    errors.push(`${fieldName} must be less than 100 characters`);
                }
                break;
        }

        return errors;
    }

    // Prevent SQL injection patterns
    static preventSQLInjection(input) {
        if (typeof input !== 'string') return input;
        
        // Remove dangerous SQL patterns
        const dangerousPatterns = [
            /('|(\\'))/gi,           // Single quotes
            /(;|--)/gi,              // SQL terminators
            /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi
        ];
        
        let cleaned = input;
        dangerousPatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        return cleaned;
    }
}

// Export for use in other files
export { SecurityUtils };

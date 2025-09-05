import { supabaseClient } from './config.js';
import { SecurityUtils } from './security.js';
import { authManager } from './auth.js';

class SecureDatabase {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Secure query builder - prevents SQL injection
    buildSecureQuery(tableName, operation = 'select') {
        // Validate table name against whitelist
        const allowedTables = [
            'test_users', 'districts', 'schemes', 'input_types', 
            'trade_names', 'units', 'viksit_krishi_report', 
            'navigation_items', 'navigation_categories'
        ];

        if (!allowedTables.includes(tableName)) {
            throw new Error(`Invalid table name: ${tableName}`);
        }

        // Return secure Supabase query builder
        return supabaseClient.from(tableName);
    }

    // Validate UUID format
    validateUUID(uuid, fieldName = 'ID') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(uuid)) {
            throw new Error(`Invalid ${fieldName} format`);
        }
        
        return true;
    }

    // Validate date format
    validateDate(dateString, fieldName = 'date') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!dateRegex.test(dateString)) {
            throw new Error(`Invalid ${fieldName} format. Use YYYY-MM-DD`);
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid ${fieldName} value`);
        }

        return true;
    }

    // Validate numeric values
    validateNumber(value, fieldName = 'number', min = 0, max = Infinity) {
        const num = Number(value);
        
        if (isNaN(num)) {
            throw new Error(`${fieldName} must be a valid number`);
        }

        if (num < min || num > max) {
            throw new Error(`${fieldName} must be between ${min} and ${max}`);
        }

        return true;
    }

    // Secure SELECT operations
    async secureSelect(tableName, options = {}) {
        try {
            // Require authentication
            authManager.requireAuth();

            // Build secure query
            let query = this.buildSecureQuery(tableName);

            // Apply SELECT fields (whitelist approach)
            if (options.select) {
                query = query.select(options.select);
            } else {
                query = query.select('*');
            }

            // Apply secure filters
            if (options.filters) {
                for (const [column, value] of Object.entries(options.filters)) {
                    // Sanitize column name (prevent injection)
                    const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '');
                    
                    if (typeof value === 'string') {
                        // Sanitize string values
                        const safeValue = SecurityUtils.sanitizeInput(value);
                        query = query.eq(safeColumn, safeValue);
                    } else if (typeof value === 'number') {
                        // Validate numeric values
                        this.validateNumber(value, column);
                        query = query.eq(safeColumn, value);
                    } else if (typeof value === 'boolean') {
                        query = query.eq(safeColumn, value);
                    }
                }
            }

            // Apply ordering
            if (options.orderBy) {
                const safeOrderBy = options.orderBy.replace(/[^a-zA-Z0-9_]/g, '');
                const ascending = options.ascending !== false;
                query = query.order(safeOrderBy, { ascending });
            }

            // Apply limits
            if (options.limit) {
                this.validateNumber(options.limit, 'limit', 1, 1000);
                query = query.limit(options.limit);
            }

            // Execute query
            const { data, error } = await query;

            if (error) {
                console.error('Database query error:', error);
                throw new Error(`Query failed: ${error.message}`);
            }

            return data;

        } catch (error) {
            console.error('Secure select error:', error);
            throw error;
        }
    }

    // Secure INSERT operations
    async secureInsert(tableName, data) {
        try {
            // Require authentication
            authManager.requireAuth();

            // Sanitize all input data
            const sanitizedData = SecurityUtils.sanitizeFormData(data);

            // Validate data based on table
            this.validateInsertData(tableName, sanitizedData);

            // Add audit fields
            const currentUser = authManager.getCurrentUser();
            const finalData = {
                ...sanitizedData,
                created_by: currentUser.profile?.id,
                created_at: new Date().toISOString()
            };

            // Execute secure insert
            const query = this.buildSecureQuery(tableName);
            const { data: result, error } = await query.insert([finalData]).select();

            if (error) {
                console.error('Database insert error:', error);
                throw new Error(`Insert failed: ${error.message}`);
            }

            // Clear related cache
            this.clearCacheByTable(tableName);

            console.log('✅ Secure insert successful:', tableName);
            return result[0];

        } catch (error) {
            console.error('Secure insert error:', error);
            throw error;
        }
    }

    // Secure UPDATE operations
    async secureUpdate(tableName, id, data) {
        try {
            // Require authentication
            authManager.requireAuth();

            // Validate ID
            this.validateUUID(id, 'Record ID');

            // Sanitize update data
            const sanitizedData = SecurityUtils.sanitizeFormData(data);

            // Add audit fields
            const currentUser = authManager.getCurrentUser();
            const finalData = {
                ...sanitizedData,
                updated_by: currentUser.profile?.id,
                updated_at: new Date().toISOString()
            };

            // Execute secure update
            const query = this.buildSecureQuery(tableName);
            const { data: result, error } = await query
                .update(finalData)
                .eq('id', id)
                .select();

            if (error) {
                console.error('Database update error:', error);
                throw new Error(`Update failed: ${error.message}`);
            }

            // Clear related cache
            this.clearCacheByTable(tableName);

            console.log('✅ Secure update successful:', tableName, id);
            return result[0];

        } catch (error) {
            console.error('Secure update error:', error);
            throw error;
        }
    }

    // Validate insert data based on table
    validateInsertData(tableName, data) {
        switch (tableName) {
            case 'viksit_krishi_report':
                this.validateReportData(data);
                break;
            case 'test_users':
                this.validateUserData(data);
                break;
            // Add more table validations as needed
        }
    }

    // Validate report data
    validateReportData(data) {
        // Required fields
        if (!data.district_id) throw new Error('District ID is required');
        if (!data.report_date) throw new Error('Report date is required');

        // Validate UUID fields
        this.validateUUID(data.district_id, 'District ID');

        // Validate date fields
        this.validateDate(data.report_date, 'Report date');

        // Validate numeric fields
        const numericFields = [
            'total_camps_organized', 'total_farmers_participated',
            'male_farmers', 'female_farmers', 'public_reps_count',
            'cash_subsidy_amount'
        ];

        numericFields.forEach(field => {
            if (data[field] !== undefined) {
                this.validateNumber(data[field], field, 0);
            }
        });

        // Validate dynamic inputs array
        if (data.dynamic_inputs && Array.isArray(data.dynamic_inputs)) {
            data.dynamic_inputs.forEach((input, index) => {
                this.validateDynamicInput(input, index);
            });
        }
    }

    // Validate dynamic input data
    validateDynamicInput(input, index) {
        if (!input.scheme_id) {
            throw new Error(`Dynamic input ${index + 1}: Scheme ID is required`);
        }

        this.validateUUID(input.scheme_id, `Dynamic input ${index + 1} scheme ID`);

        if (!input.input_type) {
            throw new Error(`Dynamic input ${index + 1}: Input type is required`);
        }

        this.validateNumber(input.total_amount, `Dynamic input ${index + 1} total amount`, 0);
        this.validateNumber(input.subsidy_amount, `Dynamic input ${index + 1} subsidy amount`, 0);
    }

    // Validate user data
    validateUserData(data) {
        if (!data.username) throw new Error('Username is required');
        if (!data.email) throw new Error('Email is required');

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new Error('Invalid email format');
        }

        // Validate role
        const allowedRoles = ['admin', 'user'];
        if (data.role && !allowedRoles.includes(data.role)) {
            throw new Error('Invalid user role');
        }
    }

    // Secure data fetching with caching
    async getWithCache(tableName, cacheKey, options = {}) {
        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('📦 Using cached data for:', cacheKey);
            return cached;
        }

        // Fetch from database
        const data = await this.secureSelect(tableName, options);

        // Cache the result
        this.setCache(cacheKey, data);

        return data;
    }

    // Cache management
    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if cache expired
        if (Date.now() - item.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCacheByTable(tableName) {
        for (const key of this.cache.keys()) {
            if (key.includes(tableName)) {
                this.cache.delete(key);
            }
        }
    }

    // Specific secure methods for your application
    async getDistricts() {
        return this.getWithCache('districts', 'districts_list', {
            select: 'id, name',
            filters: { is_active: true },
            orderBy: 'name'
        });
    }

    async getSchemes() {
        return this.getWithCache('schemes', 'schemes_list', {
            select: 'id, scheme_name',
            filters: { is_active: true },
            orderBy: 'scheme_name'
        });
    }

    async getInputTypes() {
        return this.getWithCache('input_types', 'input_types_list', {
            select: 'id, type_name_hi, type_name_en, unit_category_types',
            filters: { is_active: true },
            orderBy: 'type_name_hi'
        });
    }

    async submitReport(reportData) {
        console.log('📝 Submitting secure report...');
        return this.secureInsert('viksit_krishi_report', reportData);
    }

    async getReports(filters = {}) {
        const options = {
            select: `
                *,
                districts (name)
            `,
            orderBy: 'report_date',
            ascending: false
        };

        // Add secure filters
        if (filters.district_id) {
            this.validateUUID(filters.district_id, 'District ID');
            options.filters = { ...options.filters, district_id: filters.district_id };
        }

        if (filters.report_date) {
            this.validateDate(filters.report_date, 'Report date');
            options.filters = { ...options.filters, report_date: filters.report_date };
        }

        return this.secureSelect('viksit_krishi_report', options);
    }
}

// Export singleton instance
const secureDB = new SecureDatabase();
export { secureDB };

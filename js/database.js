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
            'navigation_items', 'navigation_categories', 'dashboard_cards',
            'card_clicks', 'admin_logs', 'form_definitions' // Added dashboard_cards, card_clicks, admin_logs, form_definitions
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
        
        if (uuid === null || uuid === undefined || uuid === '') {
            // Allow null/empty for optional UUIDs, but validate if present
            return true;
        }

        if (typeof uuid !== 'string' || !uuidRegex.test(uuid)) {
            throw new Error(`Invalid ${fieldName} format`);
        }
        
        return true;
    }

    // Validate date format
    validateDate(dateString, fieldName = 'date') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!dateString || typeof dateString !== 'string' || !dateRegex.test(dateString)) {
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
            // Require authentication for data access (unless explicitly public)
            if (!options.isPublic) {
                authManager.requireAuth();
            }

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
                    const safeColumn = column.replace(/[^a-zA-Z0-9_.]/g, ''); // Allow dot for relations
                    
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
                    } else if (value === null) { // Allow filtering by null
                        query = query.is(safeColumn, null);
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
            
            // Apply single
            if (options.single) {
                query = query.single();
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
            const { data: result, error } = await query.insert([finalData]).select().single(); // Select single to get inserted row

            if (error) {
                console.error('Database insert error:', error);
                throw new Error(`Insert failed: ${error.message}`);
            }

            // Clear related cache
            this.clearCacheByTable(tableName);

            console.log('✅ Secure insert successful:', tableName);
            return result; // Return the single inserted row

        } catch (error) {
            console.error('Secure insert error:', error);
            throw error;
        }
    }

    // Secure UPDATE operations
    async secureUpdate(tableName, id, data) {
        try {
            authManager.requireAuth();

            // Validate ID (assuming it's a UUID or integer based on your table)
            if (typeof id === 'string') {
                this.validateUUID(id, 'Record ID');
            } else if (typeof id === 'number') {
                this.validateNumber(id, 'Record ID', 1); // Assuming IDs are positive integers
            } else {
                throw new Error('Invalid ID type for update');
            }
            

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
                .select().single();

            if (error) {
                console.error('Database update error:', error);
                throw new Error(`Update failed: ${error.message}`);
            }

            // Clear related cache
            this.clearCacheByTable(tableName);

            console.log('✅ Secure update successful:', tableName, id);
            return result;

        } catch (error) {
            console.error('Secure update error:', error);
            throw error;
        }
    }
    
    // NEW: Secure UPSERT operation for reordering
    async secureUpsert(tableName, data, onConflictColumn = 'id') {
        try {
            authManager.requireAuth();

            // Ensure data is an array of objects
            if (!Array.isArray(data)) {
                data = [data];
            }

            const sanitizedDataArray = data.map(item => SecurityUtils.sanitizeFormData(item));
            
            // Execute secure upsert
            const query = this.buildSecureQuery(tableName);
            const { data: result, error } = await query
                .upsert(sanitizedDataArray, { onConflict: onConflictColumn, ignoreDuplicates: false })
                .select(); // Select all updated rows

            if (error) {
                console.error('Database upsert error:', error);
                throw new Error(`Upsert failed: ${error.message}`);
            }

            // Clear related cache
            this.clearCacheByTable(tableName);

            console.log('✅ Secure upsert successful:', tableName);
            return result;

        } catch (error) {
            console.error('Secure upsert error:', error);
            throw error;
        }
    }

    // NEW: Secure DELETE operation
    async secureDelete(tableName, id) {
        try {
            authManager.requireAuth();

            // Validate ID
            if (typeof id === 'string') {
                this.validateUUID(id, 'Record ID');
            } else if (typeof id === 'number') {
                this.validateNumber(id, 'Record ID', 1);
            } else {
                throw new Error('Invalid ID type for delete');
            }

            const { error } = await this.buildSecureQuery(tableName)
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Database delete error:', error);
                throw new Error(`Delete failed: ${error.message}`);
            }

            this.clearCacheByTable(tableName);
            console.log('✅ Secure delete successful:', tableName, id);
            return true;

        } catch (error) {
            console.error('Secure delete error:', error);
            throw error;
        }
    }
    
    // NEW: Secure RPC call for executing SQL scripts (e.g., DDL)
    async executeSqlScript(sqlText) {
        try {
            authManager.requireAuth();
            
            // Basic sanitization/validation for SQL text (critical!)
            if (!sqlText || typeof sqlText !== 'string') {
                throw new Error('Invalid SQL script provided.');
            }
            // Further checks can be added, e.g., disallowing 'DROP TABLE' directly
            // For now, rely on Supabase RPC function permissions.
            
            const { data, error } = await supabaseClient.rpc('execute_sql_script', { sql_text: sqlText });
            
            if (error) {
                console.error('RPC execute_sql_script error:', error);
                throw new Error(`SQL script execution failed: ${error.message}`);
            }
            
            return data;
            
        } catch (error) {
            console.error('Secure RPC call error:', error);
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
            case 'dashboard_cards':
                this.validateDashboardCardData(data);
                break;
            case 'navigation_items':
                this.validateNavigationItemData(data);
                break;
            case 'card_clicks':
                this.validateCardClickData(data);
                break;
            case 'admin_logs':
                this.validateAdminLogData(data);
                break;
            case 'form_definitions':
                this.validateFormDefinitionData(data);
                break;
            // Add more table validations as needed
            default:
                console.warn(`No specific validation for table: ${tableName}`);
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
            'cash_subsidy_amount', 'officers_dist_admin', 'officers_departmental',
            'officers_allied_dept', 'officers_kvk', 'officers_igkv_scient_prof',
            'total_officers_present', 'publicity_material_distributed'
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

        // Validate input_details based on input_type
        if (input.input_details) {
            switch (input.input_type) {
                case 'Seed':
                    if (!input.input_details.crop_name) throw new Error(`Dynamic input ${index + 1}: Crop name is required for Seed`);
                    if (!input.input_details.variety) throw new Error(`Dynamic input ${index + 1}: Variety is required for Seed`);
                    this.validateNumber(input.input_details.quantity, `Dynamic input ${index + 1} seed quantity`, 0);
                    break;
                case 'Insecticide/Pesticide':
                case 'Fertilizer':
                case 'Biofertilizer':
                    if (!input.input_details.trade_name) throw new Error(`Dynamic input ${index + 1}: Trade name is required for Chemical`);
                    this.validateNumber(input.input_details.quantity, `Dynamic input ${index + 1} chemical quantity`, 0);
                    this.validateUUID(input.input_details.unit_id, `Dynamic input ${index + 1} unit ID`);
                    break;
                case 'Farm Tool or Equipment':
                    if (!input.input_details.equipment_name) throw new Error(`Dynamic input ${index + 1}: Equipment name is required for Farm Tool`);
                    this.validateNumber(input.input_details.quantity, `Dynamic input ${index + 1} equipment quantity`, 0);
                    break;
            }
        }
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
        this.validateUUID(data.district_id, 'District ID');
    }

    // Validate Dashboard Card Data
    validateDashboardCardData(data) {
        if (!data.title_hi) throw new Error('Card title (Hindi) is required');
        if (!data.title_en) throw new Error('Card title (English) is required');
        if (!data.target_url) throw new Error('Card URL is required');
        if (!data.icon_class) throw new Error('Card icon is required');
        this.validateNumber(data.display_order, 'Display order', 1);
        this.validateUUID(data.created_by, 'Created By User ID');
    }

    // Validate Navigation Item Data
    validateNavigationItemData(data) {
        if (!data.name_hi) throw new Error('Navigation name (Hindi) is required');
        if (!data.name_en) throw new Error('Navigation name (English) is required');
        if (!data.url) throw new Error('Navigation URL is required');
        if (!data.icon_class) throw new Error('Navigation icon is required');
        this.validateNumber(data.category_id, 'Category ID', 1);
        this.validateNumber(data.display_order, 'Display order', 1);
        this.validateUUID(data.created_by, 'Created By User ID');
        this.validateUUID(data.parent_id, 'Parent ID'); // Parent ID can be null
    }

    // Validate Card Click Data
    validateCardClickData(data) {
        if (!data.card_id) throw new Error('Card ID is required for click log');
        if (!data.user_id) throw new Error('User ID is required for click log');
        // ip_address is often captured server-side, but can be validated if passed
        this.validateUUID(data.user_id, 'User ID');
        this.validateNumber(data.card_id, 'Card ID', 1);
    }

    // Validate Admin Log Data
    validateAdminLogData(data) {
        if (!data.admin_id) throw new Error('Admin ID is required for admin log');
        if (!data.action_type) throw new Error('Action type is required for admin log');
        if (!data.description) throw new Error('Description is required for admin log');
        this.validateUUID(data.admin_id, 'Admin ID');
    }
    
    // Validate Form Definition Data
    validateFormDefinitionData(data) {
        if (!data.table_name) throw new Error('Table name is required for form definition');
        if (!data.label) throw new Error('Label is required for form definition');
        if (!data.fields || !Array.isArray(data.fields)) throw new Error('Fields array is required for form definition');
        this.validateUUID(data.created_by, 'Created By User ID');
        this.validateNumber(data.navigation_item_id, 'Navigation Item ID');
        this.validateNumber(data.parent_dashboard_card_id, 'Parent Dashboard Card ID');
        this.validateUUID(data.district_id, 'District ID');
        
        data.fields.forEach((field, index) => {
            if (!field.name) throw new Error(`Field ${index + 1}: Name is required`);
            if (!field.label) throw new Error(`Field ${index + 1}: Label is required`);
            if (!field.type) throw new Error(`Field ${index + 1}: Type is required`);
        });
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
            // REMOVED: filters: { is_active: true }, // Removed this line
            orderBy: 'name',
            isPublic: true // Districts can be public for login page
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
    
    async getTradeNames() {
        return this.getWithCache('trade_names', 'trade_names_list', {
            select: 'id, trade_name_hi, trade_name_en, input_type_id',
            filters: { is_active: true },
            orderBy: 'trade_name_hi'
        });
    }
    
    async getUnits() {
        return this.getWithCache('units', 'units_list', {
            select: 'id, unit_name_hi, unit_name_en, unit_type',
            filters: { is_active: true },
            orderBy: 'unit_name_hi'
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
            ascending: false,
            filters: {}
        };

        // Add secure filters
        if (filters.district_id) {
            this.validateUUID(filters.district_id, 'District ID');
            options.filters.district_id = filters.district_id;
        }

        if (filters.report_date) {
            this.validateDate(filters.report_date, 'Report date');
            options.filters.report_date = filters.report_date;
        }

        return this.secureSelect('viksit_krishi_report', options);
    }
}

// Export singleton instance
const secureDB = new SecureDatabase();
export { secureDB };

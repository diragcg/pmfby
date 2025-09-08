// hierarchy-validator.js - Hierarchy validation and correction utilities

// Global validation variables
let hierarchyValidationRules = {};
let validationCache = new Map();

// Initialize hierarchy validator
function initializeHierarchyValidator() {
    console.log('Hierarchy Validator initialized');
    
    // Set up validation rules
    setupValidationRules();
    
    // Clear cache periodically
    setInterval(clearValidationCache, 300000); // Clear every 5 minutes
}

// Setup validation rules
function setupValidationRules() {
    hierarchyValidationRules = {
        districtname: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100,
            pattern: /^[a-zA-Z\s]+$/,
            errorMessage: 'District name must be valid text'
        },
        level4name: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100,
            errorMessage: 'Level 4 name (Tehsil) is required'
        },
        level5name: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100,
            errorMessage: 'Level 5 name (RI) is required'
        },
        level6code: {
            required: false,
            type: 'string',
            maxLength: 50,
            errorMessage: 'Level 6 code must be valid'
        },
        villagename: {
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 100,
            errorMessage: 'Village name is required'
        },
        villagecode: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9]+$/,
            errorMessage: 'Village code must be alphanumeric'
        }
    };
}

// Validate single hierarchy record
function validateHierarchyRecord(record) {
    const errors = [];
    const warnings = [];
    
    // Check each field against validation rules
    Object.keys(hierarchyValidationRules).forEach(field => {
        const rule = hierarchyValidationRules[field];
        const value = record[field];
        
        // Check required fields
        if (rule.required && (!value || value.toString().trim() === '')) {
            errors.push({
                field: field,
                message: rule.errorMessage,
                type: 'required',
                severity: 'error'
            });
            return;
        }
        
        // Skip validation if field is empty and not required
        if (!value || value.toString().trim() === '') {
            return;
        }
        
        const stringValue = value.toString().trim();
        
        // Check type
        if (rule.type === 'string' && typeof stringValue !== 'string') {
            errors.push({
                field: field,
                message: `${field} must be a string`,
                type: 'type',
                severity: 'error'
            });
        }
        
        // Check length constraints
        if (rule.minLength && stringValue.length < rule.minLength) {
            errors.push({
                field: field,
                message: `${field} must be at least ${rule.minLength} characters`,
                type: 'minLength',
                severity: 'error'
            });
        }
        
        if (rule.maxLength && stringValue.length > rule.maxLength) {
            warnings.push({
                field: field,
                message: `${field} is longer than recommended ${rule.maxLength} characters`,
                type: 'maxLength',
                severity: 'warning'
            });
        }
        
        // Check pattern
        if (rule.pattern && !rule.pattern.test(stringValue)) {
            errors.push({
                field: field,
                message: rule.errorMessage,
                type: 'pattern',
                severity: 'error'
            });
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        record: record
    };
}

// Validate hierarchy consistency
function validateHierarchyConsistency(records) {
    const consistencyErrors = [];
    const duplicates = [];
    
    // Check for duplicate village codes
    const villageCodeMap = new Map();
    
    records.forEach((record, index) => {
        const villageCode = record.villagecode;
        
        if (villageCodeMap.has(villageCode)) {
            const existingRecord = villageCodeMap.get(villageCode);
            duplicates.push({
                villageCode: villageCode,
                records: [existingRecord, { ...record, index: index }],
                message: `Duplicate village code: ${villageCode}`,
                type: 'duplicate',
                severity: 'error'
            });
        } else {
            villageCodeMap.set(villageCode, { ...record, index: index });
        }
    });
    
    // Check hierarchy relationships
    const hierarchyMap = new Map();
    
    records.forEach((record, index) => {
        const hierarchyKey = `${record.districtname}|${record.level4name}|${record.level5name}`;
        
        if (!hierarchyMap.has(hierarchyKey)) {
            hierarchyMap.set(hierarchyKey, []);
        }
        
        hierarchyMap.get(hierarchyKey).push({ ...record, index: index });
    });
    
    // Validate each hierarchy group
    hierarchyMap.forEach((groupRecords, hierarchyKey) => {
        const [district, level4, level5] = hierarchyKey.split('|');
        
        // Check if all records in group have consistent level6code
        const level6Codes = [...new Set(groupRecords.map(r => r.level6code).filter(c => c))];
        
        if (level6Codes.length > 1) {
            consistencyErrors.push({
                hierarchyKey: hierarchyKey,
                message: `Inconsistent Level 6 codes in ${district} > ${level4} > ${level5}: ${level6Codes.join(', ')}`,
                type: 'inconsistent_level6',
                severity: 'warning',
                records: groupRecords
            });
        }
    });
    
    return {
        isConsistent: consistencyErrors.length === 0 && duplicates.length === 0,
        duplicates: duplicates,
        consistencyErrors: consistencyErrors,
        totalRecords: records.length,
        uniqueVillages: villageCodeMap.size
    };
}

// Validate hierarchy against expected district
function validateDistrictHierarchy(records, expectedDistrict) {
    const districtMismatches = [];
    const validRecords = [];
    
    records.forEach((record, index) => {
        if (record.districtname !== expectedDistrict) {
            districtMismatches.push({
                record: { ...record, index: index },
                expectedDistrict: expectedDistrict,
                actualDistrict: record.districtname,
                message: `District mismatch: Expected "${expectedDistrict}", found "${record.districtname}"`,
                type: 'district_mismatch',
                severity: 'error'
            });
        } else {
            validRecords.push(record);
        }
    });
    
    return {
        isValid: districtMismatches.length === 0,
        validRecords: validRecords,
        districtMismatches: districtMismatches,
        totalRecords: records.length,
        validCount: validRecords.length,
        mismatchCount: districtMismatches.length
    };
}

// Batch validate hierarchy records
async function batchValidateHierarchy(records, options = {}) {
    const {
        expectedDistrict = null,
        checkConsistency = true,
        useCache = true,
        batchSize = 100
    } = options;
    
    try {
        showLoading('Hierarchy validation जारी है...');
        
        const results = {
            totalRecords: records.length,
            validRecords: [],
            invalidRecords: [],
            warnings: [],
            errors: [],
            consistencyReport: null,
            districtReport: null,
            processingTime: 0
        };
        
        const startTime = Date.now();
        
        // Process records in batches
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            // Validate each record in batch
            batch.forEach(record => {
                const cacheKey = generateValidationCacheKey(record);
                
                let validation;
                if (useCache && validationCache.has(cacheKey)) {
                    validation = validationCache.get(cacheKey);
                } else {
                    validation = validateHierarchyRecord(record);
                    if (useCache) {
                        validationCache.set(cacheKey, validation);
                    }
                }
                
                if (validation.isValid) {
                    results.validRecords.push(record);
                } else {
                    results.invalidRecords.push({
                        record: record,
                        validation: validation
                    });
                    results.errors.push(...validation.errors);
                }
                
                results.warnings.push(...validation.warnings);
            });
            
            // Update progress
            const progress = Math.round(((i + batch.length) / records.length) * 100);
            updateValidationProgress(progress);
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Validate consistency if requested
        if (checkConsistency) {
            results.consistencyReport = validateHierarchyConsistency(records);
        }
        
        // Validate district if specified
        if (expectedDistrict) {
            results.districtReport = validateDistrictHierarchy(records, expectedDistrict);
        }
        
        results.processingTime = Date.now() - startTime;
        
        hideLoading();
        return results;
        
    } catch (error) {
        console.error('Batch validation error:', error);
        hideLoading();
        throw error;
    }
}

// Real-time hierarchy validation
function validateHierarchyRealTime(record, expectedDistrict = null) {
    const validation = validateHierarchyRecord(record);
    
    // Additional real-time checks
    if (expectedDistrict && record.districtname !== expectedDistrict) {
        validation.errors.push({
            field: 'districtname',
            message: `District should be "${expectedDistrict}"`,
            type: 'district_mismatch',
            severity: 'error'
        });
        validation.isValid = false;
    }
    
    return validation;
}

// Generate suggestions for hierarchy correction
function generateHierarchyCorrections(invalidRecord, validHierarchyData) {
    const suggestions = {
        districtname: [],
        level4name: [],
        level5name: [],
        level6code: [],
        confidence: 0
    };
    
    try {
        const record = invalidRecord.record || invalidRecord;
        
        // Find similar records for suggestions
        const similarRecords = validHierarchyData.filter(validRecord => {
            let similarity = 0;
            
            // Check village name similarity
            if (record.villagename && validRecord.villagename) {
                const nameSimilarity = calculateStringSimilarity(
                    record.villagename.toLowerCase(),
                    validRecord.villagename.toLowerCase()
                );
                similarity += nameSimilarity * 0.4;
            }
            
            // Check village code similarity
            if (record.villagecode && validRecord.villagecode) {
                const codeSimilarity = calculateStringSimilarity(
                    record.villagecode.toLowerCase(),
                    validRecord.villagecode.toLowerCase()
                );
                similarity += codeSimilarity * 0.6;
            }
            
            return similarity > 0.3; // Threshold for similarity
        });
        
        // Generate suggestions from similar records
        if (similarRecords.length > 0) {
            // District suggestions
            const districts = [...new Set(similarRecords.map(r => r.districtname))];
            suggestions.districtname = districts.slice(0, 3);
            
            // Level 4 suggestions
            const level4s = [...new Set(similarRecords.map(r => r.level4name))];
            suggestions.level4name = level4s.slice(0, 5);
            
            // Level 5 suggestions
            const level5s = [...new Set(similarRecords.map(r => r.level5name))];
            suggestions.level5name = level5s.slice(0, 5);
            
            // Level 6 suggestions
            const level6s = [...new Set(similarRecords.map(r => r.level6code).filter(c => c))];
            suggestions.level6code = level6s.slice(0, 3);
            
            suggestions.confidence = Math.min(similarRecords.length / 10, 1);
        }
        
        // Fallback: use most common values from valid data
        if (suggestions.districtname.length === 0) {
            const commonDistricts = getMostCommonValues(validHierarchyData, 'districtname', 3);
            suggestions.districtname = commonDistricts;
        }
        
        if (suggestions.level4name.length === 0) {
            const commonLevel4s = getMostCommonValues(validHierarchyData, 'level4name', 5);
            suggestions.level4name = commonLevel4s;
        }
        
        if (suggestions.level5name.length === 0) {
            const commonLevel5s = getMostCommonValues(validHierarchyData, 'level5name', 5);
            suggestions.level5name = commonLevel5s;
        }
        
    } catch (error) {
        console.error('Error generating hierarchy corrections:', error);
    }
    
    return suggestions;
}

// Calculate string similarity (Levenshtein distance based)
function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
}

// Get most common values from array of objects
function getMostCommonValues(data, field, limit = 5) {
    const counts = {};
    
    data.forEach(item => {
        const value = item[field];
        if (value && value.trim()) {
            counts[value] = (counts[value] || 0) + 1;
        }
    });
    
    return Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([value]) => value);
}

// Generate validation cache key
function generateValidationCacheKey(record) {
    return `${record.districtname || ''}_${record.level4name || ''}_${record.level5name || ''}_${record.villagecode || ''}`;
}

// Clear validation cache
function clearValidationCache() {
    validationCache.clear();
    console.log('Hierarchy validation cache cleared');
}

// Update validation progress
function updateValidationProgress(progress) {
    const progressElement = document.querySelector('.progress-fill');
    if (progressElement) {
        progressElement.style.width = `${progress}%`;
    }
    
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = `Validation Progress: ${progress}%`;
    }
}

// Validate hierarchy field in real-time
function validateHierarchyField(fieldName, value, expectedDistrict = null) {
    const rule = hierarchyValidationRules[fieldName];
    if (!rule) return { isValid: true, errors: [] };
    
    const errors = [];
    
    // Check required
    if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push({
            field: fieldName,
            message: rule.errorMessage,
            type: 'required',
            severity: 'error'
        });
        return { isValid: false, errors: errors };
    }
    
    if (!value || value.toString().trim() === '') {
        return { isValid: true, errors: [] };
    }
    
    const stringValue = value.toString().trim();
    
    // Additional validation for district field
    if (fieldName === 'districtname' && expectedDistrict && stringValue !== expectedDistrict) {
        errors.push({
            field: fieldName,
            message: `District should be "${expectedDistrict}"`,
            type: 'district_mismatch',
            severity: 'error'
        });
    }
    
    // Check length constraints
    if (rule.minLength && stringValue.length < rule.minLength) {
        errors.push({
            field: fieldName,
            message: `${fieldName} must be at least ${rule.minLength} characters`,
            type: 'minLength',
            severity: 'error'
        });
    }
    
    // Check pattern
    if (rule.pattern && !rule.pattern.test(stringValue)) {
        errors.push({
            field: fieldName,
            message: rule.errorMessage,
            type: 'pattern',
            severity: 'error'
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Format validation report
function formatValidationReport(validationResults) {
    const report = {
        summary: {
            totalRecords: validationResults.totalRecords,
            validRecords: validationResults.validRecords.length,
            invalidRecords: validationResults.invalidRecords.length,
            warningsCount: validationResults.warnings.length,
            errorsCount: validationResults.errors.length,
            processingTime: validationResults.processingTime
        },
        details: {
            errors: validationResults.errors,
            warnings: validationResults.warnings,
            invalidRecords: validationResults.invalidRecords
        },
        consistency: validationResults.consistencyReport,
        district: validationResults.districtReport
    };
    
    return report;
}

// Export validation results
function exportValidationResults(validationResults, format = 'excel') {
    const report = formatValidationReport(validationResults);
    
    if (format === 'excel') {
        const workbook = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
            ['Validation Summary', ''],
            ['Total Records', report.summary.totalRecords],
            ['Valid Records', report.summary.validRecords],
            ['Invalid Records', report.summary.invalidRecords],
            ['Warnings', report.summary.warningsCount],
            ['Errors', report.summary.errorsCount],
            ['Processing Time (ms)', report.summary.processingTime]
        ];
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        
        // Errors sheet
        if (report.details.errors.length > 0) {
            const errorsSheet = XLSX.utils.json_to_sheet(report.details.errors);
            XLSX.utils.book_append_sheet(workbook, errorsSheet, 'Errors');
        }
        
        // Invalid records sheet
        if (report.details.invalidRecords.length > 0) {
            const invalidData = report.details.invalidRecords.map(item => ({
                ...item.record,
                validation_errors: item.validation.errors.map(e => e.message).join('; ')
            }));
            const invalidSheet = XLSX.utils.json_to_sheet(invalidData);
            XLSX.utils.book_append_sheet(workbook, invalidSheet, 'Invalid Records');
        }
        
        XLSX.writeFile(workbook, `Hierarchy_Validation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        showAlert('Validation report exported to Excel.', 'success');
        
    } else if (format === 'json') {
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Hierarchy_Validation_Report_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showAlert('Validation report exported to JSON.', 'success');
    }
}

// Initialize hierarchy validator on load
document.addEventListener('DOMContentLoaded', function() {
    initializeHierarchyValidator();
});

// Console message
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   Hierarchy Validator Module                 ║
║                   गांव Hierarchy सत्यापन                     ║
║                                                              ║
║  🔍 Real-time Hierarchy Validation                          ║
║  📊 Batch Processing & Validation                           ║
║  🔧 Automatic Correction Suggestions                        ║
║  📈 Consistency Checking                                    ║
║  📋 Comprehensive Validation Reports                        ║
║                                                              ║
║  Hierarchy Validator loaded successfully!                   ║
╚══════════════════════════════════════════════════════════════╝
`);

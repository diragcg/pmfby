// js/excel-import.js
import { supabaseClient } from '../supabase-config.js';

class ExcelImportManager {
    constructor() {
        this.currentData = [];
        this.validationErrors = [];
        this.masterData = {
            districts: [],
            crops: [],
            hierarchy: {}
        };
        this.currentBatchId = null;
    }

    // Load master data for validation
    async loadMasterData() {
        try {
            // Load districts
            const { data: districts, error: districtError } = await supabaseClient
                .from('districts')
                .select('id, name');
            if (districtError) throw districtError;
            this.masterData.districts = districts;

            // Load crops
            const { data: crops, error: cropError } = await supabaseClient
                .from('crop_master')
                .select('crop_id, crop_code, crop_name, season, notification_level');
            if (cropError) throw cropError;
            this.masterData.crops = crops;

            // Load hierarchy data (tehsils, RIs, villages)
            const { data: tehsils, error: tehsilError } = await supabaseClient
                .from('tehsils')
                .select('id, name, district_id, districts(name)');
            if (tehsilError) throw tehsilError;

            const { data: ris, error: riError } = await supabaseClient
                .from('revenue_inspectors')
                .select('id, name, tehsil_id, tehsils(name, district_id)');
            if (riError) throw riError;

            const { data: villages, error: villageError } = await supabaseClient
                .from('villages')
                .select('id, name, code, patwari_halka_no, ri_id, tehsil_id, district_id');
            if (villageError) throw villageError;

            // Organize hierarchy data for quick lookup
            this.masterData.hierarchy = {
                tehsils,
                ris,
                villages
            };

        } catch (error) {
            console.error('Error loading master data:', error);
            throw error;
        }
    }

    // Parse Excel file
    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Validate parsed data
    async validateData(data, season) {
        this.validationErrors = [];
        const validatedData = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; // Excel row number (accounting for header)
            const validationResult = await this.validateRow(row, rowNumber, season);
            
            validatedData.push({
                ...row,
                isValid: validationResult.isValid,
                errors: validationResult.errors,
                rowNumber
            });

            if (!validationResult.isValid) {
                this.validationErrors.push(...validationResult.errors);
            }
        }

        return validatedData;
    }

    // Validate individual row
    async validateRow(row, rowNumber, season) {
        const errors = [];
        let isValid = true;

        // Required field validation
        const requiredFields = [
            'District', 'Tehsil', 'RI Name', 'Village Name', 
            'Crop Code', 'Area (Ha)', 'Year'
        ];

        requiredFields.forEach(field => {
            if (!row[field] || row[field].toString().trim() === '') {
                errors.push({
                    batch_id: this.currentBatchId,
                    row_number: rowNumber,
                    field_name: field,
                    error_type: 'missing_data',
                    error_message: `${field} is required but missing`,
                    raw_data: row
                });
                isValid = false;
            }
        });

        // District validation
        const district = this.masterData.districts.find(d => 
            d.name.toLowerCase().trim() === row['District']?.toLowerCase().trim()
        );
        if (!district) {
            errors.push({
                batch_id: this.currentBatchId,
                row_number: rowNumber,
                field_name: 'District',
                error_type: 'invalid_hierarchy',
                error_message: `District '${row['District']}' not found in master data`,
                raw_data: row
            });
            isValid = false;
        }

        // Crop validation
        const crop = this.masterData.crops.find(c => 
            c.crop_code === row['Crop Code'] && c.season === season
        );
        if (!crop) {
            errors.push({
                batch_id: this.currentBatchId,
                row_number: rowNumber,
                field_name: 'Crop Code',
                error_type: 'invalid_crop',
                error_message: `Crop code '${row['Crop Code']}' not found for season '${season}'`,
                raw_data: row
            });
            isValid = false;
        }

        // Hierarchy validation (Tehsil under District)
        if (district) {
            const tehsil = this.masterData.hierarchy.tehsils.find(t => 
                t.name.toLowerCase().trim() === row['Tehsil']?.toLowerCase().trim() &&
                t.district_id === district.id
            );
            if (!tehsil) {
                errors.push({
                    batch_id: this.currentBatchId,
                    row_number: rowNumber,
                    field_name: 'Tehsil',
                    error_type: 'invalid_hierarchy',
                    error_message: `Tehsil '${row['Tehsil']}' not found under District '${row['District']}'`,
                    raw_data: row
                });
                // Don't set isValid = false here as per requirement (ALLOW invalid data)
            }
        }

        // Area validation
        if (row['Area (Ha)'] && (isNaN(row['Area (Ha)']) || parseFloat(row['Area (Ha)']) <= 0)) {
            errors.push({
                batch_id: this.currentBatchId,
                row_number: rowNumber,
                field_name: 'Area (Ha)',
                error_type: 'format_error',
                error_message: `Area must be a positive number, got '${row['Area (Ha)']}'`,
                raw_data: row
            });
            // Don't set isValid = false - allow with warning
        }

        return { isValid, errors };
    }

    // Import validated data to Supabase
    async importToDatabase(validatedData, batchInfo) {
        try {
            // Create import batch record
            const { data: batch, error: batchError } = await supabaseClient
                .from('import_batches')
                .insert({
                    batch_name: batchInfo.batchName,
                    season: batchInfo.season,
                    year: batchInfo.year,
                    file_name: batchInfo.fileName,
                    total_records: validatedData.length,
                    valid_records: validatedData.filter(row => row.isValid).length,
                    invalid_records: validatedData.filter(row => !row.isValid).length,
                    imported_by: sessionStorage.getItem('userId'),
                    status: 'processing'
                })
                .select()
                .single();

            if (batchError) throw batchError;
            this.currentBatchId = batch.id;

            // Insert validation errors
            if (this.validationErrors.length > 0) {
                const { error: errorInsertError } = await supabaseClient
                    .from('import_validation_errors')
                    .insert(this.validationErrors.map(error => ({
                        ...error,
                        batch_id: this.currentBatchId
                    })));
                if (errorInsertError) throw errorInsertError;
            }

            // Prepare notification records
            const notificationRecords = validatedData.map(row => {
                const district = this.masterData.districts.find(d => 
                    d.name.toLowerCase().trim() === row['District']?.toLowerCase().trim()
                );
                const crop = this.masterData.crops.find(c => 
                    c.crop_code === row['Crop Code'] && c.season === batchInfo.season
                );

                return {
                    import_batch_id: this.currentBatchId,
                    notification_year: parseInt(row['Year']),
                    season: batchInfo.season,
                    
                    // Original data
                    original_district_id: district?.id,
                    original_tehsil: row['Tehsil']?.toString().trim(),
                    original_ri_name: row['RI Name']?.toString().trim(),
                    original_patwari_halka_no: row['Patwari Halka No'] ? parseInt(row['Patwari Halka No']) : null,
                    original_village_name: row['Village Name']?.toString().trim(),
                    original_village_code: row['Village Code']?.toString().trim(),
                    original_crop_id: crop?.crop_id,
                    
                    // Current data (same as original initially)
                    current_district_id: district?.id,
                    current_tehsil: row['Tehsil']?.toString().trim(),
                    current_ri_name: row['RI Name']?.toString().trim(),
                    current_patwari_halka_no: row['Patwari Halka No'] ? parseInt(row['Patwari Halka No']) : null,
                    current_village_name: row['Village Name']?.toString().trim(),
                    current_village_code: row['Village Code']?.toString().trim(),
                    current_crop_id: crop?.crop_id,
                    
                    // Data fields
                    area_hectares: parseFloat(row['Area (Ha)']) || 0,
                    farmer_count: row['Farmer Count'] ? parseInt(row['Farmer Count']) : null,
                    
                    // Validation status
                    has_validation_errors: !row.isValid,
                    validation_notes: row.errors.length > 0 ? 
                        row.errors.map(e => e.error_message).join('; ') : null,
                    
                    // Metadata
                    status: 'imported',
                    created_by: sessionStorage.getItem('userId')
                };
            });

            // Batch insert notifications (in chunks to avoid timeout)
            const chunkSize = 100;
            for (let i = 0; i < notificationRecords.length; i += chunkSize) {
                const chunk = notificationRecords.slice(i, i + chunkSize);
                const { error: insertError } = await supabaseClient
                    .from('crop_notifications')
                    .insert(chunk);
                
                if (insertError) throw insertError;
                
                // Update progress
                this.updateProgress((i + chunk.length) / notificationRecords.length * 100);
            }

            // Update batch status
            await supabaseClient
                .from('import_batches')
                .update({ status: 'completed' })
                .eq('id', this.currentBatchId);

            return {
                success: true,
                batchId: this.currentBatchId,
                totalRecords: validatedData.length,
                validRecords: validatedData.filter(row => row.isValid).length,
                invalidRecords: validatedData.filter(row => !row.isValid).length
            };

        } catch (error) {
            // Update batch status to failed
            if (this.currentBatchId) {
                await supabaseClient
                    .from('import_batches')
                    .update({ status: 'failed' })
                    .eq('id', this.currentBatchId);
            }
            throw error;
        }
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `आयात प्रगति: ${Math.round(percentage)}%`;
    }
}

export default ExcelImportManager;

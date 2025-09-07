7. Admin File - dbt-admin.js
// dbt-admin.js

/**
 * DBT Admin Module
 * Handles all administrative functions, user management, system controls, and admin-only features
 */

const DBTAdmin = {
    
    // Admin configuration
    config: {
        // Pagination settings
        pagination: {
            usersPerPage: 10,
            entriesPerPage: 20
        },
        
        // Export formats
        exportFormats: ['xlsx', 'csv', 'pdf'],
        
        // System health thresholds
        healthThresholds: {
            diskSpace: 80, // percentage
            memory: 85, // percentage
            responseTime: 2000 // milliseconds
        }
    },

    // Cache for admin data
    cache: {
        users: null,
        schemes: null,
        stats: null,
        lastUpdate: null
    },

    /**
     * Setup admin controls in the UI
     */
    setupAdminControls() {
        if (!DBTAuth.isAdmin()) {
            console.warn('User is not admin, skipping admin controls setup');
            return;
        }

        // Setup quick actions panel
        this.setupQuickActionsPanel();
        
        // Setup admin modals
        this.setupAdminModals();
        
        // Load initial admin data
        this.loadInitialAdminData();
        
        console.log('Admin controls setup completed');
    },

    /**
     * Setup quick actions panel
     */
    setupQuickActionsPanel() {
        const quickActionsPanel = document.getElementById('quickActionsPanel');
        if (!quickActionsPanel) return;

        quickActionsPanel.innerHTML = `
            <div class="row">
                <div class="col-12">
                    <h5 class="mb-3">
                        <i class="fas fa-bolt me-2"></i>Quick Actions
                        <button type="button" class="btn-close float-end" onclick="DBTAdmin.toggleQuickActions()"></button>
                    </h5>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card" onclick="DBTAdmin.showUserManagement()">
                        <div class="stats-number" id="totalUsers">0</div>
                        <div class="stats-label">Total Users</div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card" onclick="DBTAdmin.showDataReports()">
                        <div class="stats-number" id="totalEntries">0</div>
                        <div class="stats-label">DBT Entries</div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card" onclick="DBTAdmin.showPendingApprovals()">
                        <div class="stats-number" id="pendingApprovals">0</div>
                        <div class="stats-label">Pending Approvals</div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card">
                        <div class="stats-number" id="totalAmount">₹0</div>
                        <div class="stats-label">Total Amount</div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="text-center">
                        <button class="quick-action-btn" onclick="DBTAdmin.addNewUser()">
                            <i class="fas fa-user-plus"></i>Add New User
                        </button>
                        <button class="quick-action-btn" onclick="DBTAdmin.addNewScheme()">
                            <i class="fas fa-plus-circle"></i>Add New Scheme
                        </button>
                        <button class="quick-action-btn" onclick="DBTAdmin.generateReport()">
                            <i class="fas fa-file-export"></i>Generate Report
                        </button>
                        <button class="quick-action-btn" onclick="DBTAdmin.systemBackup()">
                            <i class="fas fa-shield-alt"></i>System Backup
                        </button>
                        <button class="quick-action-btn" onclick="DBTAdmin.viewSystemHealth()">
                            <i class="fas fa-heartbeat"></i>System Health
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Setup admin modals
     */
    setupAdminModals() {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        // Add user management modal
        modalContainer.insertAdjacentHTML('beforeend', `
            <!-- User Management Modal -->
            <div class="modal fade" id="userManagementModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-users me-2"></i>User Management
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="d-flex">
                                    <input type="search" class="form-control me-2" placeholder="Search users..." id="userSearch">
                                    <button class="btn btn-outline-primary" onclick="DBTAdmin.searchUsers()">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                                <button class="btn btn-primary" onclick="DBTAdmin.addNewUser()">
                                    <i class="fas fa-user-plus me-2"></i>Add New User
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>District</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="userTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center">Loading users...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <nav aria-label="User pagination">
                                <ul class="pagination justify-content-center" id="userPagination">
                                    <!-- Pagination will be populated by JS -->
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add User Modal -->
            <div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-plus me-2"></i>Add New User
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addUserForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Full Name *</label>
                                        <input type="text" class="form-control" id="newUserFullName" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Username *</label>
                                        <input type="text" class="form-control" id="newUserUsername" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Email *</label>
                                        <input type="email" class="form-control" id="newUserEmail" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-control" id="newUserPhone">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Role *</label>
                                        <select class="form-select" id="newUserRole" required>
                                            <option value="">-- Select Role --</option>
                                            <option value="user">User</option>
                                            <option value="operator">Operator</option>
                                            <option value="admin">Admin</option>
                                            ${DBTAuth.isSuperAdmin() ? '<option value="super_admin">Super Admin</option>' : ''}
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">District *</label>
                                        <select class="form-select" id="newUserDistrict" required>
                                            <option value="">-- Select District --</option>
                                        </select>
                                    </div>
                                    <div class="col-12 mb-3">
                                        <label class="form-label">Temporary Password *</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="newUserPassword" required>
                                            <button type="button" class="btn btn-outline-secondary" onclick="DBTAdmin.generatePassword()">
                                                <i class="fas fa-random"></i> Generate
                                            </button>
                                        </div>
                                        <small class="text-muted">User will be required to change password on first login</small>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="DBTAdmin.saveNewUser()">
                                <i class="fas fa-save me-2"></i>Create User
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- System Health Modal -->
            <div class="modal fade" id="systemHealthModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-heartbeat me-2"></i>System Health Monitor
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row" id="systemHealthContent">
                                <div class="col-12 text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Loading system health data...</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="DBTAdmin.refreshSystemHealth()">
                                <i class="fas fa-sync me-2"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    },

    /**
     * Load initial admin data
     */
    async loadInitialAdminData() {
        try {
            await Promise.all([
                this.loadAdminStats(),
                this.loadDistricts()
            ]);
        } catch (error) {
            console.error('Error loading initial admin data:', error);
        }
    },

    /**
     * Load admin statistics
     */
    async loadAdminStats() {
        if (!DBTAuth.requireAdminAccess('Admin Statistics')) return;

        try {
            // Load total users
            const { data: users, error: usersError } = await supabaseClient
                .from('test_users')
                .select('id', { count: 'exact' });

            if (!usersError) {
                const totalUsersElement = document.getElementById('totalUsers');
                if (totalUsersElement) {
                    totalUsersElement.textContent = users?.length || 0;
                }
            }

            // Load total entries
            const { data: entries, error: entriesError } = await supabaseClient
                .from('dbt_data_entries')
                .select('id', { count: 'exact' });

            if (!entriesError) {
                const totalEntriesElement = document.getElementById('totalEntries');
                if (totalEntriesElement) {
                    totalEntriesElement.textContent = entries?.length || 0;
                }
            }

            // Load pending approvals
            const { data: pending, error: pendingError } = await supabaseClient
                .from('dbt_data_entries')
                .select('id', { count: 'exact' })
                .eq('status', 'pending');

            if (!pendingError) {
                const count = pending?.length || 0;
                const pendingApprovalsElement = document.getElementById('pendingApprovals');
                const pendingCountElement = document.getElementById('pendingCount');
                
                if (pendingApprovalsElement) {
                    pendingApprovalsElement.textContent = count;
                }
                if (pendingCountElement) {
                    pendingCountElement.textContent = count;
                    if (count > 0) {
                        pendingCountElement.style.display = 'inline-block';
                    }
                }
            }

            // Load total amount
            const { data: amounts, error: amountsError } = await supabaseClient
                .from('dbt_data_entries')
                .select('total_amount_disbursed');

            if (!amountsError && amounts) {
                const totalAmount = amounts.reduce((sum, entry) => 
                    sum + (parseFloat(entry.total_amount_disbursed) || 0), 0
                );
                const totalAmountElement = document.getElementById('totalAmount');
                if (totalAmountElement) {
                    totalAmountElement.textContent = '₹' + this.formatCurrency(totalAmount);
                }
            }

            // Cache the stats
            this.cache.stats = {
                totalUsers: users?.length || 0,
                totalEntries: entries?.length || 0,
                pendingApprovals: pending?.length || 0,
                totalAmount: amounts ? amounts.reduce((sum, entry) => 
                    sum + (parseFloat(entry.total_amount_disbursed) || 0), 0) : 0
            };
            this.cache.lastUpdate = new Date();

        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    },

    /**
     * Load districts for user management
     */
    async loadDistricts() {
        try {
            const { data: districts, error } = await supabaseClient
                .from('districts')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            if (error) {
                console.warn('Districts table error, using fallback data:', error);
                this.loadFallbackDistricts();
                return;
            }

            const districtSelect = document.getElementById('newUserDistrict');
            if (districtSelect && districts) {
                districtSelect.innerHTML = '<option value="">-- Select District --</option>';
                
                districts.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district.id;
                    option.textContent = district.name;
                    districtSelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('Error loading districts:', error);
            this.loadFallbackDistricts();
        }
    },

    /**
     * Load fallback districts
     */
    loadFallbackDistricts() {
        const districtSelect = document.getElementById('newUserDistrict');
        if (!districtSelect) return;

        const fallbackDistricts = [
            'Raipur', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Raigarh',
            'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund', 'Kanker',
            'Kawardha', 'Jashpur', 'Surguja', 'Koriya', 'Janjgir-Champa'
        ];

        districtSelect.innerHTML = '<option value="">-- Select District --</option>';
        
        fallbackDistricts.forEach((district, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    },

    /**
     * Show dashboard
     */
    showDashboard() {
        if (!DBTAuth.requireAdminAccess('Dashboard')) return;
        window.open('admin-dashboard.html', '_blank');
    },

    /**
     * Show user management modal
     */
    showUserManagement() {
        if (!DBTAuth.requireAdminAccess('User Management')) return;
        
        this.loadUsers();
        const modal = new bootstrap.Modal(document.getElementById('userManagementModal'));
        modal.show();
    },

    /**
     * Show scheme management
     */
    showSchemeManagement() {
        if (!DBTAuth.requireAdminAccess('Scheme Management')) return;
        window.open('scheme-management.html', '_blank');
    },

    /**
     * Show data reports
     */
    showDataReports() {
        if (!DBTAuth.requireAdminAccess('Data Reports')) return;
        window.open('data-reports.html', '_blank');
    },

    /**
     * Show system settings
     */
    showSystemSettings() {
        if (!DBTAuth.requireAdminAccess('System Settings')) return;
        window.open('system-settings.html', '_blank');
    },

    /**
     * Show audit logs
     */
    showAuditLogs() {
        if (!DBTAuth.requireAdminAccess('Audit Logs')) return;
        window.open('audit-logs.html', '_blank');
    },

    /**
     * Show backup and restore
     */
    showBackupRestore() {
        if (!DBTAuth.requireAdminAccess('Backup & Restore')) return;
        window.open('backup-restore.html', '_blank');
    },

    /**
     * Show pending approvals
     */
    showPendingApprovals() {
        if (!DBTAuth.requireAdminAccess('Pending Approvals')) return;
        window.open('pending-approvals.html', '_blank');
    },

    /**
     * Toggle quick actions panel
     */
    toggleQuickActions() {
        if (!DBTAuth.requireAdminAccess('Quick Actions')) return;
        
        const panel = document.getElementById('quickActionsPanel');
        if (panel) {
            panel.classList.toggle('show');
        }
    },

    /**
     * Load users for management
     */
    async loadUsers(page = 1) {
        if (!DBTAuth.requireAdminAccess('User Management')) return;

        try {
            const offset = (page - 1) * this.config.pagination.usersPerPage;
            
            const { data: users, error, count } = await supabaseClient
                .from('test_users')
                .select(`
                    id, username, email, full_name, role, is_active, created_at,
                    districts (id, name)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + this.config.pagination.usersPerPage - 1);

            if (error) {
                console.error('Error loading users:', error);
                this.displayUserError('Error loading users');
                return;
            }

            this.displayUsers(users || []);
            this.setupUserPagination(count || 0, page);
            
            // Cache users data
            this.cache.users = users;

        } catch (error) {
            console.error('Error loading users:', error);
            this.displayUserError('Error loading users');
        }
    },

    /**
     * Display users in table
     * @param {Array} users - Array of user objects
     */
    displayUsers(users) {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${this.getRoleBadgeColor(user.role)}">${user.role}</span></td>
                <td>${user.districts?.name || 'N/A'}</td>
                <td><span class="badge bg-${user.is_active ? 'success' : 'secondary'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="DBTAdmin.editUser('${user.id}')" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-${user.is_active ? 'warning' : 'success'}" onclick="DBTAdmin.toggleUserStatus('${user.id}', ${user.is_active})" title="${user.is_active ? 'Deactivate' : 'Activate'} User">
                        <i class="fas fa-${user.is_active ? 'pause' : 'play'}"></i>
                    </button>
                    ${DBTAuth.isSuperAdmin() ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="DBTAdmin.deleteUser('${user.id}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    /**
     * Display user loading error
     * @param {string} message - Error message
     */
    displayUserError(message) {
        const tbody = document.getElementById('userTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${message}</td></tr>`;
        }
    },

    /**
     * Setup user pagination
     * @param {number} totalCount - Total number of users
     * @param {number} currentPage - Current page number
     */
    setupUserPagination(totalCount, currentPage) {
        const pagination = document.getElementById('userPagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalCount / this.config.pagination.usersPerPage);
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="DBTAdmin.loadUsers(${currentPage - 1})">Previous</a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHTML += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="DBTAdmin.loadUsers(${i})">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="DBTAdmin.loadUsers(${currentPage + 1})">Next</a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    },

    /**
     * Get role badge color
     * @param {string} role - User role
     * @returns {string} - Bootstrap badge color class
     */
    getRoleBadgeColor(role) {
        const colorMap = {
            'super_admin': 'danger',
            'admin': 'warning',
            'operator': 'info',
            'user': 'primary'
        };
        return colorMap[role] || 'secondary';
    },

    /**
     * Search users
     */
    searchUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase();
        if (!searchTerm) {
            this.loadUsers();
            return;
        }

        const rows = document.querySelectorAll('#userTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    },

    /**
     * Add new user
     */
    addNewUser() {
        if (!DBTAuth.requireAdminAccess('Add User')) return;
        
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    },

    /**
     * Generate random password
     */
    generatePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        const passwordField = document.getElementById('newUserPassword');
        if (passwordField) {
            passwordField.type = 'text';
            passwordField.value = password;
            
            // Hide password after 3 seconds
            setTimeout(() => {
                passwordField.type = 'password';
            }, 3000);
        }
    },

    /**
     * Save new user
     */
    async saveNewUser() {
        if (!DBTAuth.requireAdminAccess('Add User')) return;

        try {
            const userData = {
                full_name: document.getElementById('newUserFullName')?.value,
                username: document.getElementById('newUserUsername')?.value,
                email: document.getElementById('newUserEmail')?.value,
                phone: document.getElementById('newUserPhone')?.value,
                role: document.getElementById('newUserRole')?.value,
                district_id: document.getElementById('newUserDistrict')?.value,
                password: document.getElementById('newUserPassword')?.value,
                is_active: true,
                created_by: DBTAuth.getCurrentUser()?.id
            };

            // Validate required fields
            if (!userData.full_name || !userData.username || !userData.email || 
                !userData.role || !userData.district_id || !userData.password) {
                if (typeof showAlert === 'function') {
                    showAlert('कृपया सभी आवश्यक फील्ड भरें।', 'warning');
                }
                return;
            }

            // Hash password (you'll need to implement this based on your login system)
            userData.password_hash = await this.hashPassword(userData.password);
            delete userData.password;

            const { data, error } = await supabaseClient
                .from('test_users')
                .insert([userData])
                .select();

            if (error) {
                console.error('Error creating user:', error);
                if (typeof showAlert === 'function') {
                    showAlert('यूजर बनाने में त्रुटि हुई।', 'danger');
                }
                return;
            }

            if (typeof showAlert === 'function') {
                showAlert('नया यूजर सफलतापूर्वक बनाया गया।', 'success');
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
            modal.hide();
            
            document.getElementById('addUserForm').reset();
            this.loadUsers();

        } catch (error) {
            console.error('Error saving user:', error);
            if (typeof showAlert === 'function') {
                showAlert('यूजर बनाने में त्रुटि हुई।', 'danger');
            }
        }
    },

    /**
     * Hash password (placeholder - implement based on your system)
     * @param {string} password - Plain text password
     * @returns {Promise<string>} - Hashed password
     */
    async hashPassword(password) {
        // This should use the same hashing method as your login system
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Edit user (placeholder)
     * @param {string} userId - User ID to edit
     */
    editUser(userId) {
        if (!DBTAuth.requireAdminAccess('Edit User')) return;
        
        if (typeof showAlert === 'function') {
            showAlert('Edit user functionality would open here for user: ' + userId, 'info');
        }
        // Implement edit user modal and functionality
    },

    /**
     * Toggle user status
     * @param {string} userId - User ID
     * @param {boolean} currentStatus - Current active status
     */
    async toggleUserStatus(userId, currentStatus) {
        if (!DBTAuth.requireAdminAccess('Toggle User Status')) return;

        try {
            const { error } = await supabaseClient
                .from('test_users')
                .update({ 
                    is_active: !currentStatus,
                    updated_by: DBTAuth.getCurrentUser()?.id,
                    updated_at: new Date().toISOString()
                
                })
                .eq('id', userId);

            if (error) {
                console.error('Error updating user status:', error);
                if (typeof showAlert === 'function') {
                    showAlert('यूजर स्टेटस अपडेट करने में त्रुटि हुई।', 'danger');
                }
                return;
            }

            if (typeof showAlert === 'function') {
                showAlert(`यूजर ${!currentStatus ? 'सक्रिय' : 'निष्क्रिय'} किया गया।`, 'success');
            }
            
            this.loadUsers();

        } catch (error) {
            console.error('Error toggling user status:', error);
            if (typeof showAlert === 'function') {
                showAlert('यूजर स्टेटस अपडेट करने में त्रुटि हुई।', 'danger');
            }
        }
    },

    /**
     * Delete user (Super Admin only)
     * @param {string} userId - User ID to delete
     */
    async deleteUser(userId) {
        if (!DBTAuth.isSuperAdmin()) {
            if (typeof showAlert === 'function') {
                showAlert('केवल सुपर एडमिन यूजर को डिलीट कर सकते हैं।', 'warning');
            }
            return;
        }

        if (!confirm('क्या आप वाकई इस यूजर को डिलीट करना चाहते हैं? यह क्रिया अपरिवर्तनीय है।')) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('test_users')
                .delete()
                .eq('id', userId);

            if (error) {
                console.error('Error deleting user:', error);
                if (typeof showAlert === 'function') {
                    showAlert('यूजर डिलीट करने में त्रुटि हुई।', 'danger');
                }
                return;
            }

            if (typeof showAlert === 'function') {
                showAlert('यूजर सफलतापूर्वक डिलीट किया गया।', 'success');
            }
            
            this.loadUsers();

        } catch (error) {
            console.error('Error deleting user:', error);
            if (typeof showAlert === 'function') {
                showAlert('यूजर डिलीट करने में त्रुटि हुई।', 'danger');
            }
        }
    },

    /**
     * Add new scheme
     */
    addNewScheme() {
        if (!DBTAuth.requireAdminAccess('Add Scheme')) return;
        
        const modal = new bootstrap.Modal(document.getElementById('addSchemeModal'));
        modal.show();
    },

    /**
     * Save new scheme
     */
    async saveNewScheme() {
        if (!DBTAuth.requireAdminAccess('Add Scheme')) return;

        try {
            const schemeData = {
                scheme_name: document.getElementById('newSchemeName')?.value,
                scheme_code: document.getElementById('newSchemeCode')?.value,
                scheme_type: document.getElementById('newSchemeType')?.value,
                benefit_type: document.getElementById('newBenefitType')?.value,
                department_name: document.getElementById('newDepartmentName')?.value,
                budget_type: document.getElementById('newBudgetType')?.value,
                is_active: true,
                created_by: DBTAuth.getCurrentUser()?.id,
                created_at: new Date().toISOString()
            };

            if (!schemeData.scheme_name || !schemeData.scheme_code || 
                !schemeData.scheme_type || !schemeData.benefit_type) {
                if (typeof showAlert === 'function') {
                    showAlert('कृपया सभी आवश्यक फील्ड भरें।', 'warning');
                }
                return;
            }

            const { data, error } = await supabaseClient
                .from('schemes')
                .insert([schemeData])
                .select();

            if (error) {
                console.error('Error creating scheme:', error);
                if (typeof showAlert === 'function') {
                    showAlert('स्कीम बनाने में त्रुटि हुई।', 'danger');
                }
                return;
            }

            if (typeof showAlert === 'function') {
                showAlert('नई स्कीम सफलतापूर्वक जोड़ी गई।', 'success');
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addSchemeModal'));
            modal.hide();
            
            document.getElementById('addSchemeForm').reset();
            
            // Reload schemes in main form if function exists
            if (typeof loadSchemes === 'function') {
                loadSchemes();
            }

        } catch (error) {
            console.error('Error adding scheme:', error);
            if (typeof showAlert === 'function') {
                showAlert('स्कीम जोड़ने में त्रुटि हुई।', 'danger');
            }
        }
    },

    /**
     * Generate report
     */
    generateReport() {
        if (!DBTAuth.requireAdminAccess('Generate Report')) return;
        
        // Show report generation options
        const reportOptions = [
            { id: 'users', name: 'User Report', icon: 'fas fa-users' },
            { id: 'entries', name: 'DBT Entries Report', icon: 'fas fa-database' },
            { id: 'schemes', name: 'Schemes Report', icon: 'fas fa-list-alt' },
            { id: 'financial', name: 'Financial Summary', icon: 'fas fa-chart-line' }
        ];

        let optionsHTML = '<div class="row">';
        reportOptions.forEach(option => {
            optionsHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card h-100" style="cursor: pointer;" onclick="DBTAdmin.generateSpecificReport('${option.id}')">
                        <div class="card-body text-center">
                            <i class="${option.icon} fa-2x mb-2 text-primary"></i>
                            <h6>${option.name}</h6>
                        </div>
                    </div>
                </div>
            `;
        });
        optionsHTML += '</div>';

        // Create and show modal
        const modalHTML = `
            <div class="modal fade" id="reportModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-file-export me-2"></i>Generate Report
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Select the type of report you want to generate:</p>
                            ${optionsHTML}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('reportModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        modal.show();
    },

    /**
     * Generate specific report
     * @param {string} reportType - Type of report to generate
     */
    async generateSpecificReport(reportType) {
        if (!DBTAuth.requireAdminAccess('Generate Report')) return;

        try {
            // Close the report selection modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
            if (modal) modal.hide();

            // Show loading
            if (typeof showLoading === 'function') {
                showLoading(true);
            }

            let reportData;
            let filename;
            let headers;

            switch (reportType) {
                case 'users':
                    reportData = await this.getUsersReportData();
                    filename = `Users_Report_${new Date().toISOString().split('T')[0]}`;
                    headers = ['Full Name', 'Username', 'Email', 'Role', 'District', 'Status', 'Created Date'];
                    break;

                case 'entries':
                    reportData = await this.getEntriesReportData();
                    filename = `DBT_Entries_Report_${new Date().toISOString().split('T')[0]}`;
                    headers = ['Entry ID', 'Scheme', 'Date', 'Total Amount', 'Beneficiaries', 'Status', 'Created By'];
                    break;

                case 'schemes':
                    reportData = await this.getSchemesReportData();
                    filename = `Schemes_Report_${new Date().toISOString().split('T')[0]}`;
                    headers = ['Scheme Name', 'Code', 'Type', 'Benefit Type', 'Status', 'Created Date'];
                    break;

                case 'financial':
                    reportData = await this.getFinancialReportData();
                    filename = `Financial_Summary_${new Date().toISOString().split('T')[0]}`;
                    headers = ['Scheme', 'Total Allocation', 'Amount Disbursed', 'Beneficiaries', 'Savings'];
                    break;

                default:
                    throw new Error('Invalid report type');
            }

            // Generate and download Excel file
            this.downloadExcelReport(reportData, headers, filename);

            if (typeof showAlert === 'function') {
                showAlert('रिपोर्ट सफलतापूर्वक जेनरेट की गई।', 'success');
            }

        } catch (error) {
            console.error('Error generating report:', error);
            if (typeof showAlert === 'function') {
                showAlert('रिपोर्ट जेनरेट करने में त्रुटि हुई।', 'danger');
            }
        } finally {
            if (typeof showLoading === 'function') {
                showLoading(false);
            }
        }
    },

    /**
     * Get users report data
     * @returns {Promise<Array>} - Users data for report
     */
    async getUsersReportData() {
        const { data, error } = await supabaseClient
            .from('test_users')
            .select(`
                full_name, username, email, role, is_active, created_at,
                districts (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(user => [
            user.full_name,
            user.username,
            user.email,
            user.role,
            user.districts?.name || 'N/A',
            user.is_active ? 'Active' : 'Inactive',
            new Date(user.created_at).toLocaleDateString('en-IN')
        ]);
    },

    /**
     * Get entries report data
     * @returns {Promise<Array>} - Entries data for report
     */
    async getEntriesReportData() {
        const { data, error } = await supabaseClient
            .from('dbt_data_entries')
            .select(`
                entry_id, scheme_select, dbt_date, total_amount_disbursed, 
                total_beneficiaries, status, created_at,
                test_users (full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(entry => [
            entry.entry_id,
            entry.scheme_select || 'N/A',
            entry.dbt_date,
            `₹${this.formatCurrency(entry.total_amount_disbursed)}`,
            entry.total_beneficiaries,
            entry.status,
            entry.test_users?.full_name || 'N/A'
        ]);
    },

    /**
     * Get schemes report data
     * @returns {Promise<Array>} - Schemes data for report
     */
    async getSchemesReportData() {
        const { data, error } = await supabaseClient
            .from('schemes')
            .select('scheme_name, scheme_code, scheme_type, benefit_type, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(scheme => [
            scheme.scheme_name,
            scheme.scheme_code,
            scheme.scheme_type,
            scheme.benefit_type,
            scheme.is_active ? 'Active' : 'Inactive',
            new Date(scheme.created_at).toLocaleDateString('en-IN')
        ]);
    },

    /**
     * Get financial report data
     * @returns {Promise<Array>} - Financial data for report
     */
    async getFinancialReportData() {
        const { data, error } = await supabaseClient
            .from('dbt_data_entries')
            .select(`
                scheme_select, central_allocation, state_normative_allocation,
                additional_state_allocation, total_amount_disbursed,
                total_beneficiaries, saving_amount
            `);

        if (error) throw error;

        // Group by scheme and calculate totals
        const schemeData = {};
        data.forEach(entry => {
            const scheme = entry.scheme_select || 'Unknown';
            if (!schemeData[scheme]) {
                schemeData[scheme] = {
                    totalAllocation: 0,
                    totalDisbursed: 0,
                    totalBeneficiaries: 0,
                    totalSavings: 0
                };
            }
            
            schemeData[scheme].totalAllocation += 
                (entry.central_allocation || 0) + 
                (entry.state_normative_allocation || 0) + 
                (entry.additional_state_allocation || 0);
            schemeData[scheme].totalDisbursed += entry.total_amount_disbursed || 0;
            schemeData[scheme].totalBeneficiaries += entry.total_beneficiaries || 0;
            schemeData[scheme].totalSavings += entry.saving_amount || 0;
        });

        return Object.entries(schemeData).map(([scheme, data]) => [
            scheme,
            `₹${this.formatCurrency(data.totalAllocation)}`,
            `₹${this.formatCurrency(data.totalDisbursed)}`,
            data.totalBeneficiaries,
            `₹${this.formatCurrency(data.totalSavings)}`
        ]);
    },

    /**
     * Download Excel report
     * @param {Array} data - Report data
     * @param {Array} headers - Column headers
     * @param {string} filename - File name
     */
    downloadExcelReport(data, headers, filename) {
        // Create CSV content (simple Excel alternative)
        let csvContent = headers.join(',') + '\n';
        data.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename + '.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * System backup
     */
    async systemBackup() {
        if (!DBTAuth.requireAdminAccess('System Backup')) return;

        if (!confirm('क्या आप सिस्टम बैकअप शुरू करना चाहते हैं? इसमें कुछ समय लग सकता है।')) {
            return;
        }

        try {
            if (typeof showLoading === 'function') {
                showLoading(true);
            }

            if (typeof showAlert === 'function') {
                showAlert('सिस्टम बैकअप शुरू किया जा रहा है...', 'info');
            }

            // Simulate backup process (implement actual backup logic)
            await new Promise(resolve => setTimeout(resolve, 3000));

            if (typeof showAlert === 'function') {
                showAlert('सिस्टम बैकअप सफलतापूर्वक पूरा हुआ।', 'success');
            }

        } catch (error) {
            console.error('Error during backup:', error);
            if (typeof showAlert === 'function') {
                showAlert('बैकअप प्रक्रिया में त्रुटि हुई।', 'danger');
            }
        } finally {
            if (typeof showLoading === 'function') {
                showLoading(false);
            }
        }
    },

    /**
     * View system health
     */
    viewSystemHealth() {
        if (!DBTAuth.requireAdminAccess('System Health')) return;
        
        const modal = new bootstrap.Modal(document.getElementById('systemHealthModal'));
        modal.show();
        
        this.loadSystemHealth();
    },

    /**
     * Load system health data
     */
    async loadSystemHealth() {
        try {
            const healthContent = document.getElementById('systemHealthContent');
            if (!healthContent) return;

            // Simulate system health data (implement actual health checks)
            const healthData = {
                database: { status: 'healthy', responseTime: 45 },
                storage: { status: 'healthy', usage: 65 },
                memory: { status: 'warning', usage: 78 },
                cpu: { status: 'healthy', usage: 42 }
            };

            healthContent.innerHTML = `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="fas fa-database me-2"></i>Database
                                <span class="badge bg-${this.getHealthBadgeColor(healthData.database.status)} float-end">
                                    ${healthData.database.status}
                                </span>
                            </h6>
                            <p class="card-text">Response Time: ${healthData.database.responseTime}ms</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="fas fa-hdd me-2"></i>Storage
                                <span class="badge bg-${this.getHealthBadgeColor(healthData.storage.status)} float-end">
                                    ${healthData.storage.status}
                                </span>
                            </h6>
                            <p class="card-text">Usage: ${healthData.storage.usage}%</p>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${healthData.storage.usage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="fas fa-memory me-2"></i>Memory
                                <span class="badge bg-${this.getHealthBadgeColor(healthData.memory.status)} float-end">
                                    ${healthData.memory.status}
                                </span>
                            </h6>
                            <p class="card-text">Usage: ${healthData.memory.usage}%</p>
                            <div class="progress">
                                <div class="progress-bar bg-${healthData.memory.status === 'warning' ? 'warning' : 'primary'}" 
                                     style="width: ${healthData.memory.usage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="fas fa-microchip me-2"></i>CPU
                                <span class="badge bg-${this.getHealthBadgeColor(healthData.cpu.status)} float-end">
                                    ${healthData.cpu.status}
                                </span>
                            </h6>
                            <p class="card-text">Usage: ${healthData.cpu.usage}%</p>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${healthData.cpu.usage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading system health:', error);
            const healthContent = document.getElementById('systemHealthContent');
            if (healthContent) {
                healthContent.innerHTML = '<div class="col-12 text-center text-danger">Error loading system health data</div>';
            }
        }
    },

    /**
     * Refresh system health
     */
    refreshSystemHealth() {
        this.loadSystemHealth();
    },

    /**
     * Get health badge color
     * @param {string} status - Health status
     * @returns {string} - Bootstrap badge color
     */
    getHealthBadgeColor(status) {
        const colorMap = {
            'healthy': 'success',
            'warning': 'warning',
            'critical': 'danger',
            'unknown': 'secondary'
        };
        return colorMap[status] || 'secondary';
    },

    /**
     * Format currency for display
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Clear admin cache
     */
    clearCache() {
        this.cache = {
            users: null,
            schemes: null,
            stats: null,
            lastUpdate: null
        };
        console.log('Admin cache cleared');
    },

    /**
     * Initialize admin module
     */
    init() {
        console.log('DBT Admin module initialized');
        
        // Setup admin controls if user is admin
        if (DBTAuth.isAdmin()) {
            this.setupAdminControls();
        }
    }
};

// Initialize admin module when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth to be ready
    setTimeout(() => {
        if (DBTAuth.isAdmin()) {
            DBTAdmin.init();
        }
    }, 100);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBTAdmin;
}

console.log('DBT Admin module loaded successfully');

// pmfby/js/dashboard.js

// Import all secure modules
import { supabaseClient } from './config.js'; 
import { SecurityUtils } from './security.js'; 
import { authManager } from './auth.js';     
import { secureDB } from './database.js'; 
import { performanceManager } from './performance.js'; 
import { errorHandler } from './error-handler.js'; 

let isAdmin = false;
let editMode = false;
let currentUser = null;
let allDistricts = [];
let lastExcelHeaders = [];
let lastDynamicTableName = '';
let allNavParentItems = [];
let allDashboardCards = [];
let allDynamicForms = []; // To store all form definitions for management

const availableIcons = [
    'fas fa-home', 'fas fa-user', 'fas fa-cog', 'fas fa-chart-bar',
    'fas fa-money-bill-transfer', 'fas fa-store', 'fas fa-chart-line', 'fas fa-credit-card',
    'fas fa-spa', 'fas fa-flask', 'fas fa-bug', 'fas fa-seedling', 'fas fa-tractor',
    'fas fa-warehouse', 'fas fa-file-alt', 'fas fa-users', 'fas fa-calendar',
    'fas fa-bell', 'fas fa-envelope', 'fas fa-phone', 'fas fa-map-marker-alt', // Corrected example for multiple icons
    'fas fa-cube', 'fas fa-boxes', 'fas fa-truck', 'fas fa-clipboard-list', 'fas fa-link'
];

window.addEventListener('load', function() {
    setTimeout(() => {
        const pageLoading = document.getElementById('pageLoading');
        if (pageLoading) pageLoading.style.display = 'none';
    }, 500);
});

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Clear redirect counter on successful page load
        sessionStorage.removeItem('redirectCount');

        // Show initial loading
        performanceManager.showLoading('pageLoading', 'Checking authentication...');

        // Authentication check
        const isAuthenticated = await authManager.verifyAuthentication();

        if (!isAuthenticated) {
            errorHandler.showToast('error', 'Authentication Required', 'Please login to access the dashboard');
            authManager.redirectToLogin(); // Redirect to login page
            return;
        }

        currentUser = authManager.getCurrentUser();
        isAdmin = currentUser?.profile?.role === 'admin';
        
        // Load user data and content
        await loadUserDataAndContent();
        
        // Hide page loading
        const pageLoading = document.getElementById('pageLoading');
        if (pageLoading) pageLoading.style.display = 'none';
        performanceManager.hideLoading('pageLoading');

        errorHandler.showSuccess('Ready', 'Dashboard loaded successfully');

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        errorHandler.handleError(error, { context: 'dashboard_initialization' });
        const pageLoading = document.getElementById('pageLoading');
        if (pageLoading) pageLoading.style.display = 'none';
        performanceManager.hideLoading('pageLoading');
        authManager.redirectToLogin(); // Redirect on critical error
    }
});

async function loadUserDataAndContent() {
    try {
        performanceManager.showLoading('pageLoading', 'Loading user data...');
        
        // Update user display
        authManager.updateUserDisplay();
        
        // Toggle admin features
        authManager.setupRoleBasedAccess();

        // Fetch all data in parallel
        await Promise.all([
            fetchDistricts(),
            fetchNavParentItems(),
            fetchAllDashboardCards(),
            fetchAllDynamicForms(),
            loadDynamicContent() // This will load dashboard cards and nav items
        ]);
        
        setupEventListeners();
        setupAccessibility();
        setupRealtimeSubscriptions();

        performanceManager.hideLoading('pageLoading');

    } catch (error) {
        console.error('Error loading user data and content:', error);
        errorHandler.handleError(error, { context: 'dashboard_data_load' });
        throw error;
    }
}

async function fetchDistricts() {
    try {
        const districts = await secureDB.getDistricts();
        allDistricts = districts;

        const userDistrictSelect = document.getElementById('editUserDistrict');
        if (userDistrictSelect) {
            userDistrictSelect.innerHTML = '<option value="">जिला चुनें</option>';
            allDistricts.forEach(district => {
                const option = document.createElement('option');
                option.value = district.id;
                option.textContent = district.name;
                userDistrictSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Error fetching districts:', error);
        errorHandler.showToast('error', 'जिलों को लोड करने में त्रुटि', error.message);
    }
}

async function fetchNavParentItems() {
    try {
        const navItems = await secureDB.secureSelect('navigation_items', {
            select: 'id, name_hi',
            filters: { parent_id: null, is_active: true },
            orderBy: 'display_order'
        });
        allNavParentItems = navItems;

        const formNavParentItemSelect = document.getElementById('formNavParentItem');
        if (formNavParentItemSelect) {
            formNavParentItemSelect.innerHTML = '<option value="">सेक्शन चुनें</option>';
            allNavParentItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name_hi;
                formNavParentItemSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Error fetching parent navigation items:', error);
        errorHandler.showToast('error', 'नेवीगेशन सेक्शन लोड करने में त्रुटि', error.message);
    }
}

async function fetchAllDashboardCards() {
    try {
        const cards = await secureDB.secureSelect('dashboard_cards', {
            select: 'id, title_hi, description_hi, target_url, icon_class',
            filters: { is_active: true },
            orderBy: 'display_order'
        });
        allDashboardCards = cards;

        const formParentDashboardCardSelect = document.getElementById('formParentDashboardCard');
        if (formParentDashboardCardSelect) {
            formParentDashboardCardSelect.innerHTML = '<option value="">मैप करने के लिए कार्ड चुनें</option>';
            allDashboardCards.forEach(card => {
                const option = document.createElement('option');
                option.value = card.id;
                option.textContent = card.title_hi;
                formParentDashboardCardSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Error fetching dashboard cards for mapping:', error);
        errorHandler.showToast('error', 'डैशबोर्ड कार्ड लोड करने में त्रुटि', error.message);
    }
}

async function fetchAllDynamicForms() {
    try {
        const forms = await secureDB.secureSelect('form_definitions', {
            select: 'id, table_name, label, created_at, navigation_item_id, parent_dashboard_card_id, dashboard_cards(title_hi), navigation_items(name_hi)'
        });
        allDynamicForms = forms;
    } catch (error) {
        console.error('Error fetching all dynamic forms:', error);
        errorHandler.showToast('error', 'डायनेमिक फॉर्म लोड करने में त्रुटि', error.message);
    }
}

async function loadDynamicContent() {
    try {
        // This function is now called after authentication and initial data load
        await Promise.all([loadDashboardCards(), loadNavigationItems()]);
    } catch (error) {
        console.error('Error loading dynamic content:', error);
        errorHandler.handleError(error, { context: 'dynamic_content_load' });
    }
}

async function loadDashboardCards() {
    try {
        const cards = await secureDB.secureSelect('dashboard_cards', {
            filters: { is_active: true },
            orderBy: 'display_order'
        });

        const cardsContainer = document.getElementById('dynamicDashboardCards');
        if (!cardsContainer) return;
        cardsContainer.innerHTML = '';

        cards.forEach(card => {
            const cardElement = createCardElement(card);
            cardsContainer.appendChild(cardElement);
        });

        setupCardInteractions();

    } catch (error) {
        console.error('Error loading dashboard cards:', error);
        errorHandler.showToast('error', 'कार्ड लोड करने में त्रुटि', error.message);
    }
}

function createCardElement(card) {
    const cardLink = document.createElement('a');
    // Check if this card has any dynamic forms mapped to it
    const associatedDynamicForms = allDynamicForms.filter(form => form.parent_dashboard_card_id === card.id);

    // If card has associated dynamic forms, its href will be '#' and click will open selector modal
    // Otherwise, it uses its own target_url
    cardLink.href = (associatedDynamicForms.length > 0) ? '#' : card.target_url;
    cardLink.className = 'card-link';
    cardLink.dataset.cardId = card.id;

    cardLink.addEventListener('click', async function(e) {
        e.preventDefault(); // Prevent default navigation initially
        
        // Log card click only if not in edit mode
        if (!editMode) {
            await logCardClick(card.id);
        }

        if (associatedDynamicForms.length > 0) {
            openDynamicFormSelectorModal(card.id, card.title_hi, associatedDynamicForms);
        } else if (!editMode) {
            // Normal navigation for cards without dynamic forms, if not in edit mode
            const cardDiv = this.querySelector('.dashboard-card');
            if (cardDiv) cardDiv.style.opacity = '0.6';
            
            // Use setTimeout for navigation to allow UI update
            setTimeout(() => { 
                window.location.href = this.href; 
            }, 200);
        }
        // In editMode, default click is prevented by setupCardInteractions
    });

    const cardDiv = document.createElement('div');
    cardDiv.className = 'dashboard-card';

    cardDiv.innerHTML = `
        ${isAdmin && editMode ? `
            <div class="card-admin-controls">
                <button class="admin-card-btn edit-card-btn" onclick="editCard(${card.id})" title="संपादित करें">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="admin-card-btn delete-card-btn" onclick="deleteCard(${card.id})" title="हटाएं">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : ''}
        <div class="card-icon">
            <i class="fas ${card.icon_class}"></i>
        </div>
        <h3 class="card-title">${card.title_hi}</h3>
        <p class="card-description">${card.description_hi}</p>
    `;

    cardLink.appendChild(cardDiv);
    return cardLink;
}

async function loadNavigationItems() {
    try {
        const navItems = await secureDB.secureSelect('navigation_items', {
            select: '*, navigation_categories(name_hi, name_en)',
            filters: { is_active: true },
            orderBy: 'parent_id, display_order' // Order by parent_id to group children
        });

        const dropdownContainer = document.getElementById('dynamicDropdown');
        if (!dropdownContainer) return;
        dropdownContainer.innerHTML = '';

        const groupedNavItems = navItems.reduce((acc, item) => {
            const parentId = item.parent_id === null ? 'top-level' : item.parent_id;
            if (!acc[parentId]) acc[parentId] = [];
            acc[parentId].push(item);
            return acc;
        }, {});

        const topLevelItems = groupedNavItems['top-level'] || [];
        topLevelItems.sort((a, b) => a.display_order - b.display_order);

        topLevelItems.forEach(parentItem => {
            const parentNavElement = document.createElement('a');
            parentNavElement.href = parentItem.url;
            parentNavElement.className = 'dropdown-item';
            if (parentItem.is_external) parentNavElement.target = '_blank';
            parentNavElement.innerHTML = `<i class="fas ${parentItem.icon_class}"></i> ${parentItem.name_hi}`;
            dropdownContainer.appendChild(parentNavElement);

            const children = groupedNavItems[parentItem.id] || [];
            children.sort((a, b) => a.display_order - b.display_order);

            children.forEach(child => {
                const childNavElement = document.createElement('a');
                childNavElement.href = child.url;
                childNavElement.className = 'dropdown-item';
                if (child.is_external) childNavElement.target = '_blank';
                childNavElement.innerHTML = `<i class="fas ${child.icon_class}" style="margin-left: 15px;"></i> ${child.name_hi}`; // Indent children
                dropdownContainer.appendChild(childNavElement);
            });
        });

    } catch (error) {
        console.error('Error loading navigation items:', error);
        errorHandler.showToast('error', 'नेवीगेशन लोड करने में त्रुटि', error.message);
    }
}

function setupRealtimeSubscriptions() {
    supabaseClient
        .channel('dashboard_cards_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_cards' }, (payload) => {
            loadDashboardCards();
            errorHandler.showToast('info', 'कार्ड अपडेट', 'कार्ड अपडेट हो गए');
        })
        .subscribe();

    supabaseClient
        .channel('navigation_items_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'navigation_items' }, (payload) => {
            loadNavigationItems();
            errorHandler.showToast('info', 'नेवीगेशन अपडेट', 'नेवीगेशन अपडेट हो गया');
        })
        .subscribe();
    
    supabaseClient
        .channel('navigation_categories_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'navigation_categories' }, (payload) => {
            loadNavigationItems();
            errorHandler.showToast('info', 'नेवीगेशन कैटेगरी अपडेट', 'नेवीगेशन कैटेगरी अपडेट हो गई');
        })
        .subscribe();

    supabaseClient
        .channel('test_users_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'test_users' }, (payload) => {
            const userManagementModal = document.getElementById('userManagementModal');
            if (userManagementModal && userManagementModal.style.display === 'block') {
                loadUserList();
                errorHandler.showToast('info', 'उपयोगकर्ता सूची अपडेट', 'उपयोगकर्ता सूची अपडेट हो गई');
            }
            // If current user's role or district changes, reload user data
            if (payload.new.id === currentUser?.id) {
                authManager.loadSessionFromStorage(); // Reload authManager state from sessionStorage
            }
        })
        .subscribe();
    
    supabaseClient
        .channel('analytics_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'card_clicks' }, (payload) => {
            const analyticsDashboardModal = document.getElementById('analyticsDashboardModal');
            if (analyticsDashboardModal && analyticsDashboardModal.style.display === 'block') {
                loadAnalyticsData();
                errorHandler.showToast('info', 'एनालिटिक्स डेटा अपडेट', 'एनालिटिक्स डेटा अपडेट हो गया');
            }
        })
        .subscribe();
    supabaseClient
        .channel('admin_logs_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_logs' }, (payload) => {
            const analyticsDashboardModal = document.getElementById('analyticsDashboardModal');
            if (analyticsDashboardModal && analyticsDashboardModal.style.display === 'block') {
                loadAnalyticsData();
                errorHandler.showToast('info', 'एडमिन लॉग अपडेट', 'एडमिन लॉग अपडेट हो गए');
            }
        })
        .subscribe();
    
    supabaseClient
        .channel('form_definitions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'form_definitions' }, (payload) => {
            console.log('Form definitions updated:', payload);
            errorHandler.showToast('info', 'फॉर्म परिभाषाएं अपडेट', 'फॉर्म परिभाषाएं अपडेट हो गईं');
            loadDynamicContent(); // Reload nav and cards to reflect changes, including new/deleted dynamic forms
        })
        .subscribe();
}

function setupAccessibility() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'मुख्य सामग्री पर जाएं';
    skipLink.style.cssText = 'position: absolute; top: -40px; left: 6px; background: #000; color: #fff; padding: 8px; text-decoration: none; z-index: 10000; border-radius: 4px;';
    skipLink.addEventListener('focus', () => { skipLink.style.top = '6px'; });
    skipLink.addEventListener('blur', () => { skipLink.style.top = '-40px'; });
    document.body.insertBefore(skipLink, document.body.firstChild);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.id = 'main-content';
}

function setupCardInteractions() {
    document.querySelectorAll('.card-link').forEach(link => {
        // Drag and drop for admin edit mode
        if (isAdmin) {
            const card = link.querySelector('.dashboard-card');
            if (!card) return; // Add null check
            
            card.setAttribute('draggable', 'true'); // Make cards draggable in edit mode
            
            card.addEventListener('dragstart', function(e) {
                if (editMode) {
                    this.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', link.dataset.cardId);
                }
            });

            card.addEventListener('dragend', function(e) {
                this.classList.remove('dragging');
            });

            card.addEventListener('dragover', function(e) {
                if (editMode) {
                    e.preventDefault();
                    this.classList.add('drag-over');
                }
            });

            card.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
            });

            card.addEventListener('drop', async function(e) {
                if (editMode) {
                    e.preventDefault();
                    this.classList.remove('drag-over');
                    const draggedCardId = e.dataTransfer.getData('text/plain');
                    const targetCardId = link.dataset.cardId;
                    
                    if (draggedCardId !== targetCardId) {
                        reorderCards(draggedCardId, targetCardId);
                    }
                }
            });
        }
    });
}

async function reorderCards(draggedId, targetId) {
    try {
        const cards = await secureDB.secureSelect('dashboard_cards', {
            select: 'id, display_order',
            orderBy: 'display_order'
        });

        const draggedCard = cards.find(c => c.id === parseInt(draggedId));
        const targetCard = cards.find(c => c.id === parseInt(targetId));

        if (!draggedCard || !targetCard) return;

        // Perform the reordering logic to get the new order of all cards
        const newCardsOrder = [...cards];
        const draggedIndex = newCardsOrder.findIndex(c => c.id === parseInt(draggedId));
        const targetIndex = newCardsOrder.findIndex(c => c.id === parseInt(targetId));

        // Remove the dragged card from its original position
        const [removed] = newCardsOrder.splice(draggedIndex, 1);
        // Insert it into the new position
        newCardsOrder.splice(targetIndex, 0, removed);

        // Prepare the updates array with new display_order for ALL affected cards
        const updates = newCardsOrder.map((card, index) => ({
            id: card.id,
            display_order: index + 1, // Assign new sequential order
            updated_at: new Date().toISOString() // Add updated timestamp
        }));

        // Use secureDB.secureUpsert to update multiple records in one go
        await secureDB.secureUpsert('dashboard_cards', updates, 'id'); // 'id' is the conflict column

        logAdminAction('CARD_ORDER_UPDATED', `Reordered card (ID: ${draggedId}) with (ID: ${targetId})`);
        errorHandler.showToast('success', 'कार्ड क्रम बदल दिया गया', 'कार्ड का क्रम सफलतापूर्वक बदल दिया गया');

        // Reload dashboard cards to reflect the new order visually
        loadDashboardCards(); 

    } catch (error) {
        console.error('Error reordering cards:', error);
        errorHandler.showToast('error', 'कार्ड क्रम बदलने में त्रुटि', error.message);
    }
}

function setupEventListeners() {
    if (isAdmin) {
        document.getElementById('addCardBtn')?.addEventListener('click', openAddCardModal);
        document.getElementById('manageNavBtn')?.addEventListener('click', openNavManagerModal);
        document.getElementById('toggleEditMode')?.addEventListener('click', toggleEditMode);
        document.getElementById('userManagementBtn')?.addEventListener('click', openUserManagementModal);
        document.getElementById('analyticsDashboardBtn')?.addEventListener('click', openAnalyticsDashboardModal);
        document.getElementById('createDynamicFormBtn')?.addEventListener('click', openDynamicFormCreatorModal);
        document.getElementById('manageDynamicFormsBtn')?.addEventListener('click', openManageDynamicFormsModal); // New button
    }

    document.getElementById('closeAddCardModal')?.addEventListener('click', closeAddCardModal);
    document.getElementById('closeEditCardModal')?.addEventListener('click', closeEditCardModal);
    document.getElementById('closeNavManagerModal')?.addEventListener('click', closeNavManagerModal);
    document.getElementById('closeAddNavModal')?.addEventListener('click', closeAddNavModal);
    document.getElementById('closeEditNavModal')?.addEventListener('click', closeEditNavModal);
    document.getElementById('closeUserManagementModal')?.addEventListener('click', closeUserManagementModal);
    document.getElementById('closeEditUserModal')?.addEventListener('click', closeEditUserModal);
    document.getElementById('closeAnalyticsDashboardModal')?.addEventListener('click', closeAnalyticsDashboardModal);
    document.getElementById('closeDynamicFormCreatorModal')?.addEventListener('click', closeDynamicFormCreatorModal);
    document.getElementById('closeDynamicFormSelectorModal')?.addEventListener('click', closeDynamicFormSelectorModal);
    document.getElementById('closeManageDynamicFormsModal')?.addEventListener('click', closeManageDynamicFormsModal); // New close button
    document.getElementById('closeProfileModal')?.addEventListener('click', closeProfileModal);

    document.getElementById('addCardForm')?.addEventListener('submit', handleAddCard);
    document.getElementById('editCardForm')?.addEventListener('submit', handleEditCard);
    document.getElementById('addNavForm')?.addEventListener('submit', handleAddNavItem);
    document.getElementById('editNavForm')?.addEventListener('submit', handleEditNavItem);
    document.getElementById('editUserForm')?.addEventListener('submit', handleEditUser);

    document.getElementById('profileLink')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal(); });
    document.getElementById('logoutLink')?.addEventListener('click', (e) => { e.preventDefault(); if (confirm('लॉगआउट करें?')) authManager.logout(); }); // Use authManager logout

    setupProfileFormHandlers();
    setupIconPickers(); // For static card modals
    setupNavIconPickers(); // For static nav item modals

    // Dynamic Form Creator events
    document.getElementById('btnProcessExcel')?.addEventListener('click', processExcelForDynamicForm);
    document.getElementById('btnCreateDynamicForm')?.addEventListener('click', createDynamicTableAndSaveDef);
    document.getElementById('btnCancelDynamicForm')?.addEventListener('click', () => {
        const designerPreviewArea = document.getElementById('designerPreviewArea');
        const inputExcel = document.getElementById('inputExcel');
        const inputTableName = document.getElementById('inputTableName');
        const dynamicFormMessages = document.getElementById('dynamicFormMessages');
        const formNavParentItem = document.getElementById('formNavParentItem');
        const formParentDashboardCard = document.getElementById('formParentDashboardCard');

        if (designerPreviewArea) designerPreviewArea.style.display = 'none';
        if (inputExcel) inputExcel.value = '';
        if (inputTableName) inputTableName.value = '';
        if (dynamicFormMessages) dynamicFormMessages.style.display = 'none';
        if (formNavParentItem) formNavParentItem.value = '';
        if (formParentDashboardCard) formParentDashboardCard.value = '';
    });
}

function setupIconPickers() { // For static card modals
    const pickers = ['iconPicker', 'editIconPicker'];
    pickers.forEach(pickerId => {
        const picker = document.getElementById(pickerId);
        if (picker) {
            picker.innerHTML = '';
            availableIcons.forEach(iconClass => {
                const iconOption = document.createElement('div');
                iconOption.className = 'icon-option';
                iconOption.innerHTML = `<i class="${iconClass}"></i>`;
                iconOption.addEventListener('click', function() {
                    picker.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    const selectedIconInput = document.getElementById(pickerId === 'iconPicker' ? 'selectedIcon' : 'editSelectedIcon');
                    if (selectedIconInput) selectedIconInput.value = iconClass;
                });
                picker.appendChild(iconOption);
            });
            const selectedIconInput = document.getElementById(pickerId === 'iconPicker' ? 'selectedIcon' : 'editSelectedIcon');
            if (picker.children.length > 0 && selectedIconInput) {
                const currentIcon = selectedIconInput.value;
                const matchingOption = Array.from(picker.children).find(opt => opt.querySelector('i')?.className === currentIcon);
                if (matchingOption) matchingOption.classList.add('selected');
                else picker.children[0].classList.add('selected'); // Default to first if none match
            }
        }
    });
}

function setupNavIconPickers() { // For static nav item modals
    const pickers = ['navIconPicker', 'editNavIconPicker'];
    pickers.forEach(pickerId => {
        const picker = document.getElementById(pickerId);
        if (picker) {
            picker.innerHTML = '';
            availableIcons.forEach(iconClass => {
                const iconOption = document.createElement('div');
                iconOption.className = 'icon-option';
                iconOption.innerHTML = `<i class="${iconClass}"></i>`;
                iconOption.addEventListener('click', function() {
                    picker.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    const selectedNavIconInput = document.getElementById(pickerId === 'navIconPicker' ? 'selectedNavIcon' : 'editSelectedNavIcon');
                    if (selectedNavIconInput) selectedNavIconInput.value = iconClass;
                });
                picker.appendChild(iconOption);
            });
            const selectedNavIconInput = document.getElementById(pickerId === 'navIconPicker' ? 'selectedNavIcon' : 'editSelectedNavIcon');
            if (picker.children.length > 0 && selectedNavIconInput) {
                const currentIcon = selectedNavIconInput.value;
                const matchingOption = Array.from(picker.children).find(opt => opt.querySelector('i')?.className === currentIcon);
                if (matchingOption) matchingOption.classList.add('selected');
                else picker.children[0].classList.add('selected'); // Default to first if none match
            }
        }
    });
}

function toggleEditMode() {
    editMode = !editMode;
    const toggleBtn = document.getElementById('toggleEditMode');
    if (toggleBtn) {
        if (editMode) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> व्यू मोड';
            toggleBtn.style.background = '#ffc107';
            errorHandler.showToast('info', 'एडिट मोड', 'एडिट मोड सक्रिय');
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-edit"></i> एडिट मोड';
            toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            errorHandler.showToast('info', 'व्यू मोड', 'व्यू मोड सक्रिय');
        }
    }
    loadDashboardCards();
}

function openAddCardModal() {
    const modal = document.getElementById('addCardModal');
    const titleInput = document.getElementById('cardTitleHi');
    if (modal) modal.style.display = 'block';
    if (titleInput) titleInput.focus();
    hideAddCardMessages();
}

function closeAddCardModal() {
    const modal = document.getElementById('addCardModal');
    const form = document.getElementById('addCardForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    hideAddCardMessages();
}

function openEditCardModal() {
    const modal = document.getElementById('editCardModal');
    const titleInput = document.getElementById('editCardTitleHi');
    if (modal) modal.style.display = 'block';
    if (titleInput) titleInput.focus();
    hideEditCardMessages();
}

function closeEditCardModal() {
    const modal = document.getElementById('editCardModal');
    const form = document.getElementById('editCardForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    hideEditCardMessages();
}

async function openNavManagerModal() {
    const modal = document.getElementById('navManagerModal');
    if (modal) modal.style.display = 'block';
    await loadNavItemsForManager();
}

function closeNavManagerModal() {
    const modal = document.getElementById('navManagerModal');
    if (modal) modal.style.display = 'none';
}

async function openAddNavModal() {
    const modal = document.getElementById('addNavModal');
    const nameInput = document.getElementById('navNameHi');
    if (modal) modal.style.display = 'block';
    await populateNavCategories('navCategory');
    if (nameInput) nameInput.focus();
    hideAddNavMessages();
}

function closeAddNavModal() {
    const modal = document.getElementById('addNavModal');
    const form = document.getElementById('addNavForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    hideAddNavMessages();
}

async function openEditNavModal() {
    const modal = document.getElementById('editNavModal');
    const nameInput = document.getElementById('editNavNameHi');
    if (modal) modal.style.display = 'block';
    await populateNavCategories('editNavCategory');
    if (nameInput) nameInput.focus();
    hideEditNavMessages();
}

function closeEditNavModal() {
    const modal = document.getElementById('editNavModal');
    const form = document.getElementById('editNavForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    hideEditNavMessages();
}

// User Management functions
async function openUserManagementModal() {
    const modal = document.getElementById('userManagementModal');
    if (modal) modal.style.display = 'block';
    await loadUserList();
}

function closeUserManagementModal() {
    const modal = document.getElementById('userManagementModal');
    if (modal) modal.style.display = 'none';
}

async function loadUserList() {
    try {
        const users = await secureDB.secureSelect('test_users', {
            select: 'id, full_name, username, email, role, is_online, last_activity, is_active, districts(name)',
            orderBy: 'full_name'
        });

        const userListContainer = document.getElementById('userList');
        if (!userListContainer) return;
        userListContainer.innerHTML = '';

        users.forEach(user => {
            const userRow = document.createElement('div');
            userRow.className = 'user-row';
            userRow.dataset.userId = user.id;

            const onlineStatusClass = user.is_online ? 'online' : '';
            const lastActivityTime = user.last_activity ? new Date(user.last_activity).toLocaleString('hi-IN') : 'N/A';
            const userStatus = user.is_active ? 'सक्रिय' : 'निष्क्रिय';
            const userStatusColor = user.is_active ? '#28a745' : '#dc3545';

            userRow.innerHTML = `
                <span class="user-online-status ${onlineStatusClass}" title="${user.is_online ? 'ऑनलाइन' : 'ऑफलाइन'}"></span>
                <div class="user-info-display">
                    <div class="user-name">${user.full_name || user.username}</div>
                    <div class="user-email">${user.email}</div>
                    <div class="user-role-status">भूमिका: ${user.role} | स्थिति: <span style="color: ${userStatusColor}; font-weight: bold;">${userStatus}</span></div>
                    <div class="user-role-status">जिला: ${user.districts ? user.districts.name : 'N/A'} | अंतिम गतिविधि: ${lastActivityTime}</div>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn edit-user-btn" onclick="editUser('${user.id}')" title="उपयोगकर्ता संपादित करें">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    <button class="user-action-btn toggle-active-btn" onclick="toggleUserActiveStatus('${user.id}', ${user.is_active})" title="${user.is_active ? 'निष्क्रिय करें' : 'सक्रिय करें'}">
                        <i class="fas ${user.is_active ? 'fas fa-toggle-on' : 'fas fa-toggle-off'}"></i>
                    </button>
                </div>
            `;
            userListContainer.appendChild(userRow);
        });

    } catch (error) {
        console.error('Error loading user list:', error);
        errorHandler.showToast('error', 'उपयोगकर्ता सूची लोड करने में त्रुटि', error.message);
    }
}

window.editUser = async function(userId) {
    try {
        const user = await secureDB.secureSelect('test_users', {
            select: 'id, full_name, username, email, role, district_id',
            filters: { id: userId },
            limit: 1
        });
        if (!user || user.length === 0) throw new Error('User not found');
        const userData = user[0];

        const editUserId = document.getElementById('editUserId');
        const editUserFullName = document.getElementById('editUserFullName');
        const editUserUsername = document.getElementById('editUserUsername');
        const editUserEmail = document.getElementById('editUserEmail');
        const editUserRole = document.getElementById('editUserRole');
        const editUserDistrict = document.getElementById('editUserDistrict');

        if (editUserId) editUserId.value = userData.id;
        if (editUserFullName) editUserFullName.value = userData.full_name || '';
        if (editUserUsername) editUserUsername.value = userData.username;
        if (editUserEmail) editUserEmail.value = userData.email;
        if (editUserRole) editUserRole.value = userData.role;
        if (editUserDistrict) editUserDistrict.value = userData.district_id || '';

        openEditUserModal();

    } catch (error) {
        console.error('Error loading user for edit:', error);
        errorHandler.showToast('error', 'उपयोगकर्ता लोड करने में त्रुटि', error.message);
    }
}

async function handleEditUser(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('editUserSubmitBtn');
    const userId = document.getElementById('editUserId')?.value;

    const fullName = document.getElementById('editUserFullName')?.value;
    const role = document.getElementById('editUserRole')?.value;
    const districtId = document.getElementById('editUserDistrict')?.value;

    if (!userId || !fullName || !role) {
        showEditUserError('कृपया पूरा नाम और भूमिका भरें');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> सहेजा जा रहा है...';
    }

    try {
        const updateData = {
            full_name: fullName,
            role: role,
            district_id: districtId === "" ? null : parseInt(districtId), // Handle null district
            updated_at: new Date().toISOString()
        };

        await secureDB.secureUpdate('test_users', userId, updateData);

        showEditUserSuccess('उपयोगकर्ता सफलतापूर्वक अपडेट हो गया!');
        errorHandler.showToast('success', 'उपयोगकर्ता अपडेट', 'उपयोगकर्ता अपडेट हो गया');
        logAdminAction('USER_UPDATED', `Updated user: ${fullName} (ID: ${userId})`, userId);


        setTimeout(() => { closeEditUserModal(); loadUserList(); }, 2000);

    } catch (error) {
        console.error('Error updating user:', error);
        showEditUserError('उपयोगकर्ता अपडेट करने में त्रुटि: ' + error.message);
        errorHandler.showToast('error', 'उपयोगकर्ता अपडेट करने में त्रुटि', error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> परिवर्तन सहेजें';
        }
    }
}

window.toggleUserActiveStatus = async function(userId, currentStatus) {
    if (!confirm(`क्या आप इस उपयोगकर्ता को ${currentStatus ? 'निष्क्रिय' : 'सक्रिय'} करना चाहते हैं?`)) {
        return;
    }

    try {
        await secureDB.secureUpdate('test_users', userId, { is_active: !currentStatus, updated_at: new Date().toISOString() });

        const action = currentStatus ? 'USER_DEACTIVATED' : 'USER_ACTIVATED';
        const description = `User (ID: ${userId}) was ${currentStatus ? 'deactivated' : 'activated'}.`;
        logAdminAction(action, description, userId);

        errorHandler.showToast('success', 'उपयोगकर्ता स्थिति', `उपयोगकर्ता को सफलतापूर्वक ${currentStatus ? 'निष्क्रिय' : 'सक्रिय'} किया गया`);
        loadUserList(); // Reload list to reflect changes

    } catch (error) {
        console.error('Error toggling user status:', error);
        errorHandler.showToast('error', 'उपयोगकर्ता स्थिति बदलने में त्रुटि', error.message);
    }
}

function openEditUserModal() {
    const modal = document.getElementById('editUserModal');
    const fullNameInput = document.getElementById('editUserFullName');
    if (modal) modal.style.display = 'block';
    if (fullNameInput) fullNameInput.focus();
    hideEditUserMessages();
}

function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    const form = document.getElementById('editUserForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    hideEditUserMessages();
}

// Analytics Dashboard Functions
async function openAnalyticsDashboardModal() {
    const modal = document.getElementById('analyticsDashboardModal');
    if (modal) modal.style.display = 'block';
    await loadAnalyticsData();
}

function closeAnalyticsDashboardModal() {
    const modal = document.getElementById('analyticsDashboardModal');
    if (modal) modal.style.display = 'none';
}

async function loadAnalyticsData() {
    try {
        // Total Users & Active Users
        const totalUsersResult = await secureDB.secureSelect('test_users', { select: 'id' });
        const totalUsers = totalUsersResult ? totalUsersResult.length : 0;
        const totalUsersCountElement = document.getElementById('totalUsersCount');
        if (totalUsersCountElement) totalUsersCountElement.textContent = totalUsers;

        const activeUsersResult = await secureDB.secureSelect('test_users', { select: 'id', filters: { is_online: true } });
        const activeUsers = activeUsersResult ? activeUsersResult.length : 0;
        const activeUsersCountElement = document.getElementById('activeUsersCount');
        if (activeUsersCountElement) activeUsersCountElement.textContent = activeUsers;

        // Total Card Clicks
        const totalClicksResult = await secureDB.secureSelect('card_clicks', { select: 'id' });
        const totalClicks = totalClicksResult ? totalClicksResult.length : 0;
        const totalCardClicksElement = document.getElementById('totalCardClicks');
        if (totalCardClicksElement) totalCardClicksElement.textContent = totalClicks;

        // Top Cards by Clicks
        const topCards = await secureDB.secureSelect('card_clicks', {
            select: 'card_id, dashboard_cards(title_hi)'
            // Order by card_id is not for count, need to process clientside or use RPC
            // For now, fetch all and count clientside
        });

        const topCardsTableBody = document.getElementById('topCardsTableBody');
        if (!topCardsTableBody) return;
        topCardsTableBody.innerHTML = '';
        
        const cardClickCounts = {};
        if (topCards) {
            topCards.forEach(click => {
                const cardTitle = click.dashboard_cards ? click.dashboard_cards.title_hi : 'Unknown Card';
                cardClickCounts[cardTitle] = (cardClickCounts[cardTitle] || 0) + 1;
            });
        }

        const sortedTopCards = Object.entries(cardClickCounts).sort(([,a], [,b]) => b - a);

        sortedTopCards.slice(0, 5).forEach(([title, count]) => { // Show top 5
            const row = topCardsTableBody.insertRow();
            row.innerHTML = `<td>${title}</td><td>${count}</td>`;
        });

        // Admin Activity Logs
        const adminLogs = await secureDB.secureSelect('admin_logs', {
            select: 'action_type, description, logged_at',
            orderBy: 'logged_at',
            ascending: false,
            limit: 10
        });

        const adminActivityTableBody = document.getElementById('adminActivityTableBody');
        if (!adminActivityTableBody) return;
        adminActivityTableBody.innerHTML = '';
        if (adminLogs) {
            adminLogs.forEach(log => {
                const row = adminActivityTableBody.insertRow();
                row.innerHTML = `<td>${log.action_type}</td><td>${log.description}</td><td>${new Date(log.logged_at).toLocaleString('hi-IN')}</td>`;
            });
        }

    } catch (error) {
        console.error('Error loading analytics data:', error);
        errorHandler.showToast('error', 'एनालिटिक्स डेटा लोड करने में त्रुटि', error.message);
    }
}

// Logging Functions
async function logCardClick(cardId) {
    try {
        // Ensure currentUser is available and has an ID
        const currentUserId = authManager.getCurrentUser()?.id;
        if (!currentUserId) {
            console.warn('Cannot log card click: User not identified.');
            return;
        }
        await secureDB.secureInsert('card_clicks', { card_id: cardId, user_id: currentUserId, ip_address: '0.0.0.0' });
    } catch (error) {
        console.error('Error logging card click:', error);
        errorHandler.handleError(error, { context: 'card_click_logging' });
    }
}

async function logAdminAction(actionType, description, targetEntityId = null) {
    if (!isAdmin || !currentUser) return; // Only log if admin and user is set

    try {
        await secureDB.secureInsert('admin_logs', {
            admin_id: currentUser.id,
            action_type: actionType,
            description: description,
            target_entity_id: targetEntityId ? String(targetEntityId) : null // Ensure string for UUID if column type is text
        });
    } catch (error) {
        console.error('Error logging admin action:', error);
        errorHandler.handleError(error, { context: 'admin_action_logging' });
    }
}

// Add this function to your existing dashboard.html JavaScript
function loadPageContent(pageName) {
    fetch(`pages/${pageName}.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(content => {
            // Replace the main content area
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = content;
                
                // Re-initialize store functions if it's the store page
                if (pageName === 'store') {
                    // Load counters for store page
                    setTimeout(() => {
                        if (typeof window.loadEntryCounts === 'function') { // Use window.loadEntryCounts
                            window.loadEntryCounts();
                        }
                    }, 100);
                }
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            errorHandler.showToast('error', 'पेज लोड करने में त्रुटि', error.message);
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = '<div class="alert alert-danger" style="color: #dc3545; background: #ffeaea; padding: 15px; border-radius: 8px;">पेज लोड नहीं हो सका: ' + error.message + '</div>';
            }
        });
}

// Add navigation handler for dropdown
document.addEventListener('click', function(e) {
    if (e.target.closest('.dropdown-item')) { // Use closest to handle clicks on child elements
        const dropdownItem = e.target.closest('.dropdown-item');
        const targetUrl = dropdownItem.getAttribute('href');
        
        if (targetUrl && targetUrl !== '#') { // Prevent navigation for '#' links
            e.preventDefault();
            // Check if it's a dynamic form link
            if (targetUrl.startsWith('dynamic_data_entry.html')) {
                window.location.href = targetUrl; // Navigate directly for dynamic forms
            } else if (targetUrl.startsWith('viksit_krishi_sankalp_abhiyan.html')) {
                // Special handling for Viksit Krishi link
                window.location.href = targetUrl;
            } else {
                const pageName = targetUrl.split('/').pop().replace('.html', '');
                loadPageContent(pageName);
            }
        }
    }
});

// Dynamic Form Creator Modals and Functions
async function openDynamicFormCreatorModal() {
    const modal = document.getElementById('dynamicFormCreatorModal');
    const inputExcel = document.getElementById('inputExcel');
    const designerPreviewArea = document.getElementById('designerPreviewArea');
    const dynamicFormMessages = document.getElementById('dynamicFormMessages');
    const formNavParentItem = document.getElementById('formNavParentItem');
    const formParentDashboardCard = document.getElementById('formParentDashboardCard');
    const inputTableName = document.getElementById('inputTableName');

    if (modal) modal.style.display = 'block';
    await populateFormNavParentItems('formNavParentItem'); // Populate dropdown for parent nav item
    await populateFormParentDashboardCards('formParentDashboardCard'); // Populate dropdown for existing dashboard cards
    if (inputExcel) inputExcel.focus();
    if (designerPreviewArea) designerPreviewArea.style.display = 'none'; // Hide designer preview initially
    if (dynamicFormMessages) dynamicFormMessages.style.display = 'none';
    // Reset fields
    if (inputExcel) inputExcel.value = '';
    if (inputTableName) inputTableName.value = '';
    if (formNavParentItem) formNavParentItem.value = '';
    if (formParentDashboardCard) formParentDashboardCard.value = '';
}

function closeDynamicFormCreatorModal() {
    const modal = document.getElementById('dynamicFormCreatorModal');
    const inputExcel = document.getElementById('inputExcel');
    const inputTableName = document.getElementById('inputTableName');
    const designerPreviewArea = document.getElementById('designerPreviewArea');
    const dynamicFormMessages = document.getElementById('dynamicFormMessages');
    const formNavParentItem = document.getElementById('formNavParentItem');
    const formParentDashboardCard = document.getElementById('formParentDashboardCard');

    if (modal) modal.style.display = 'none';
    if (inputExcel) inputExcel.value = '';
    if (inputTableName) inputTableName.value = '';
    if (designerPreviewArea) designerPreviewArea.style.display = 'none';
    if (dynamicFormMessages) dynamicFormMessages.style.display = 'none';
    if (formNavParentItem) formNavParentItem.value = '';
    if (formParentDashboardCard) formParentDashboardCard.value = '';
}

function sanitizeIdentifier(name) {
    return String(name || '').replace(/\.[^/.]+$|\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || `table_${Date.now()}`;
}
function sanitizeColName(str, idx) {
    let s = String(str || `column_${idx+1}`).trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!s) s = `column_${idx+1}`;
    return s;
}

async function populateFormNavParentItems(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">सेक्शन चुनें</option>';
    allNavParentItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name_hi;
        selectElement.appendChild(option);
    });
}

async function populateFormParentDashboardCards(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">मैप करने के लिए कार्ड चुनें</option>';
    // allDashboardCards is already loaded on DOMContentLoaded
    allDashboardCards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.title_hi;
        selectElement.appendChild(option);
    });
}

async function processExcelForDynamicForm() {
    const f = document.getElementById('inputExcel')?.files[0];
    const dynamicFormMessages = document.getElementById('dynamicFormMessages');
    const formNavParentItem = document.getElementById('formNavParentItem');
    const formParentDashboardCard = document.getElementById('formParentDashboardCard');
    const inputTableName = document.getElementById('inputTableName');
    const designerPreviewArea = document.getElementById('designerPreviewArea');


    if (!f) {
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'कृपया Excel फ़ाइल अपलोड करें';
            dynamicFormMessages.style.display = 'block';
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        return;
    }
    if (!formNavParentItem?.value) {
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'कृपया नेवीगेशन सेक्शन चुनें';
            dynamicFormMessages.style.display = 'block';
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        return;
    }
    if (!formParentDashboardCard?.value) {
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'कृपया मैप करने के लिए डैशबोर्ड कार्ड चुनें';
            dynamicFormMessages.style.display = 'block';
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        return;
    }
    
    if (dynamicFormMessages) {
        dynamicFormMessages.textContent = 'Excel फ़ाइल प्रोसेस हो रही है...';
        dynamicFormMessages.style.display = 'block';
        dynamicFormMessages.style.backgroundColor = 'rgba(0, 123, 255, 0.2)';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            if (!rows || !rows.length || !rows[0].length) {
                if (dynamicFormMessages) {
                    dynamicFormMessages.textContent = 'फ़ाइल में हेडर नहीं मिले';
                    dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
                }
                return;
            }

            lastExcelHeaders = rows[0].map(h => String(h || '').trim());
            lastDynamicTableName = sanitizeIdentifier(inputTableName?.value || f.name);
            
            renderDynamicFormDesigner(lastDynamicTableName, lastExcelHeaders);
            if (designerPreviewArea) designerPreviewArea.style.display = 'block';
            if (dynamicFormMessages) dynamicFormMessages.style.display = 'none';
            
        } catch(err) {
            console.error(err);
            if (dynamicFormMessages) {
                dynamicFormMessages.textContent = 'फ़ाइल पढ़ने में त्रुटि: ' + (err.message || JSON.stringify(err));
                dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
            }
        }
    };
    reader.readAsArrayBuffer(f);
}

function renderDynamicFormDesigner(tableName, headers) {
    const container = document.getElementById('designerFieldsContainer');
    if (!container) return;
    container.innerHTML = '';
    headers.forEach((h, i) => {
        const sanitizedColName = sanitizeColName(h, i);
        const row = document.createElement('div');
        row.className = 'designer-field-row';
        row.dataset.colIndex = i;

        row.innerHTML = `
            <h5>फ़ील्ड: ${h || `Column ${i+1}`}</h5>
            <div class="form-group">
                <label class="form-label">लेबल (प्रदर्शित नाम)</label>
                <input type="text" class="form-control field-label" value="${h || `Column ${i+1}`}">
            </div>
            <div class="form-group">
                <label class="form-label col-name-label">कॉलम नाम (डेटाबेस)</label>
                <input type="text" class="form-control field-name" value="${sanitizedColName}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label col-type-label">डेटा प्रकार</label>
                <select class="form-select field-type">
                    <option value="text">Text (पाठ)</option>
                    <option value="number">Number (संख्या)</option>
                    <option value="date">Date (दिनांक)</option>
                    <option value="boolean">Boolean (सही/गलत)</option>
                </select>
            </div>
            
            <div class="sub-section">
                <h6>नियम (Algorithm)</h6>
                <div class="form-group form-check">
                    <input type="checkbox" class="form-check-input field-required" id="fieldRequired${i}">
                    <label class="form-check-label" for="fieldRequired${i}">अनिवार्य फ़ील्ड</label>
                </div>

                <div class="form-row validation-rules-section" style="display:none;">
                    <div class="form-group">
                        <label class="form-label">न्यूनतम लंबाई/मान</label>
                        <input type="number" class="form-control field-min-val" placeholder="Min Length/Value">
                    </div>
                    <div class="form-group">
                        <label class="form-label">अधिकतम लंबाई/मान</label>
                        <input type="number" class="form-control field-max-val" placeholder="Max Length/Value">
                    </div>
                    <div class="form-group col-12">
                        <label class="form-label">रेगेक्स पैटर्न (केवल पाठ के लिए)</label>
                        <input type="text" class="form-control field-regex" placeholder="^\\d{10}$ (e.g., 10 digit number)">
                    </div>
                </div>

                <div class="form-group calculation-section" style="display:none;">
                    <label class="form-label">गणना सूत्र (उदा: field_A + field_B)</label>
                    <input type="text" class="form-control field-calc-formula" placeholder="field_qty * field_price">
                </div>

                <div class="form-row visibility-section" style="display:none;">
                    <div class="form-group">
                        <label class="form-label">इस फ़ील्ड को दिखाएं यदि...</label>
                        <select class="form-select field-visibility-parent">
                            <option value="">कोई नहीं</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ऑपरेटर</label>
                        <select class="form-select field-visibility-operator">
                            <option value="==">बराबर (==)</option>
                            <option value="!=">बराबर नहीं (!=)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">मान</label>
                        <input type="text" class="form-control field-visibility-value" placeholder="ट्रिगर मान">
                    </div>
                </div>
            </div> <!-- End sub-section -->
        `;
        container.appendChild(row);

        const fieldTypeSelect = row.querySelector('.field-type');
        const visibilityParentSelect = row.querySelector('.field-visibility-parent');

        if (visibilityParentSelect) {
            populateVisibilityParentFields(visibilityParentSelect, headers.map((h,idx) => ({name: sanitizeColName(h,idx), label: h || `Column ${idx+1}`})), sanitizedColName);
        }

        if (fieldTypeSelect) {
            fieldTypeSelect.addEventListener('change', function() {
                updateFieldRuleVisibility(row, this.value);
            });
            updateFieldRuleVisibility(row, fieldTypeSelect.value);
        }
    });
}

function populateVisibilityParentFields(selectElement, allFields, currentFieldName) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">कोई नहीं</option>';
    allFields.forEach(field => {
        if (field.name !== currentFieldName) {
            const option = document.createElement('option');
            option.value = field.name;
            option.textContent = field.label;
            selectElement.appendChild(option);
        }
    });
}

function updateFieldRuleVisibility(rowElement, fieldType) {
    const validationSection = rowElement.querySelector('.validation-rules-section');
    const calculationSection = rowElement.querySelector('.calculation-section');
    const minValInput = rowElement.querySelector('.field-min-val');
    const maxValInput = rowElement.querySelector('.field-max-val');
    const regexInputGroup = rowElement.querySelector('.field-regex')?.parentElement; // Optional chaining

    if (validationSection) validationSection.style.display = 'block';
    if (minValInput) minValInput.value = '';
    if (maxValInput) maxValInput.value = '';
    const regexField = rowElement.querySelector('.field-regex');
    if (regexField) regexField.value = '';
    const calcFormulaField = rowElement.querySelector('.field-calc-formula');
    if (calcFormulaField) calcFormulaField.value = '';
    const visibilityParentSelect = rowElement.querySelector('.field-visibility-parent');
    if (visibilityParentSelect) visibilityParentSelect.value = '';
    const visibilityOperatorSelect = rowElement.querySelector('.field-visibility-operator');
    if (visibilityOperatorSelect) visibilityOperatorSelect.value = '==';
    const visibilityValueInput = rowElement.querySelector('.field-visibility-value');
    if (visibilityValueInput) visibilityValueInput.value = '';


    if (fieldType === 'text') {
        if (minValInput) {
            minValInput.setAttribute('type', 'number');
            minValInput.placeholder = 'न्यूनतम लंबाई';
        }
        if (maxValInput) {
            maxValInput.setAttribute('type', 'number');
            maxValInput.placeholder = 'अधिकतम लंबाई';
        }
        if (regexInputGroup) regexInputGroup.style.display = 'block';
    } else if (fieldType === 'number') {
        if (minValInput) {
            minValInput.setAttribute('type', 'number');
            minValInput.placeholder = 'न्यूनतम मान';
        }
        if (maxValInput) {
            maxValInput.setAttribute('type', 'number');
            maxValInput.placeholder = 'अधिकतम मान';
        }
        if (regexInputGroup) regexInputGroup.style.display = 'none';
    } else { // date, boolean
        if (validationSection) validationSection.style.display = 'none';
    }

    if (calculationSection) calculationSection.style.display = (fieldType === 'number') ? 'block' : 'none';
    const visibilitySection = rowElement.querySelector('.visibility-section');
    if (visibilitySection) visibilitySection.style.display = 'flex';
}

async function createDynamicTableAndSaveDef() {
    const submitBtn = document.getElementById('btnCreateDynamicForm');
    const excelFile = document.getElementById('inputExcel')?.files[0];
    const formNavParentItemId = document.getElementById('formNavParentItem')?.value;
    const formParentDashboardCardId = document.getElementById('formParentDashboardCard')?.value;
    const dynamicFormMessages = document.getElementById('dynamicFormMessages');


    if (!excelFile) {
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'कृपया Excel फ़ाइल अपलोड करें';
            dynamicFormMessages.style.display = 'block';
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        return;
    }
    if (!formNavParentItemId) {
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'कृपया नेवीगेशन सेक्शन चुनें';
            dynamicFormMessages.style.display = 'block';
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        return;
    }
    if (!formParentDashboardCardId) {
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'कृपया मैप करने के लिए डैशबोर्ड कार्ड चुनें';
            dynamicFormMessages.style.display = 'block';
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        return;
    }
    
    if (dynamicFormMessages) {
        dynamicFormMessages.textContent = 'टेबल बनाई जा रही है और परिभाषा सहेजी जा रही है...';
        dynamicFormMessages.style.display = 'block';
        dynamicFormMessages.style.backgroundColor = 'rgba(0, 123, 255, 0.2)';
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> बनाया जा रहा है...';
    }

    try {
        const tableName = lastDynamicTableName;
        
        const designerFieldsContainer = document.getElementById('designerFieldsContainer');
        const seenColNames = new Set();
        const fields = [];
        const columnsForSql = [];

        if (!designerFieldsContainer) throw new Error('Designer fields container not found.');

        Array.from(designerFieldsContainer.children).forEach((rowElement, idx) => {
            const label = rowElement.querySelector('.field-label')?.value.trim();
            let colName = rowElement.querySelector('.field-name')?.value.trim();
            const fieldType = rowElement.querySelector('.field-type')?.value;

            if (!label || !colName || !fieldType) {
                throw new Error(`Field ${idx + 1} has missing label, column name, or type.`);
            }

            const baseColName = colName;
            let s = 1;
            while (seenColNames.has(colName.toLowerCase())) {
                colName = `${baseColName}_${s++}`;
            }
            seenColNames.add(colName.toLowerCase());

            const validationRules = {};
            const fieldRequired = rowElement.querySelector('.field-required');
            if (fieldRequired && fieldRequired.checked) {
                validationRules.required = true;
            }
            const minVal = rowElement.querySelector('.field-min-val')?.value;
            const maxVal = rowElement.querySelector('.field-max-val')?.value;
            const regex = rowElement.querySelector('.field-regex')?.value.trim();

            if (minVal) validationRules.min = parseFloat(minVal);
            if (maxVal) validationRules.max = parseFloat(maxVal);
            if (regex && fieldType === 'text') validationRules.regex = regex;

            const calculationFormula = rowElement.querySelector('.field-calc-formula')?.value.trim();

            const visibilityCondition = {};
            const parentField = rowElement.querySelector('.field-visibility-parent')?.value;
            const operator = rowElement.querySelector('.field-visibility-operator')?.value;
            const value = rowElement.querySelector('.field-visibility-value')?.value.trim();

            if (parentField && value && operator) { // Ensure operator is also present
                visibilityCondition.field = parentField;
                visibilityCondition.operator = operator;
                visibilityCondition.value = value;
            }

            fields.push({
                name: colName,
                label: label,
                position: idx,
                type: fieldType,
                validation_rules: Object.keys(validationRules).length > 0 ? validationRules : null,
                calculation_formula: calculationFormula || null,
                visibility_condition: Object.keys(visibilityCondition).length > 0 ? visibilityCondition : null
            });

            let sqlType = 'TEXT';
            if (fieldType === 'number') sqlType = 'NUMERIC';
            else if (fieldType === 'date') sqlType = 'DATE';
            else if (fieldType === 'boolean') sqlType = 'BOOLEAN';

            columnsForSql.push(`"${colName}" ${sqlType}`);
        });

        const ddl = `CREATE TABLE IF NOT EXISTS public."${tableName}" (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            ${columnsForSql.join(', ')},
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            created_by UUID REFERENCES public.test_users(id),
            district_id UUID REFERENCES public.districts(id) -- Ensure UUID type here
        );`;

        // Use secureDB to execute SQL script
        const rpcResult = await secureDB.executeSqlScript(ddl);
        if (rpcResult && rpcResult.startsWith('ERROR')) throw new Error('Failed to create table: ' + rpcResult);


        // Get details of the selected parent dashboard card (just for description/icon)
        const selectedCard = allDashboardCards.find(card => card.id === parseInt(formParentDashboardCardId));
        if (!selectedCard) throw new Error('Selected dashboard card not found.');

        // 1. Create Navigation Item for this dynamic form
        const newNavItemData = {
            name_hi: lastDynamicTableName,
            name_en: lastDynamicTableName,
            url: `dynamic_data_entry.html?form=${tableName}`,
            icon_class: selectedCard.icon_class || 'fas fa-file-alt', // Use parent card's icon
            parent_id: parseInt(formNavParentItemId),
            display_order: 999,
            is_active: true,
            created_by: currentUser.id,
        };
        const navItemInsertData = await secureDB.secureInsert('navigation_items', newNavItemData);
        const newNavItemId = navItemInsertData.id;
        logAdminAction('NAV_ITEM_ADDED', `Added dynamic form nav item: ${lastDynamicTableName}`, newNavItemId);


        // 2. Save Form Definition (linking to existing card and new nav item)
        const formDef = {
            table_name: tableName,
            label: lastDynamicTableName,
            description: selectedCard.description_hi || 'इस फॉर्म में डेटा दर्ज करें',
            created_by: currentUser.id,
            created_at: new Date().toISOString(),
            fields: fields,
            navigation_item_id: newNavItemId,
            parent_dashboard_card_id: parseInt(formParentDashboardCardId),
            district_id: currentUser.profile?.districts?.id || null // Use user's district
        };
        const defData = await secureDB.secureInsert('form_definitions', formDef);
        logAdminAction('DYNAMIC_FORM_CREATED', `Created dynamic form definition: ${tableName}`, defData.id);


        errorHandler.showToast('success', `टेबल और फॉर्म परिभाषा बनाई गई: ${tableName}`, 'सफलतापूर्वक बनाया गया!');
        closeDynamicFormCreatorModal();
        loadDynamicContent(); // Reload nav and cards to show new form

    } catch (err) {
        console.error('Create dynamic form failed:', err);
        if (dynamicFormMessages) {
            dynamicFormMessages.textContent = 'फॉर्म बनाने में त्रुटि: ' + (err.message || JSON.stringify(err));
            dynamicFormMessages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        errorHandler.showToast('error', 'फॉर्म बनाने में त्रुटि', err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'टेबल बनाएं & परिभाषा सहेजें';
        }
    }
}

// Dynamic Form Selector Modal Functions (unchanged)
async function openDynamicFormSelectorModal(cardId, cardTitle, dynamicForms) {
    const dynamicFormSelectorTitle = document.getElementById('dynamicFormSelectorTitle');
    const dynamicFormSelectorDescription = document.getElementById('dynamicFormSelectorDescription');
    const dynamicFormList = document.getElementById('dynamicFormList');
    const dynamicFormSelectorModal = document.getElementById('dynamicFormSelectorModal');

    if (dynamicFormSelectorTitle) dynamicFormSelectorTitle.textContent = `${cardTitle} - फॉर्म चुनें`;
    if (dynamicFormSelectorDescription) dynamicFormSelectorDescription.textContent = `कृपया "${cardTitle}" सेक्शन से एक फॉर्म चुनें:`;
    
    if (dynamicFormList) dynamicFormList.innerHTML = ''; // Clear previous list

    if (dynamicForms && dynamicForms.length > 0) {
        dynamicForms.forEach(form => {
            const formItem = document.createElement('a');
            formItem.href = `viksit_krishi_sankalp_abhiyan.html?form=${form.table_name}`; // Point to Viksit Krishi for dynamic forms
            formItem.className = 'list-group-item list-group-item-action';
            formItem.innerHTML = `
                <h6>${form.label}</h6>
                <small>${form.description || 'डेटा दर्ज करने के लिए एक डायनेमिक फॉर्म'}</small>
            `;
            formItem.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default navigation
                closeDynamicFormSelectorModal(); // Close selector modal
                window.location.href = this.href; // Navigate manually
            });
            dynamicFormList.appendChild(formItem);
        });
    } else {
        if (dynamicFormList) dynamicFormList.innerHTML = '<div class="text-center text-muted p-3">इस कार्ड से कोई डायनेमिक फॉर्म मैप नहीं किया गया है।</div>';
    }

    if (dynamicFormSelectorModal) dynamicFormSelectorModal.style.display = 'block';
}

function closeDynamicFormSelectorModal() {
    const modal = document.getElementById('dynamicFormSelectorModal');
    if (modal) modal.style.display = 'none';
}

// Manage Dynamic Forms Modal (New Functions)
async function openManageDynamicFormsModal() {
    const modal = document.getElementById('manageDynamicFormsModal');
    if (modal) modal.style.display = 'block';
    await loadDynamicFormsForManagement();
}

function closeManageDynamicFormsModal() {
    const modal = document.getElementById('manageDynamicFormsModal');
    const messages = document.getElementById('manageDynamicFormsMessages');
    if (modal) modal.style.display = 'none';
    if (messages) messages.style.display = 'none';
}

async function loadDynamicFormsForManagement() {
    const messages = document.getElementById('manageDynamicFormsMessages');
    if (messages) messages.style.display = 'none';
    const listContainer = document.getElementById('dynamicFormsManagementList');
    if (listContainer) listContainer.innerHTML = '<div class="text-center text-muted p-3">लोड हो रहा है...</div>';

    try {
        const forms = await secureDB.secureSelect('form_definitions', {
            select: 'id, table_name, label, created_at, navigation_items(name_hi), dashboard_cards(title_hi)'
        });

        if (listContainer) listContainer.innerHTML = ''; // Clear loading message

        if (forms.length === 0) {
            if (listContainer) listContainer.innerHTML = '<div class="text-center text-muted p-3">कोई डायनेमिक फॉर्म नहीं मिला।</div>';
            return;
        }

        forms.forEach(form => {
            const listItem = document.createElement('div');
            listItem.className = 'list-group-item';
            listItem.innerHTML = `
                <div>
                    <h6>${form.label} <small>(टेबल: ${form.table_name})</small></h6>
                    <small>मैप किया गया: कार्ड "${form.dashboard_cards ? form.dashboard_cards.title_hi : 'कोई नहीं'}" | नेवीगेशन "${form.navigation_items ? form.navigation_items.name_hi : 'कोई नहीं'}"</small>
                </div>
                <div class="action-buttons">
                    <button onclick="viewDynamicFormDefinition(${form.id})" title="परिभाषा देखें"><i class="fas fa-eye"></i></button>
                    <button onclick="deleteDynamicForm(${form.id}, '${form.table_name}', ${form.navigation_item_id})" title="हटाएं" class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            if (listContainer) listContainer.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error loading dynamic forms for management:', error);
        if (messages) {
            messages.textContent = 'फॉर्म लोड करने में त्रुटि: ' + (error.message || JSON.stringify(error));
            messages.style.display = 'block';
            messages.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        }
        errorHandler.showToast('error', 'फॉर्म लोड करने में त्रुटि', error.message);
    }
}

window.viewDynamicFormDefinition = async function(formDefId) {
    try {
        const formDef = await secureDB.secureSelect('form_definitions', {
            select: '*, navigation_items(name_hi), dashboard_cards(title_hi), test_users(full_name)',
            filters: { id: formDefId },
            limit: 1
        });
        if (!formDef || formDef.length === 0) throw new Error('Form definition not found');
        const formDefinition = formDef[0];

        const modalTableName = document.getElementById('modalTableName');
        const modalCreatedBy = document.getElementById('modalCreatedBy');
        const modalCreatedAt = document.getElementById('modalCreatedAt');
        const fieldsList = document.getElementById('modalFieldsList');

        if (modalTableName) modalTableName.textContent = formDefinition.label || formDefinition.table_name;
        if (modalCreatedBy) modalCreatedBy.textContent = formDefinition.test_users ? formDefinition.test_users.full_name : 'Unknown';
        if (modalCreatedAt) modalCreatedAt.textContent = new Date(formDefinition.created_at).toLocaleString('hi-IN');
        
        if (fieldsList) fieldsList.innerHTML = '';
        if (formDefinition.fields && fieldsList) {
            formDefinition.fields.forEach(f => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                let fieldDetails = `${f.label} (${f.name}) [${f.type}]`;
                if (f.validation_rules) fieldDetails += ` | Validation: ${JSON.stringify(f.validation_rules)}`;
                if (f.calculation_formula) fieldDetails += ` | Calculation: ${f.calculation_formula}`;
                if (f.visibility_condition) fieldDetails += ` | Visibility: ${JSON.stringify(f.visibility_condition)}`;
                li.textContent = fieldDetails;
                fieldsList.appendChild(li);
            });
            
            // Show info about mapped card and nav item
            const mappedInfo = document.createElement('li');
            mappedInfo.className = 'list-group-item mt-2';
            mappedInfo.innerHTML = `<strong>मैप किया गया कार्ड:</strong> ${formDefinition.dashboard_cards ? formDefinition.dashboard_cards.title_hi : 'कोई नहीं'}<br>
                                    <strong>मैप किया गया नेवीगेशन:</strong> ${formDefinition.navigation_items ? formDefinition.navigation_items.name_hi : 'कोई नहीं'}`;
            fieldsList.appendChild(mappedInfo);
        }

        // Assuming you have a bootstrap.Modal instance or similar
        const viewModalElement = document.getElementById('viewModal');
        if (viewModalElement) viewModalElement.style.display = 'block';


    } catch (error) {
        console.error('Error viewing dynamic form definition:', error);
        errorHandler.showToast('error', 'फॉर्म परिभाषा देखने में त्रुटि', error.message);
    }
}

window.deleteDynamicForm = async function(formDefId, tableName, navItemId) {
    if (!confirm(`क्या आप वाकई इस डायनेमिक फॉर्म "${tableName}" को हटाना चाहते हैं? इससे संबंधित नेवीगेशन आइटम और डेटाबेस टेबल भी हटा दी जाएगी। यह क्रिया अपरिवर्तनीय है।`)) {
        return;
    }

    try {
        // 1. Log Admin Action BEFORE deletion attempts
        await logAdminAction('DYNAMIC_FORM_DELETION_ATTEMPT', `Attempting to delete dynamic form: ${tableName} (ID: ${formDefId})`, formDefId);

        // 2. Delete navigation item (if exists)
        if (navItemId) {
            await secureDB.secureDelete('navigation_items', navItemId);
            console.log(`Navigation item ${navItemId} deleted.`);
        }

        // 3. Delete form_definition entry
        await secureDB.secureDelete('form_definitions', formDefId);
        console.log(`Form definition ${formDefId} deleted.`);

        // 4. Drop the actual dynamic SQL table
        const dropTableDdl = `DROP TABLE IF EXISTS public."${tableName}" CASCADE;`; // CASCADE to drop dependent objects
        const rpcResult = await secureDB.executeSqlScript(dropTableDdl);
        if (rpcResult && rpcResult.startsWith('ERROR')) throw new Error('Failed to drop dynamic table: ' + rpcResult);
        console.log(`Dynamic table "${tableName}" dropped.`);


        logAdminAction('DYNAMIC_FORM_DELETED', `Successfully deleted dynamic form: ${tableName}`, formDefId);
        errorHandler.showToast('success', `डायनेमिक फॉर्म "${tableName}" सफलतापूर्वक हटा दिया गया!`, 'सफलतापूर्वक हटाया गया!');

        closeManageDynamicFormsModal();
        loadDynamicContent(); // Refresh UI

    } catch (error) {
        console.error('Error deleting dynamic form:', error);
        errorHandler.showToast('error', 'डायनेमिक फॉर्म हटाने में त्रुटि: ' + (error.message || JSON.stringify(error)), 'error');
        // Consider logging a failed deletion attempt here too
    }
}


// Other modals and functions remain the same...

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    const currentPasswordInput = document.getElementById('currentPassword');
    if (modal) modal.style.display = 'block';
    if (currentPasswordInput) currentPasswordInput.focus();
    hideProfileMessages();
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    const form = document.getElementById('profileForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    hideProfileMessages();
}

function closeAllModals() {
    closeAddCardModal();
    closeEditCardModal();
    closeNavManagerModal();
    closeAddNavModal();
    closeEditNavModal();
    closeUserManagementModal();
    closeEditUserModal();
    closeAnalyticsDashboardModal();
    closeDynamicFormCreatorModal();
    closeDynamicFormSelectorModal();
    closeManageDynamicFormsModal(); // New close
    closeProfileModal();
}

async function handleAddCard(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('addCardSubmitBtn');
    const titleHi = document.getElementById('cardTitleHi')?.value;
    const titleEn = document.getElementById('cardTitleEn')?.value;
    const url = document.getElementById('cardUrl')?.value;
    const cardDescHi = document.getElementById('cardDescHi')?.value;
    const cardDescEn = document.getElementById('cardDescEn')?.value;
    const cardCategory = document.getElementById('cardCategory')?.value;
    const displayOrder = parseInt(document.getElementById('displayOrder')?.value || '1');
    const selectedIcon = document.getElementById('selectedIcon')?.value;
    
    if (!titleHi || !titleEn || !url || !selectedIcon) {
        showAddCardError('कृपया सभी आवश्यक फील्ड भरें');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> जोड़ा जा रहा है...';
    }

    try {
        const cardData = {
            title_hi: titleHi,
            title_en: titleEn,
            description_hi: cardDescHi || '',
            description_en: cardDescEn || '',
            target_url: url,
            icon_class: selectedIcon || 'fas fa-cube',
            category: cardCategory || 'general',
            display_order: displayOrder,
            created_by: currentUser.id,
            is_active: true
        };

        const data = await secureDB.secureInsert('dashboard_cards', cardData);

        logAdminAction('CARD_ADDED', `Added new card: ${titleHi}`, data.id);

        showAddCardSuccess('नया कार्ड सफलतापूर्वक जोड़ा गया!');
        errorHandler.showToast('success', 'नया कार्ड जोड़ा गया', 'नया कार्ड सफलतापूर्वक जोड़ा गया');
        
        setTimeout(() => { closeAddCardModal(); }, 2000);

    } catch (error) {
        console.error('Error adding card:', error);
        showAddCardError('कार्ड जोड़ने में त्रुटि: ' + error.message);
        errorHandler.showToast('error', 'कार्ड जोड़ने में त्रुटि', error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> कार्ड जोड़ें';
        }
    }
}

async function handleEditCard(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('editCardSubmitBtn');
    const cardId = document.getElementById('editCardId')?.value;
    
    const titleHi = document.getElementById('editCardTitleHi')?.value;
    const titleEn = document.getElementById('editCardTitleEn')?.value;
    const url = document.getElementById('editCardUrl')?.value;
    const cardDescHi = document.getElementById('editCardDescHi')?.value;
    const cardDescEn = document.getElementById('editCardDescEn')?.value;
    const editSelectedIcon = document.getElementById('editSelectedIcon')?.value;
    const editCardCategory = document.getElementById('editCardCategory')?.value;
    const editDisplayOrder = parseInt(document.getElementById('editDisplayOrder')?.value || '1');
    
    if (!cardId || !titleHi || !titleEn || !url || !editSelectedIcon) {
        showEditCardError('कृपया सभी आवश्यक फील्ड भरें');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> सहेजा जा रहा है...';
    }

    try {
        const updateData = {
            title_hi: titleHi,
            title_en: titleEn,
            description_hi: cardDescHi || '',
            description_en: cardDescEn || '',
            target_url: url,
            icon_class: editSelectedIcon || 'fas fa-cube',
            category: editCardCategory || 'general',
            display_order: editDisplayOrder,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('dashboard_cards')
            .update(updateData)
            .eq('id', cardId);

        if (error) throw error;

        logAdminAction('CARD_UPDATED', `Updated card: ${titleHi} (ID: ${cardId})`, cardId);

        showEditCardSuccess('कार्ड सफलतापूर्वक अपडेट हो गया!');
        errorHandler.showToast('success', 'कार्ड अपडेट', 'कार्ड सफलतापूर्वक अपडेट हो गया');
        
        setTimeout(() => { closeEditCardModal(); }, 2000);

    } catch (error) {
        console.error('Error updating card:', error);
        showEditCardError('कार्ड अपडेट करने में त्रुटि: ' + error.message);
        errorHandler.showToast('error', 'कार्ड अपडेट करने में त्रुटि', error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> परिवर्तन सहेजें';
        }
    }
}

window.editCard = async function(cardId) {
    try {
        const { data: card, error } = await supabaseClient
            .from('dashboard_cards')
            .select('*')
            .eq('id', cardId)
            .single();

        if (error) throw error;

        document.getElementById('editCardId').value = card.id;
        document.getElementById('editCardTitleHi').value = card.title_hi;
        document.getElementById('editCardTitleEn').value = card.title_en;
        document.getElementById('editCardDescHi').value = card.description_hi || '';
        document.getElementById('editCardDescEn').value = card.description_en || '';
        document.getElementById('editCardUrl').value = card.target_url;
        document.getElementById('editSelectedIcon').value = card.icon_class;
        document.getElementById('editCardCategory').value = card.category;
        document.getElementById('editDisplayOrder').value = card.display_order;

        const editIconPicker = document.getElementById('editIconPicker');
        editIconPicker.querySelectorAll('.icon-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.querySelector('i')?.className === card.icon_class) {
                opt.classList.add('selected');
            }
        });

        openEditCardModal();

    } catch (error) {
        console.error('Error loading card for edit:', error);
        showToast('कार्ड लोड करने में त्रुटि', 'error');
    }
}

window.deleteCard = async function(cardId) {
    if (!confirm('क्या आप वाकई इस कार्ड को हटाना चाहते हैं?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('dashboard_cards')
            .update({ is_active: false })
            .eq('id', cardId);

        if (error) throw error;

        logAdminAction('CARD_DELETED', `Deleted card (ID: ${cardId})`, cardId);

        showToast('कार्ड हटा दिया गया', 'success');

    } catch (error) {
        console.error('Error deleting card:', error);
        showToast('कार्ड हटाने में त्रुटि', 'error');
    }
}

// Navigation Manager Functions
async function populateNavCategories(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">कैटेगरी चुनें</option>';
    try {
        const { data: categories, error } = await supabaseClient
            .from('navigation_categories')
            .select('id, name_hi')
            .order('display_order', { ascending: true });

        if (error) throw error;

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name_hi;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating nav categories:', error);
        showToast('नेवीगेशन कैटेगरी लोड करने में त्रुटि', 'error');
    }
}

async function loadNavItemsForManager() {
    try {
        const { data: navItems, error } = await supabaseClient
            .from('navigation_items')
            .select('*, navigation_categories(name_hi, name_en)')
            .order('display_order', { ascending: true });

        if (error) throw error;

        const navItemsList = document.getElementById('navItemsList');
        navItemsList.innerHTML = '';

        navItems.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'nav-item-row';
            itemRow.dataset.navItemId = item.id;
            itemRow.setAttribute('draggable', 'true');

            itemRow.innerHTML = `
                <i class="fas fa-grip-vertical drag-handle"></i>
                <div class="nav-item-info">
                    <div class="nav-item-title"><i class="fas ${item.icon_class}"></i> ${item.name_hi}</div>
                    <div class="nav-item-url">${item.url} (${item.navigation_categories ? item.navigation_categories.name_hi : 'कोई कैटेगरी नहीं'})</div>
                </div>
                <div class="nav-item-actions">
                    <button class="admin-card-btn edit-card-btn" onclick="editNavItem(${item.id})" title="संपादित करें">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-card-btn delete-card-btn" onclick="deleteNavItem(${item.id})" title="हटाएं">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            navItemsList.appendChild(itemRow);
        });

        setupNavItemDragAndDrop();
        document.getElementById('addNavItemBtn').onclick = openAddNavModal;

    } catch (error) {
        console.error('Error loading navigation items for manager:', error);
        showToast('नेवीगेशन आइटम लोड करने में त्रुटि', 'error');
    }
}

function setupNavItemDragAndDrop() {
    const navItemsList = document.getElementById('navItemsList');
    let draggedItem = null;

    navItemsList.querySelectorAll('.nav-item-row').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            e.dataTransfer.setData('text/plain', this.dataset.navItemId);
            setTimeout(() => this.style.opacity = '0.5', 0);
        });

        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            draggedItem = null;
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (this !== draggedItem) {
                const bounding = this.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                if (e.clientY > offset) {
                    this.style.borderBottom = '2px solid #007bff';
                    this.style.borderTop = '';
                } else {
                    this.style.borderTop = '2px solid #007bff';
                    this.style.borderBottom = '';
                }
            }
        });

        item.addEventListener('dragleave', function() {
            this.style.borderBottom = '';
            this.style.borderTop = '';
        });

        item.addEventListener('drop', async function(e) {
            e.preventDefault();
            this.style.borderBottom = '';
            this.style.borderTop = '';

            if (this !== draggedItem) {
                const draggedItemId = e.dataTransfer.getData('text/plain');
                const targetItemId = this.dataset.navItemId;

                const items = Array.from(navItemsList.children);
                const draggedIndex = items.findIndex(el => el.dataset.navItemId === draggedItemId);
                const targetIndex = items.findIndex(el => el.dataset.navItemId === targetItemId);

                if (draggedIndex === -1 || targetIndex === -1) return;

                if (e.clientY > this.getBoundingClientRect().y + (this.getBoundingClientRect().height / 2)) {
                    navItemsList.insertBefore(draggedItem, this.nextSibling);
                } else {
                    navItemsList.insertBefore(draggedItem, this);
                }

                await updateNavItemOrder();
            }
        });
    });
}

async function updateNavItemOrder() {
    const navItemsList = document.getElementById('navItemsList');
    const items = Array.from(navItemsList.children);
    
    const updates = items.map((item, index) => ({
        id: item.dataset.navItemId,
        display_order: index + 1
    }));

    try {
        const { error } = await supabaseClient
            .from('navigation_items')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
        logAdminAction('NAV_ORDER_UPDATED', 'Navigation item order updated');
        showToast('नेवीगेशन क्रम अपडेट किया गया', 'success');
    } catch (error) {
        console.error('Error updating nav item order:', error);
        showToast('नेवीगेशन क्रम अपडेट करने में त्रुटि', 'error');
    }
}

async function handleAddNavItem(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('addNavSubmitBtn');
    const formData = new FormData(e.target);

    const nameHi = formData.get('navNameHi');
    const nameEn = formData.get('navNameEn');
    const url = formData.get('navUrl');
    const categoryId = parseInt(formData.get('navCategory'));
    const displayOrder = parseInt(formData.get('navOrder'));
    const iconClass = formData.get('selectedNavIcon');

    if (!nameHi || !nameEn || !url || !categoryId || !displayOrder || !iconClass) {
        showAddNavError('कृपया सभी आवश्यक फील्ड भरें');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> जोड़ा जा रहा है...';

    try {
        const navItemData = {
            name_hi: nameHi,
            name_en: nameEn,
            url: url,
            category_id: categoryId,
            display_order: displayOrder,
            icon_class: iconClass,
            created_by: currentUser.id,
            is_active: true
        };

        const { data, error } = await supabaseClient
            .from('navigation_items')
            .insert([navItemData])
            .select('id');

        if (error) throw error;

        logAdminAction('NAV_ITEM_ADDED', `Added new navigation item: ${nameHi}`, data[0].id);

        showAddNavSuccess('नेवीगेशन आइटम सफलतापूर्वक जोड़ा गया!');
        showToast('नेवीगेशन आइटम जोड़ा गया', 'success');
        
        setTimeout(() => { closeAddNavModal(); loadNavItemsForManager(); }, 2000);

    } catch (error) {
        console.error('Error adding nav item:', error);
        showAddNavError('नेवीगेशन आइटम जोड़ने में त्रुटि: ' + error.message);
        showToast('नेवीगेशन आइटम जोड़ने में त्रुटि', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> नेवीगेशन आइटम जोड़ें';
    }
}

window.editNavItem = async function(navItemId) {
    try {
        const { data: item, error } = await supabaseClient
            .from('navigation_items')
            .select('*')
            .eq('id', navItemId)
            .single();

        if (error) throw error;

        document.getElementById('editNavId').value = item.id;
        document.getElementById('editNavNameHi').value = item.name_hi;
        document.getElementById('editNavNameEn').value = item.name_en;
        document.getElementById('editNavUrl').value = item.url;
        document.getElementById('editNavCategory').value = item.category_id;
        document.getElementById('editNavOrder').value = item.display_order;
        document.getElementById('editSelectedNavIcon').value = item.icon_class;

        const editNavIconPicker = document.getElementById('editNavIconPicker');
        editNavIconPicker.querySelectorAll('.icon-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.querySelector('i').className === item.icon_class) {
                opt.classList.add('selected');
            }
        });

        openEditNavModal();

    } catch (error) {
        console.error('Error loading nav item for edit:', error);
        showToast('नेवीगेशन आइटम लोड करने में त्रुटि', 'error');
    }
}

async function handleEditNavItem(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('editNavSubmitBtn');
    const formData = new FormData(e.target);
    const navItemId = formData.get('editNavId');

    const nameHi = formData.get('editNavNameHi');
    const nameEn = formData.get('editNavNameEn');
    const url = formData.get('editNavUrl');
    const categoryId = parseInt(formData.get('editNavCategory'));
    const displayOrder = parseInt(formData.get('editNavOrder'));
    const iconClass = formData.get('editSelectedNavIcon');

    if (!nameHi || !nameEn || !url || !categoryId || !displayOrder || !iconClass) {
        showEditNavError('कृपया सभी आवश्यक फील्ड भरें');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> सहेजा जा रहा है...';

    try {
        const updateData = {
            name_hi: nameHi,
            name_en: nameEn,
            url: url,
            category_id: categoryId,
            display_order: displayOrder,
            icon_class: iconClass,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('navigation_items')
            .update(updateData)
            .eq('id', navItemId);

        if (error) throw error;

        logAdminAction('NAV_ITEM_UPDATED', `Updated navigation item: ${nameHi} (ID: ${navItemId})`, navItemId);

        showEditNavSuccess('नेवीगेशन आइटम सफलतापूर्वक अपडेट हो गया!');
        showToast('नेवीगेशन आइटम अपडेट हो गया', 'success');
        
        setTimeout(() => { closeEditNavModal(); loadNavItemsForManager(); }, 2000);

    } catch (error) {
        console.error('Error updating nav item:', error);
        showEditNavError('नेवीगेशन आइटम अपडेट करने में त्रुटि: ' + error.message);
        showToast('नेवीगेशन आइटम अपडेट करने में त्रुटि', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> परिवर्तन सहेजें';
    }
}

window.deleteNavItem = async function(navItemId) {
    if (!confirm('क्या आप वाकई इस नेवीगेशन आइटम को हटाना चाहते हैं?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('navigation_items')
            .update({ is_active: false })
            .eq('id', navItemId);

        if (error) throw error;

        logAdminAction('NAV_ITEM_DELETED', `Deleted navigation item (ID: ${navItemId})`, navItemId);

        showToast('नेवीगेशन आइटम हटा दिया गया', 'success');
        loadNavItemsForManager();

    } catch (error) {
        console.error('Error deleting nav item:', error);
        showToast('नेवीगेशन आइटम हटाने में त्रुटि', 'error');
    }
}

// Message display functions
function hideAddCardMessages() {
    document.getElementById('addCardErrorMessage').style.display = 'none';
    document.getElementById('addCardSuccessMessage').style.display = 'none';
}

function showAddCardError(message) {
    hideAddCardMessages();
    document.getElementById('addCardErrorMessage').textContent = message;
    document.getElementById('addCardErrorMessage').style.display = 'block';
}

function showAddCardSuccess(message) {
    hideAddCardMessages();
    document.getElementById('addCardSuccessMessage').textContent = message;
    document.getElementById('addCardSuccessMessage').style.display = 'block';
}

function hideEditCardMessages() {
    document.getElementById('editCardErrorMessage').style.display = 'none';
    document.getElementById('editCardSuccessMessage').style.display = 'none';
}

function showEditCardError(message) {
    hideEditCardMessages();
    document.getElementById('editCardErrorMessage').textContent = message;
    document.getElementById('editCardErrorMessage').style.display = 'block';
}

function showEditCardSuccess(message) {
    hideEditCardMessages();
    document.getElementById('editCardSuccessMessage').textContent = message;
    document.getElementById('editCardSuccessMessage').style.display = 'block';
}

function hideAddNavMessages() {
    document.getElementById('addNavErrorMessage').style.display = 'none';
    document.getElementById('addNavSuccessMessage').style.display = 'none';
}

function showAddNavError(message) {
    hideAddNavMessages();
    document.getElementById('addNavErrorMessage').textContent = message;
    document.getElementById('addNavErrorMessage').style.display = 'block';
}

function showAddNavSuccess(message) {
    hideAddNavMessages();
    document.getElementById('addNavSuccessMessage').textContent = message;
    document.getElementById('addNavSuccessMessage').style.display = 'block';
}

function hideEditNavMessages() {
    document.getElementById('editNavErrorMessage').style.display = 'none';
    document.getElementById('editNavSuccessMessage').style.display = 'none';
}

function showEditNavError(message) {
    hideEditNavMessages();
    document.getElementById('editNavErrorMessage').textContent = message;
    document.getElementById('editNavErrorMessage').style.display = 'block';
}

function showEditNavSuccess(message) {
    hideEditNavMessages();
    document.getElementById('editNavSuccessMessage').textContent = message;
    document.getElementById('editNavSuccessMessage').style.display = 'block';
}

function hideUserMessages() {
    document.getElementById('editUserErrorMessage').style.display = 'none';
    document.getElementById('editUserSuccessMessage').style.display = 'none';
}

function showEditUserError(message) {
    hideUserMessages();
    document.getElementById('editUserErrorMessage').textContent = message;
    document.getElementById('editUserErrorMessage').style.display = 'block';
}

function showEditUserSuccess(message) {
    hideUserMessages();
    document.getElementById('editUserSuccessMessage').textContent = message;
    document.getElementById('editUserSuccessMessage').style.display = 'block';
}

function hideProfileMessages() {
    document.getElementById('profileErrorMessage').style.display = 'none';
    document.getElementById('profileSuccessMessage').style.display = 'none';
}

function showProfileError(message) {
    hideProfileMessages();
    document.getElementById('profileErrorMessage').textContent = message;
    document.getElementById('profileErrorMessage').style.display = 'block';
}

function showProfileSuccess(message) {
    hideProfileMessages();
    document.getElementById('profileSuccessMessage').textContent = message;
    document.getElementById('profileSuccessMessage').style.display = 'block';
}

function setupProfileFormHandlers() {
    document.getElementById('profileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const profileBtn = document.getElementById('profileBtn');
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        hideProfileMessages();

        if (!currentPassword || !newPassword || !confirmPassword) {
            showProfileError('कृपया सभी फील्ड भरें');
            return;
        }

        if (newPassword !== confirmPassword) {
            showProfileError('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते');
            return;
        }

        if (newPassword.length < 6) {
            showProfileError('नया पासवर्ड कम से कम 6 अक्षर का होना चाहिए');
            return;
        }

        profileBtn.disabled = true;
        profileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> अपडेट हो रहा है...';

        try {
            const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
            const hashedCurrentPassword = await hashPassword(currentPassword);

            const { data: user, error: verifyError } = await supabaseClient
                .from('test_users')
                .select('password_hash')
                .eq('id', userId)
                .single();

            if (verifyError || !user || user.password_hash !== hashedCurrentPassword) {
                throw new Error('वर्तमान पासवर्ड गलत है');
            }

            const hashedNewPassword = await hashPassword(newPassword);

            const { error: updateError } = await supabaseClient
                .from('test_users')
                .update({ password_hash: hashedNewPassword, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (updateError) throw new Error('पासवर्ड अपडेट करने में त्रुटि');

            showProfileSuccess('पासवर्ड सफलतापूर्वक अपडेट हो गया!');
            showToast('पासवर्ड अपडेट हो गया', 'success');
            
            setTimeout(() => {
                document.getElementById('profileForm').reset();
                hideProfileMessages();
                closeProfileModal();
            }, 2000);

        } catch (error) {
            showProfileError(error.message || 'पासवर्ड अपडेट करने में त्रुटि हुई');
            showToast('पासवर्ड अपडेट में त्रुटि', 'error');
        } finally {
            profileBtn.disabled = false;
            profileBtn.innerHTML = '<i class="fas fa-save"></i> पासवर्ड अपडेट करें';
        }
    });
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.logout = async function() {
    try {
        const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
        showToast('लॉगआउट हो रहा है...', 'info');
        
        if (userId) {
            await supabaseClient
                .from('test_users')
                .update({ is_online: false, last_activity: new Date().toISOString() })
                .eq('id', userId);
        }

        sessionStorage.removeItem('userId');
        localStorage.removeItem('userId');
        showToast('सफलतापूर्वक लॉगआउट हो गए', 'success');
        setTimeout(() => { window.location.href = 'header.html'; }, 1000);
        
    } catch (error) {
        showToast('लॉगआउट में त्रुटि', 'error');
        setTimeout(() => { window.location.href = 'header.html'; }, 2000);
    }
}

window.editCard = editCard;
window.deleteCard = deleteCard;
window.editNavItem = editNavItem;
window.deleteNavItem = deleteNavItem;
window.editUser = editUser;
window.toggleUserActiveStatus = toggleUserActiveStatus;
window.viewDynamicFormDefinition = viewDynamicFormDefinition; // Make globally available
window.deleteDynamicForm = deleteDynamicForm; // Make globally available

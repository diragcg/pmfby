const App = {
    currentPage: 'dashboard',
    
    init() {
        this.loadHeader();
        this.setupRouting();
        this.loadInitialPage();
        this.hidePageLoading();
    },
    
    loadHeader() {
        document.getElementById('header-container').innerHTML = Templates.header;
        this.setupEventListeners();
    },
    
    setupRouting() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const page = location.hash.slice(1) || 'dashboard';
            this.loadPage(page);
        });
        
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]') || e.target.closest('[data-page]')) {
                e.preventDefault();
                const pageElement = e.target.matches('[data-page]') ? e.target : e.target.closest('[data-page]');
                const page = pageElement.getAttribute('data-page');
                this.navigateTo(page);
            }
        });
    },
    
    navigateTo(page) {
        location.hash = page;
        this.loadPage(page);
    },
    
    async loadPage(pageName) {
        this.showPageLoading();
        
        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) throw new Error(`Page not found: ${pageName}`);
            
            const content = await response.text();
            document.getElementById('content-container').innerHTML = content;
            
            this.updateActiveNav(pageName);
            this.currentPage = pageName;
            
            // Execute page-specific JavaScript if exists
            this.executePageScript(pageName);
            
        } catch (error) {
            console.error('Error loading page:', error);
            this.loadErrorPage();
        }
        
        this.hidePageLoading();
    },
    
    loadInitialPage() {
        const page = location.hash.slice(1) || 'dashboard';
        this.loadPage(page);
    },
    
    updateActiveNav(pageName) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current page
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Update page title
        document.title = this.getPageTitle(pageName);
    },
    
    getPageTitle(pageName) {
        const titles = {
            'dashboard': 'डैशबोर्ड - संचालनालय कृषि छत्तीसगढ़',
            'store': 'वाहन आबंटन प्रबंधन - संचालनालय कृषि छत्तीसगढ़',
            'pmfby': 'PMFBY - संचालनालय कृषि छत्तीसगढ़',
            'dbt': 'DBT - संचालनालय कृषि छत्तीसगढ़',
            'gt': 'GT - संचालनालय कृषि छत्तीसगढ़',
            'kcc': 'KCC - संचालनालय कृषि छत्तीसगढ़'
        };
        return titles[pageName] || 'संचालनालय कृषि छत्तीसगढ़';
    },
    
    executePageScript(pageName) {
        // Execute page-specific JavaScript
        const event = new CustomEvent('pageLoaded', { detail: { page: pageName } });
        document.dispatchEvent(event);
    },
    
    setupEventListeners() {
        // Logout functionality
        document.getElementById('logoutLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are You Sure to Exit?')) {
                this.logout();
            }
        });
        
        // Profile functionality
        document.getElementById('profileLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openProfileModal();
        });
    },
    
    showPageLoading() {
        const loading = document.getElementById('pageLoading');
        if (loading) loading.style.display = 'flex';
    },
    
    hidePageLoading() {
        const loading = document.getElementById('pageLoading');
        if (loading) {
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    },
    
    loadErrorPage() {
        document.getElementById('content-container').innerHTML = `
            <div class="main-content">
                <div class="error-page">
                    <h2>पेज नहीं मिला</h2>
                    <p>क्षमा करें, आपके द्वारा खोजा गया पेज उपलब्ध नहीं है।</p>
                    <button onclick="App.navigateTo('dashboard')" class="btn btn-primary">होम पर वापस जाएं</button>
                </div>
            </div>
        `;
    },
    
    logout() {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'header.html';
    },
    
    openProfileModal() {
        // Profile modal functionality
        console.log('Profile modal opened');
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available
window.App = App;

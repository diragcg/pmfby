const Templates = {
    header: `
        <div class="page-loading" id="pageLoading">
            <div class="spinner"></div>
            <div class="loading-text">लोड हो रहा है...</div>
        </div>

        <div class="header-strip">
            <div class="header-container">
                <div class="logo-section">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Coat_of_arms_of_Chhattisgarh.svg" alt="छत्तीसगढ़ सरकार" class="cg-logo">
                    <div class="logo-text">
                        <h1>संचालनालय कृषि छत्तीसगढ़</h1>
                        <p>Directorate of Agriculture, Chhattisgarh</p>
                    </div>
                </div>
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-display" id="user-display">Loading...</div>
                    </div>
                </div>
            </div>
        </div>

        <nav class="navbar">
            <div class="nav-container">
                <ul class="nav-menu">
                    <li class="nav-item">
                        <a href="#dashboard" class="nav-link" data-page="dashboard">
                            <i class="fas fa-home"></i> होम
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a href="#" class="nav-link">
                            <i class="fas fa-th-large"></i> सेक्शन <i class="fas fa-chevron-down"></i>
                        </a>
                        <div class="dropdown-content" id="dynamicDropdown">
                            <a href="#pmfby" class="dropdown-item" data-page="pmfby">
                                <i class="fas fa-seedling"></i> PMFBY
                            </a>
                            <a href="#dbt" class="dropdown-item" data-page="dbt">
                                <i class="fas fa-money-bill-transfer"></i> DBT
                            </a>
                            <a href="#store" class="dropdown-item" data-page="store">
                                <i class="fas fa-store"></i> STORE
                            </a>
                            <a href="#gt" class="dropdown-item" data-page="gt">
                                <i class="fas fa-chart-line"></i> GT
                            </a>
                            <a href="#kcc" class="dropdown-item" data-page="kcc">
                                <i class="fas fa-credit-card"></i> KCC
                            </a>
                        </div>
                    </li>
                    <li class="nav-item profile-link">
                        <a href="#profile" class="nav-link" id="profileLink">
                            <i class="fas fa-user"></i> प्रोफाइल
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#logout" class="nav-link logout-link" id="logoutLink">
                            <i class="fas fa-sign-out-alt"></i> लॉगआउट
                        </a>
                    </li>
                </ul>
            </div>
        </nav>
    `,

    footer: `
        <footer class="footer">
            <div class="footer-container">
                <p>&copy; 2024 संचालनालय कृषि छत्तीसगढ़. All rights reserved.</p>
            </div>
        </footer>
    `
};

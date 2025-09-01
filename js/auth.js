// Authentication helper functions
function getCurrentUser() {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        alert('कृपया पहले लॉगिन करें');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'Admin';
}

function hasPermission(module) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Add your permission logic here
    // For now, all authenticated users have access
    return true;
}

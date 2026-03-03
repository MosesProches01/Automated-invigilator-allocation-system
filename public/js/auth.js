// Authentication utilities
const API_BASE = '/api';

// Store token in localStorage
function setToken(token) {
    localStorage.setItem('authToken', token);
}

// Get token from localStorage
function getToken() {
    return localStorage.getItem('authToken');
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('authToken');
}

// Check if user is authenticated
function isAuthenticated() {
    return getToken() !== null;
}

// Get current user info
function getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (error) {
        console.error('Error parsing token:', error);
        return null;
    }
}

// Redirect based on user role
function redirectBasedOnRole() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }

    if (user.role === 'Examination Officer') {
        window.location.href = '/officer-dashboard';
    } else {
        window.location.href = '/invigilator-dashboard';
    }
}

// Login function
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            setToken(data.token);
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

// Logout function
function logout() {
    removeToken();
    window.location.href = '/login';
}

// Make API request with authentication
async function makeAuthenticatedRequest(url, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }

        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/login' && !isAuthenticated()) {
        window.location.href = '/login';
    }
});

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            
            const result = await login(username, password);
            
            if (result.success) {
                redirectBasedOnRole();
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
            }
        });
    }
});

// Examination Officer Dashboard JavaScript
const API_BASE = '/api';

// Dashboard data
let dashboardData = {
    sessions: [],
    invigilators: [],
    stats: {}
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loading...');
    
    // Check authentication
    if (!isAuthenticated()) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = '/login';
        return;
    }

    const user = getCurrentUser();
    console.log('Current user:', user);
    
    if (user.role !== 'Examination Officer') {
        console.log('Not an officer, redirecting to invigilator dashboard');
        window.location.href = '/invigilator-dashboard';
        return;
    }

    console.log('Authentication passed, loading dashboard data');
    loadDashboardData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Session form
    const sessionForm = document.getElementById('sessionForm');
    if (sessionForm) {
        sessionForm.addEventListener('submit', handleAddSession);
    }
    
    // Invigilator form
    const invigilatorForm = document.getElementById('invigilatorForm');
    if (invigilatorForm) {
        invigilatorForm.addEventListener('submit', handleAddInvigilator);
    }
    
    // Generate allocations button
    const generateBtn = document.getElementById('generateAllocations');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAllAllocations);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadSessions(),
            loadInvigilators()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Load statistics
async function loadStats() {
    const response = await fetch(`${API_BASE}/test/sessions`);
    const sessions = await response.json();
    
    const invigilatorResponse = await fetch(`${API_BASE}/test/invigilators`);
    const invigilators = await invigilatorResponse.json();
    
    const stats = {
        totalSessions: sessions.length,
        totalInvigilators: invigilators.length,
        totalAllocations: 0,
        pendingSessions: sessions.filter(s => s.status === 'scheduled').length
    };
    
    dashboardData.stats = stats;
    updateStatsDisplay(stats);
}

// Update statistics display
function updateStatsDisplay(stats) {
    const totalSessionsEl = document.getElementById('totalSessions');
    const totalInvigilatorsEl = document.getElementById('totalInvigilators');
    const totalAllocationsEl = document.getElementById('totalAllocations');
    const pendingSessionsEl = document.getElementById('pendingSessions');
    
    if (totalSessionsEl) totalSessionsEl.textContent = stats.totalSessions;
    if (totalInvigilatorsEl) totalInvigilatorsEl.textContent = stats.totalInvigilators;
    if (totalAllocationsEl) totalAllocationsEl.textContent = stats.totalAllocations;
    if (pendingSessionsEl) pendingSessionsEl.textContent = stats.pendingSessions;
}

// Load sessions
async function loadSessions() {
    const response = await fetch(`${API_BASE}/test/sessions`);
    const sessions = await response.json();
    
    const tbody = document.getElementById('sessionsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No sessions found</td></tr>';
        return;
    }
    
    sessions.forEach(session => {
        const row = createSessionRow(session);
        tbody.appendChild(row);
    });
    
    dashboardData.sessions = sessions;
}

// Create session row
function createSessionRow(session) {
    const row = document.createElement('tr');
    
    const statusBadge = getStatusBadge(session.status);
    const allocationsText = session.allocations ? `${session.allocations.length} assigned` : 'Not allocated';
    
    row.innerHTML = `
        <td>${session.course_code} - ${session.course_name}</td>
        <td>${formatDate(session.exam_date)}</td>
        <td>${formatTime(session.start_time)} - ${formatTime(session.end_time)}</td>
        <td>${session.room_name || 'N/A'}</td>
        <td>${statusBadge}</td>
        <td>${allocationsText}</td>
        <td>
            <button class="btn btn-sm btn-primary" onclick="viewSessionDetails(${session.session_id})">View</button>
            <button class="btn btn-sm btn-secondary" onclick="manualAllocate(${session.session_id})">Allocate</button>
        </td>
    `;
    
    return row;
}

// Load invigilators
async function loadInvigilators() {
    const response = await fetch(`${API_BASE}/test/invigilators`);
    const invigilators = await response.json();
    
    const tbody = document.getElementById('invigilatorsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (invigilators.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No invigilators found</td></tr>';
        return;
    }
    
    invigilators.forEach(invigilator => {
        const row = createInvigilatorRow(invigilator);
        tbody.appendChild(row);
    });
    
    dashboardData.invigilators = invigilators;
}

// Create invigilator row
function createInvigilatorRow(invigilator) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${invigilator.first_name} ${invigilator.last_name}</td>
        <td>${invigilator.email}</td>
        <td>${invigilator.department}</td>
        <td>${getRoleName(invigilator.role_id)}</td>
        <td>${invigilator.current_workload}</td>
        <td>
            <button class="btn btn-sm btn-primary" onclick="editInvigilator(${invigilator.invigilator_id})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteInvigilator(${invigilator.invigilator_id})">Delete</button>
        </td>
    `;
    
    return row;
}

// Get role name from ID
function getRoleName(roleId) {
    const roles = {
        1: 'Senior Invigilator',
        2: 'Assistant Invigilator'
    };
    return roles[roleId] || 'Unknown';
}

// Generate all allocations
async function generateAllAllocations() {
    try {
        showLoading('Generating allocations...');
        
        const response = await fetch(`${API_BASE}/allocations/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate allocations');
        }
        
        const result = await response.json();
        
        hideLoading();
        showSuccess(`Generated ${result.allocations.length} allocations successfully!`);
        
        // Reload data to show new allocations
        await loadDashboardData();
        
    } catch (error) {
        hideLoading();
        console.error('Error generating allocations:', error);
        showError('Failed to generate allocations: ' + error.message);
    }
}

// Manual allocate for specific session
async function manualAllocate(sessionId) {
    try {
        showLoading('Allocating invigilators...');
        
        const response = await fetch(`${API_BASE}/allocations/session/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to allocate invigilators');
        }
        
        const result = await response.json();
        
        hideLoading();
        showSuccess(`Allocated ${result.allocations.length} invigilators successfully!`);
        
        // Reload sessions to show allocations
        await loadSessions();
        
    } catch (error) {
        hideLoading();
        console.error('Error allocating invigilators:', error);
        showError('Failed to allocate invigilators: ' + error.message);
    }
}

// View session details
function viewSessionDetails(sessionId) {
    const session = dashboardData.sessions.find(s => s.session_id === sessionId);
    if (!session) return;
    
    // Show modal with session details
    const modal = document.getElementById('sessionModal');
    const modalContent = document.getElementById('modalContent');
    
    if (modal && modalContent) {
        modalContent.innerHTML = `
            <h3>Session Details</h3>
            <p><strong>Course:</strong> ${session.course_code} - ${session.course_name}</p>
            <p><strong>Date:</strong> ${formatDate(session.exam_date)}</p>
            <p><strong>Time:</strong> ${formatTime(session.start_time)} - ${formatTime(session.end_time)}</p>
            <p><strong>Room:</strong> ${session.room_name || 'N/A'}</p>
            <p><strong>Status:</strong> ${session.status}</p>
            <h4>Allocations</h4>
            <div id="allocationsList">
                ${session.allocations && session.allocations.length > 0 ? 
                    session.allocations.map(a => `<p>${a.first_name} ${a.last_name} (${a.role_name})</p>`).join('') :
                    '<p>No allocations yet</p>'
                }
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('sessionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle add session
async function handleAddSession(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const sessionData = {
        course_id: parseInt(formData.get('course_id')),
        room_id: parseInt(formData.get('room_id')),
        exam_date: formData.get('exam_date'),
        start_time: formData.get('start_time'),
        end_time: formData.get('end_time')
    };
    
    try {
        const response = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(sessionData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add session');
        }
        
        showSuccess('Session added successfully!');
        event.target.reset();
        await loadSessions();
        
    } catch (error) {
        console.error('Error adding session:', error);
        showError('Failed to add session: ' + error.message);
    }
}

// Handle add invigilator
async function handleAddInvigilator(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const invigilatorData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        department: formData.get('department'),
        role_id: parseInt(formData.get('role_id'))
    };
    
    try {
        const response = await fetch(`${API_BASE}/invigilators`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(invigilatorData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add invigilator');
        }
        
        showSuccess('Invigilator added successfully!');
        event.target.reset();
        await loadInvigilators();
        
    } catch (error) {
        console.error('Error adding invigilator:', error);
        showError('Failed to add invigilator: ' + error.message);
    }
}

// Placeholder functions for edit/delete
function editInvigilator(id) {
    showInfo('Edit invigilator functionality coming soon!');
}

function deleteInvigilator(id) {
    if (confirm('Are you sure you want to delete this invigilator?')) {
        showInfo('Delete invigilator functionality coming soon!');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatTime(timeString) {
    return timeString.substring(0, 5);
}

function getStatusBadge(status) {
    const badges = {
        'scheduled': '<span class="badge badge-warning">Scheduled</span>',
        'in_progress': '<span class="badge badge-info">In Progress</span>',
        'completed': '<span class="badge badge-success">Completed</span>',
        'cancelled': '<span class="badge badge-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">Unknown</span>';
}

function showLoading(message = 'Loading...') {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.textContent = message;
        loadingDiv.style.display = 'block';
    }
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

// Include auth functions (these should be available from auth.js)
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    const user = getCurrentUser();
    return !!(token && user);
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('success');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

function showInfo(message) {
    alert(message); // Simple fallback for now
}

// Quick action functions
function generateAllocations() {
    generateAllAllocations();
}

function showAddSessionModal() {
    showInfo('Add Session modal functionality coming soon!');
}

function showAddInvigilatorModal() {
    showInfo('Add Invigilator modal functionality coming soon!');
}

function refreshData() {
    loadDashboardData();
    showSuccess('Data refreshed successfully!');
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
}

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
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const user = getCurrentUser();
    if (user.role !== 'Examination Officer') {
        window.location.href = '/invigilator-dashboard';
        return;
    }

    loadDashboardData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Session form
    document.getElementById('sessionForm').addEventListener('submit', handleAddSession);
    
    // Invigilator form
    document.getElementById('invigilatorForm').addEventListener('submit', handleAddInvigilator);
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
    const response = await makeAuthenticatedRequest(`${API_BASE}/dashboard/stats`);
    const stats = await response.json();
    
    document.getElementById('totalSessions').textContent = stats.totalSessions;
    document.getElementById('totalInvigilators').textContent = stats.totalInvigilators;
    document.getElementById('allocatedSessions').textContent = stats.allocatedSessions;
    document.getElementById('pendingSessions').textContent = stats.pendingSessions;
    
    dashboardData.stats = stats;
}

// Load sessions
async function loadSessions() {
    const response = await makeAuthenticatedRequest(`${API_BASE}/sessions`);
    const sessions = await response.json();
    
    const tbody = document.getElementById('sessionsTable');
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
        <td>${session.room_name}</td>
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
    const response = await makeAuthenticatedRequest(`${API_BASE}/invigilators`);
    const invigilators = await response.json();
    
    const tbody = document.getElementById('invigilatorsTable');
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
        <td>${invigilator.role_name}</td>
        <td>${invigilator.current_workload}</td>
        <td>
            <button class="btn btn-sm btn-primary" onclick="viewInvigilatorSchedule(${invigilator.invigilator_id})">Schedule</button>
        </td>
    `;
    
    return row;
}

// Generate allocations
async function generateAllocations() {
    try {
        showLoading('Generating allocations...');
        
        const response = await makeAuthenticatedRequest(`${API_BASE}/allocations/generate`, {
            method: 'POST'
        });
        
        const results = await response.json();
        
        hideLoading();
        showAllocationResults(results);
        loadDashboardData(); // Refresh data
        
    } catch (error) {
        hideLoading();
        showError('Failed to generate allocations: ' + error.message);
    }
}

// Show allocation results
function showAllocationResults(results) {
    const modal = document.getElementById('allocationResultsModal');
    const resultsDiv = document.getElementById('allocationResults');
    
    let html = `
        <div class="mb-20">
            <p><strong>Total Sessions:</strong> ${results.total}</p>
            <p><strong>Successfully Allocated:</strong> ${results.success.length}</p>
            <p><strong>Failed:</strong> ${results.failed.length}</p>
        </div>
    `;
    
    if (results.success.length > 0) {
        html += '<h4>Successfully Allocated:</h4><ul>';
        results.success.forEach(success => {
            html += `<li>Session ${success.sessionId}: ${success.allocations.length} invigilators assigned</li>`;
        });
        html += '</ul>';
    }
    
    if (results.failed.length > 0) {
        html += '<h4>Failed to Allocate:</h4><ul>';
        results.failed.forEach(failed => {
            html += `<li>Session ${failed.sessionId}: ${failed.reason}</li>`;
        });
        html += '</ul>';
    }
    
    resultsDiv.innerHTML = html;
    modal.style.display = 'block';
}

// Handle add session
async function handleAddSession(e) {
    e.preventDefault();
    
    const sessionData = {
        course_code: document.getElementById('courseCode').value,
        course_name: document.getElementById('courseName').value,
        exam_date: document.getElementById('examDate').value,
        start_time: document.getElementById('startTime').value,
        end_time: document.getElementById('endTime').value,
        room_id: parseInt(document.getElementById('roomName').value)
    };
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE}/sessions`, {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('sessionModal');
            showSuccess('Session added successfully');
            loadSessions();
            document.getElementById('sessionForm').reset();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Failed to add session: ' + error.message);
    }
}

// Handle add invigilator
async function handleAddInvigilator(e) {
    e.preventDefault();
    
    const invigilatorData = {
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        department: document.getElementById('department').value,
        role_id: parseInt(document.getElementById('role').value)
    };
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE}/invigilators`, {
            method: 'POST',
            body: JSON.stringify(invigilatorData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('invigilatorModal');
            showSuccess('Invigilator added successfully');
            loadInvigilators();
            document.getElementById('invigilatorForm').reset();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Failed to add invigilator: ' + error.message);
    }
}

// View session details
async function viewSessionDetails(sessionId) {
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE}/sessions/${sessionId}`);
        const session = await response.json();
        
        let details = `
            <h3>Session Details</h3>
            <p><strong>Course:</strong> ${session.course_code} - ${session.course_name}</p>
            <p><strong>Date:</strong> ${formatDate(session.exam_date)}</p>
            <p><strong>Time:</strong> ${formatTime(session.start_time)} - ${formatTime(session.end_time)}</p>
            <p><strong>Room:</strong> ${session.room_name} (Capacity: ${session.capacity})</p>
        `;
        
        if (session.allocations && session.allocations.length > 0) {
            details += '<h4>Allocated Invigilators:</h4><ul>';
            session.allocations.forEach(allocation => {
                const chiefBadge = allocation.is_chief ? ' (Chief)' : '';
                details += `<li>${allocation.first_name} ${allocation.last_name} - ${allocation.role_name}${chiefBadge}</li>`;
            });
            details += '</ul>';
        } else {
            details += '<p><strong>No invigilators allocated yet</strong></p>';
        }
        
        alert(details);
    } catch (error) {
        showError('Failed to load session details: ' + error.message);
    }
}

// View invigilator schedule
async function viewInvigilatorSchedule(invigilatorId) {
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE}/invigilators/${invigilatorId}/schedule`);
        const schedule = await response.json();
        
        const invigilator = dashboardData.invigilators.find(i => i.invigilator_id === invigilatorId);
        
        let scheduleText = `Schedule for ${invigilator.first_name} ${invigilator.last_name}:\n\n`;
        
        if (schedule.length === 0) {
            scheduleText += 'No sessions assigned';
        } else {
            schedule.forEach(session => {
                scheduleText += `${formatDate(session.exam_date)}: ${session.course_code} - ${session.course_name}\n`;
                scheduleText += `Time: ${formatTime(session.start_time)} - ${formatTime(session.end_time)}\n`;
                scheduleText += `Room: ${session.room_name}\n`;
                if (session.is_chief) scheduleText += 'Role: Chief Invigilator\n';
                scheduleText += '\n';
            });
        }
        
        alert(scheduleText);
    } catch (error) {
        showError('Failed to load schedule: ' + error.message);
    }
}

// Manual allocation (placeholder)
function manualAllocate(sessionId) {
    alert('Manual allocation feature would allow you to select specific invigilators for this session.');
}

// Refresh data
function refreshData() {
    loadDashboardData();
    showSuccess('Data refreshed successfully');
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
        'scheduled': '<span class="badge badge-info">Scheduled</span>',
        'completed': '<span class="badge badge-success">Completed</span>',
        'cancelled': '<span class="badge badge-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge badge-warning">Unknown</span>';
}

// Modal functions
function showAddSessionModal() {
    document.getElementById('sessionModal').style.display = 'block';
}

function showAddInvigilatorModal() {
    document.getElementById('invigilatorModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Loading and message functions
function showLoading(message = 'Loading...') {
    // Create or update loading overlay
    let loading = document.getElementById('loadingOverlay');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-size: 18px;
        `;
        document.body.appendChild(loading);
    }
    loading.innerHTML = `<div><div class="spinner"></div><p>${message}</p></div>`;
    loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showSuccess(message) {
    alert('Success: ' + message);
}

function showError(message) {
    alert('Error: ' + message);
}

// Invigilator Dashboard JavaScript
const API_BASE = '/api';

// Dashboard data
let dashboardData = {
    schedule: [],
    stats: {}
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const user = getCurrentUser();
    if (user.role === 'Examination Officer') {
        window.location.href = '/officer-dashboard';
        return;
    }

    loadDashboardData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Emergency form
    document.getElementById('emergencyForm').addEventListener('submit', handleEmergencyRequest);
    
    // Incident form
    document.getElementById('incidentForm').addEventListener('submit', handleIncidentReport);
    
    // Report form
    document.getElementById('reportForm').addEventListener('submit', handleSessionReport);
}

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadSchedule(),
            loadStats()
        ]);
        populateSessionSelects();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Load schedule
async function loadSchedule() {
    // For demo purposes, we'll use a mock invigilator ID
    // In a real implementation, this would come from the user profile
    const invigilatorId = 1; // Mock ID
    
    try {
        const response = await makeAuthenticatedRequest(`${API_BASE}/invigilators/${invigilatorId}/schedule`);
        const schedule = await response.json();
        
        const tbody = document.getElementById('scheduleTable');
        tbody.innerHTML = '';
        
        if (schedule.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No sessions assigned</td></tr>';
            return;
        }
        
        schedule.forEach(session => {
            const row = createScheduleRow(session);
            tbody.appendChild(row);
        });
        
        dashboardData.schedule = schedule;
        
        // Update invigilator name (mock data)
        document.getElementById('invigilatorName').textContent = 'John Smith';
        
    } catch (error) {
        console.error('Error loading schedule:', error);
        // Use mock data for demo
        loadMockSchedule();
    }
}

// Load mock schedule for demo
function loadMockSchedule() {
    const mockSchedule = [
        {
            session_id: 1,
            exam_date: '2024-03-15',
            start_time: '09:00:00',
            end_time: '11:00:00',
            course_code: 'CS101',
            course_name: 'Introduction to Computer Science',
            room_name: 'Room A101',
            is_chief: 1,
            allocation_status: 'assigned'
        },
        {
            session_id: 2,
            exam_date: '2024-03-20',
            start_time: '14:00:00',
            end_time: '16:00:00',
            course_code: 'MATH201',
            course_name: 'Advanced Mathematics',
            room_name: 'Room B205',
            is_chief: 0,
            allocation_status: 'assigned'
        }
    ];
    
    const tbody = document.getElementById('scheduleTable');
    tbody.innerHTML = '';
    
    mockSchedule.forEach(session => {
        const row = createScheduleRow(session);
        tbody.appendChild(row);
    });
    
    dashboardData.schedule = mockSchedule;
    document.getElementById('invigilatorName').textContent = 'John Smith';
}

// Create schedule row
function createScheduleRow(session) {
    const row = document.createElement('tr');
    
    const roleText = session.is_chief ? 'Chief Invigilator' : 'Assistant';
    const statusBadge = getStatusBadge(session.allocation_status);
    
    row.innerHTML = `
        <td>${formatDate(session.exam_date)}</td>
        <td>${formatTime(session.start_time)} - ${formatTime(session.end_time)}</td>
        <td>${session.course_code} - ${session.course_name}</td>
        <td>${session.room_name}</td>
        <td>${roleText}</td>
        <td>${statusBadge}</td>
        <td>
            <button class="btn btn-sm btn-warning" onclick="reportEmergency(${session.session_id})">Emergency</button>
            <button class="btn btn-sm btn-danger" onclick="reportIncident(${session.session_id})">Incident</button>
            ${session.is_chief ? `<button class="btn btn-sm btn-success" onclick="submitReport(${session.session_id})">Report</button>` : ''}
        </td>
    `;
    
    return row;
}

// Load statistics
async function loadStats() {
    // Calculate stats from schedule
    const schedule = dashboardData.schedule;
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const totalAssignments = schedule.filter(s => new Date(s.exam_date) >= thisMonth).length;
    const upcomingSessions = schedule.filter(s => new Date(s.exam_date) <= nextWeek && new Date(s.exam_date) >= today).length;
    const chiefCount = schedule.filter(s => s.is_chief).length;
    
    document.getElementById('totalAssignments').textContent = totalAssignments;
    document.getElementById('upcomingSessions').textContent = upcomingSessions;
    document.getElementById('chiefCount').textContent = chiefCount;
}

// Populate session select dropdowns
function populateSessionSelects() {
    const selects = [
        'emergencySession',
        'incidentSession',
        'reportSession'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Session</option>';
            dashboardData.schedule.forEach(session => {
                const option = document.createElement('option');
                option.value = session.session_id;
                option.textContent = `${session.course_code} - ${formatDate(session.exam_date)}`;
                select.appendChild(option);
            });
        }
    });
}

// Handle emergency request
async function handleEmergencyRequest(e) {
    e.preventDefault();
    
    const emergencyData = {
        session_id: parseInt(document.getElementById('emergencySession').value),
        incident_type: document.getElementById('emergencyType').value,
        description: document.getElementById('emergencyDescription').value
    };
    
    try {
        // Mock API call for demo
        showSuccess('Emergency request submitted successfully');
        closeModal('emergencyModal');
        document.getElementById('emergencyForm').reset();
    } catch (error) {
        showError('Failed to submit emergency request: ' + error.message);
    }
}

// Handle incident report
async function handleIncidentReport(e) {
    e.preventDefault();
    
    const incidentData = {
        session_id: parseInt(document.getElementById('incidentSession').value),
        incident_type: document.getElementById('incidentType').value,
        description: document.getElementById('incidentDescription').value
    };
    
    try {
        // Mock API call for demo
        showSuccess('Incident reported successfully');
        closeModal('incidentModal');
        document.getElementById('incidentForm').reset();
    } catch (error) {
        showError('Failed to report incident: ' + error.message);
    }
}

// Handle session report
async function handleSessionReport(e) {
    e.preventDefault();
    
    const reportData = {
        session_id: parseInt(document.getElementById('reportSession').value),
        student_count: parseInt(document.getElementById('studentCount').value),
        incidents_occurred: parseInt(document.getElementById('incidentsOccurred').value),
        report_text: document.getElementById('reportText').value
    };
    
    try {
        // Mock API call for demo
        showSuccess('Session report submitted successfully');
        closeModal('reportModal');
        document.getElementById('reportForm').reset();
    } catch (error) {
        showError('Failed to submit session report: ' + error.message);
    }
}

// Quick action functions
function reportEmergency(sessionId) {
    document.getElementById('emergencySession').value = sessionId;
    document.getElementById('emergencyModal').style.display = 'block';
}

function reportIncident(sessionId) {
    document.getElementById('incidentSession').value = sessionId;
    document.getElementById('incidentModal').style.display = 'block';
}

function submitReport(sessionId) {
    document.getElementById('reportSession').value = sessionId;
    document.getElementById('reportModal').style.display = 'block';
}

function showEmergencyModal() {
    document.getElementById('emergencyModal').style.display = 'block';
}

function showIncidentModal() {
    document.getElementById('incidentModal').style.display = 'block';
}

function showReportModal() {
    document.getElementById('reportModal').style.display = 'block';
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
        'assigned': '<span class="badge badge-info">Assigned</span>',
        'completed': '<span class="badge badge-success">Completed</span>',
        'cancelled': '<span class="badge badge-danger'>Cancelled</span>'
    };
    return badges[status] || '<span class="badge badge-warning">Unknown</span>';
}

// Modal functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Message functions
function showSuccess(message) {
    alert('Success: ' + message);
}

function showError(message) {
    alert('Error: ' + message);
}

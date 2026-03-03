-- Invigilator Allocation System Database Schema
-- Based on Entity Relationship Diagram

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- Invigilators table
CREATE TABLE IF NOT EXISTS invigilators (
    invigilator_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL,
    current_workload INTEGER DEFAULT 0,
    user_id INTEGER UNIQUE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    course_name VARCHAR(200) NOT NULL,
    lecturer_id INTEGER,
    FOREIGN KEY (lecturer_id) REFERENCES invigilators(invigilator_id)
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name VARCHAR(50) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL
);

-- Examination Sessions table
CREATE TABLE IF NOT EXISTS examination_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

-- Allocations table
CREATE TABLE IF NOT EXISTS allocations (
    allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invigilator_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'assigned',
    is_chief BOOLEAN DEFAULT 0,
    FOREIGN KEY (invigilator_id) REFERENCES invigilators(invigilator_id),
    FOREIGN KEY (session_id) REFERENCES examination_sessions(session_id),
    UNIQUE(invigilator_id, session_id)
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    reported_by INTEGER NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    description TEXT,
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open',
    FOREIGN KEY (session_id) REFERENCES examination_sessions(session_id),
    FOREIGN KEY (reported_by) REFERENCES users(user_id)
);

-- Session Reports table
CREATE TABLE IF NOT EXISTS session_reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    reported_by INTEGER NOT NULL,
    student_count INTEGER,
    incidents_occurred INTEGER DEFAULT 0,
    report_text TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES examination_sessions(session_id),
    FOREIGN KEY (reported_by) REFERENCES users(user_id)
);

-- Insert default roles
INSERT OR IGNORE INTO roles (role_id, role_name) VALUES 
(1, 'Senior Invigilator'),
(2, 'Assistant Invigilator'),
(3, 'Examination Officer');

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (user_id, username, password, role) VALUES 
(1, 'admin', '$2a$10$9iuQjnAzaQwsWUo.cJrAGe6NuY1h3nJLT9IlgCNyORlGDFBopvfNe', 'Examination Officer');

-- Sample data for testing
INSERT OR IGNORE INTO invigilators (invigilator_id, first_name, last_name, email, department, role_id, user_id) VALUES 
(1, 'John', 'Smith', 'john.smith@college.edu', 'Computer Science', 1, NULL),
(2, 'Jane', 'Doe', 'jane.doe@college.edu', 'Mathematics', 2, NULL),
(3, 'Robert', 'Johnson', 'robert.johnson@college.edu', 'Physics', 1, NULL),
(4, 'Sarah', 'Williams', 'sarah.williams@college.edu', 'Chemistry', 2, NULL);

INSERT OR IGNORE INTO courses (course_id, course_code, course_name, lecturer_id) VALUES 
(1, 'CS101', 'Introduction to Computer Science', 1),
(2, 'MATH201', 'Advanced Mathematics', 2),
(3, 'PHY101', 'Physics Fundamentals', 3);

INSERT OR IGNORE INTO rooms (room_id, room_name, capacity) VALUES 
(1, 'Room A101', 50),
(2, 'Room B205', 30),
(3, 'Lab C301', 25);

INSERT OR IGNORE INTO examination_sessions (session_id, course_id, room_id, exam_date, start_time, end_time) VALUES 
(1, 1, 1, '2024-03-15', '09:00:00', '11:00:00'),
(2, 2, 2, '2024-03-16', '14:00:00', '16:00:00'),
(3, 3, 3, '2024-03-17', '10:00:00', '12:00:00');

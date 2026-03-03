# Invigilator Allocation System

A comprehensive web-based system for managing examination invigilator allocation in educational institutions. This system implements a Three-Tier Architecture with automated allocation algorithms and role-based dashboards.

## Features

### Core Functionality
- **Automated Allocation Engine**: Hybrid Greedy and Constraint Validation Algorithm
- **Role-Based Access Control**: Examination Officer and Invigilator dashboards
- **Real-time Dashboard**: Statistics and schedule management
- **Incident Reporting**: Emergency requests and incident logging
- **Session Management**: Create and manage examination sessions
- **Invigilator Management**: Add and manage invigilator profiles

### Technical Features
- **Three-Tier Architecture**: Presentation, Application, and Data layers
- **RESTful API**: Complete backend API with authentication
- **Responsive Design**: Modern UI using CSS Grid and Flexbox
- **Database Management**: SQLite with relational schema
- **Security**: JWT-based authentication and authorization

## System Architecture

### Presentation Layer
- Web-based user interface
- Role-specific dashboards
- Responsive design for all devices

### Application Layer
- Allocation Engine with constraint validation
- Authentication and authorization modules
- Reporting and emergency processing
- API endpoints for all operations

### Data Layer
- Relational database (SQLite)
- Normalized schema with foreign key constraints
- Data integrity and consistency

## Database Schema

The system implements the following entities:
- **Users**: Authentication and role management
- **Invigilators**: Staff profiles and workload tracking
- **Roles**: Senior/Assistant Invigilator classifications
- **Courses**: Examination subjects and lecturer assignments
- **Rooms**: Physical examination venues
- **Examination Sessions**: Scheduled examination events
- **Allocations**: Invigilator assignments to sessions
- **Incidents**: Emergency and incident reports
- **Session Reports**: Post-examination documentation

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm package manager

### Setup Instructions

1. **Clone or extract the project** to your desired directory

2. **Navigate to the project directory**:
   ```bash
   cd invigilator-system
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Initialize the database**:
   ```bash
   npm run init-db
   ```

5. **Start the application**:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**:
   - Login Page: http://localhost:3000/login
   - Officer Dashboard: http://localhost:3000/officer-dashboard
   - Invigilator Dashboard: http://localhost:3000/invigilator-dashboard

## Default Login Credentials

**Examination Officer:**
- Username: `admin`
- Password: `admin123`

## Usage Guide

### Examination Officer Dashboard

1. **View Statistics**: Monitor total sessions, invigilators, and allocation status
2. **Generate Allocations**: Automatically assign invigilators to unallocated sessions
3. **Add Sessions**: Create new examination sessions with course, date, time, and room details
4. **Add Invigilators**: Register new invigilators with roles and departments
5. **View Allocations**: Check session details and assigned invigilators
6. **Manage Schedules**: View individual invigilator schedules and workloads

### Invigilator Dashboard

1. **View Schedule**: See assigned examination sessions
2. **Report Emergencies**: Submit emergency requests during examinations
3. **Report Incidents**: Document examination incidents
4. **Submit Reports**: Chief invigilators can submit session reports
5. **Track Workload**: Monitor personal assignment statistics

## Allocation Algorithm

The system implements a **Hybrid Greedy and Constraint Validation Algorithm**:

### Algorithm Steps:
1. Retrieve all unallocated examination sessions
2. Get eligible invigilators sorted by workload (ascending)
3. For each session:
   - Select lowest workload Senior Invigilator
   - Select lowest workload Assistant Invigilator
   - Validate constraints:
     - No time conflicts
     - Not course lecturer
     - Role compatibility
   - Assign invigilators and update workloads
   - Designate one invigilator as Chief

### Time Complexity: O(n × m)
- n = number of sessions
- m = number of invigilators

## API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication

### Sessions
- `GET /api/sessions` - Get all examination sessions
- `GET /api/sessions/:id` - Get session details with allocations
- `POST /api/sessions` - Create new examination session

### Invigilators
- `GET /api/invigilators` - Get all invigilators
- `GET /api/invigilators/:id/schedule` - Get invigilator schedule
- `POST /api/invigilators` - Add new invigilator

### Allocations
- `POST /api/allocations/generate` - Generate automatic allocations
- `POST /api/allocations/manual` - Manual allocation
- `GET /api/allocations/session/:sessionId` - Get session allocations

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Project Structure

```
invigilator-system/
├── database/
│   ├── schema.sql          # Database schema
│   ├── init.js            # Database initialization
│   └── data/              # Database files
├── models/
│   ├── Database.js        # Database connection
│   ├── Invigilator.js     # Invigilator model
│   ├── ExaminationSession.js # Session model
│   └── Allocation.js      # Allocation model
├── services/
│   └── AllocationEngine.js # Allocation algorithm
├── routes/
│   ├── auth.js            # Authentication routes
│   └── api.js             # API routes
├── views/
│   ├── login.html         # Login page
│   ├── officer-dashboard.html # Officer dashboard
│   └── invigilator-dashboard.html # Invigilator dashboard
├── public/
│   ├── css/
│   │   └── style.css      # Stylesheets
│   └── js/
│       ├── auth.js        # Authentication utilities
│       ├── officer-dashboard.js # Officer dashboard logic
│       └── invigilator-dashboard.js # Invigilator dashboard logic
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
└── README.md              # This file
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Security**: bcryptjs for password hashing
- **Development**: nodemon for auto-reload

## Contributing

1. Follow the existing code style and structure
2. Test all changes thoroughly
3. Update documentation as needed
4. Ensure database migrations are handled properly

## License

This project is licensed under the MIT License.

## Support

For technical support or questions about the system, please refer to the documentation or contact the development team.

---

**Note**: This is a prototype system designed for demonstration purposes. In a production environment, additional security measures, testing, and scalability considerations should be implemented.

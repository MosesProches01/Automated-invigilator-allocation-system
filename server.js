require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Serve test data page
app.get('/test-data', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-data.html'));
});

// Serve test login page
app.get('/test-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-login.html'));
});

// Serve debug login page
app.get('/debug-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug-login.html'));
});

// Serve debug allocation page
app.get('/debug-allocation', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug-allocation.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Examination Officer Dashboard
app.get('/officer-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'officer-dashboard.html'));
});

// Invigilator Dashboard
app.get('/invigilator-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'invigilator-dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Invigilator Allocation System running on port ${PORT}`);
    console.log(`Login page: http://localhost:${PORT}/login`);
    console.log(`Officer Dashboard: http://localhost:${PORT}/officer-dashboard`);
    console.log(`Invigilator Dashboard: http://localhost:${PORT}/invigilator-dashboard`);
});

module.exports = app;

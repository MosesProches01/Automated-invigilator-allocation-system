const express = require('express');
const Invigilator = require('../models/Invigilator');
const ExaminationSession = require('../models/ExaminationSession');
const Allocation = require('../models/Allocation');
const AllocationEngine = require('../services/AllocationEngine');
const { authenticateToken, requireExaminationOfficer } = require('./auth');

const router = express.Router();
const allocationEngine = new AllocationEngine();

// Get all invigilators
router.get('/invigilators', authenticateToken, async (req, res) => {
    try {
        const invigilators = await Invigilator.getAll();
        res.json(invigilators);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public test endpoint for invigilators
router.get('/test/invigilators', async (req, res) => {
    try {
        const invigilators = await Invigilator.getAll();
        res.json(invigilators);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all examination sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await ExaminationSession.getAll();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public test endpoint for sessions
router.get('/test/sessions', async (req, res) => {
    try {
        const sessions = await ExaminationSession.getAll();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get session details with allocations
router.get('/sessions/:id', authenticateToken, async (req, res) => {
    try {
        const session = await ExaminationSession.getById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const allocations = await Allocation.getBySession(req.params.id);
        res.json({ ...session, allocations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate automatic allocations
router.post('/allocations/generate', authenticateToken, requireExaminationOfficer, async (req, res) => {
    try {
        const results = await allocationEngine.generateAllocations();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual allocation
router.post('/allocations/manual', authenticateToken, requireExaminationOfficer, async (req, res) => {
    try {
        const { sessionId, invigilatorIds, chiefInvigilatorId } = req.body;
        
        if (!sessionId || !invigilatorIds || invigilatorIds.length === 0) {
            return res.status(400).json({ error: 'Session ID and invigilator IDs are required' });
        }

        const result = await allocationEngine.manualAllocation(sessionId, invigilatorIds, chiefInvigilatorId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get allocations for a session
router.get('/allocations/session/:sessionId', authenticateToken, async (req, res) => {
    try {
        const allocations = await Allocation.getBySession(req.params.sessionId);
        res.json(allocations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get invigilator schedule
router.get('/invigilators/:id/schedule', authenticateToken, async (req, res) => {
    try {
        const schedule = await Invigilator.getSchedule(req.params.id);
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new examination session
router.post('/sessions', authenticateToken, requireExaminationOfficer, async (req, res) => {
    try {
        const { course_id, room_id, exam_date, start_time, end_time } = req.body;
        
        if (!course_id || !room_id || !exam_date || !start_time || !end_time) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const sessionId = await ExaminationSession.create({
            course_id,
            room_id,
            exam_date,
            start_time,
            end_time
        });

        res.json({ sessionId, message: 'Session created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new invigilator
router.post('/invigilators', authenticateToken, requireExaminationOfficer, async (req, res) => {
    try {
        const { first_name, last_name, email, department, role_id } = req.body;
        
        if (!first_name || !last_name || !email || !department || !role_id) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const invigilatorId = await Invigilator.create({
            first_name,
            last_name,
            email,
            department,
            role_id
        });

        res.json({ invigilatorId, message: 'Invigilator created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const db = require('../models/Database');
        
        const totalSessions = await db.get('SELECT COUNT(*) as count FROM examination_sessions');
        const totalInvigilators = await db.get('SELECT COUNT(*) as count FROM invigilators');
        const allocatedSessions = await db.get(`
            SELECT COUNT(DISTINCT session_id) as count 
            FROM allocations
        `);
        const pendingSessions = await db.get(`
            SELECT COUNT(*) as count 
            FROM examination_sessions 
            WHERE session_id NOT IN (SELECT DISTINCT session_id FROM allocations)
        `);

        res.json({
            totalSessions: totalSessions.count,
            totalInvigilators: totalInvigilators.count,
            allocatedSessions: allocatedSessions.count,
            pendingSessions: pendingSessions.count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

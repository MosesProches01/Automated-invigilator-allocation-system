const db = require('./Database');

class ExaminationSession {
    static async getAll() {
        const sql = `
            SELECT es.*, c.course_code, c.course_name, r.room_name, r.capacity
            FROM examination_sessions es
            JOIN courses c ON es.course_id = c.course_id
            JOIN rooms r ON es.room_id = r.room_id
            ORDER BY es.exam_date, es.start_time
        `;
        return await db.all(sql);
    }

    static async getById(id) {
        const sql = `
            SELECT es.*, c.course_code, c.course_name, r.room_name, r.capacity
            FROM examination_sessions es
            JOIN courses c ON es.course_id = c.course_id
            JOIN rooms r ON es.room_id = r.room_id
            WHERE es.session_id = ?
        `;
        return await db.get(sql, [id]);
    }

    static async create(session) {
        const sql = `
            INSERT INTO examination_sessions (course_id, room_id, exam_date, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, 'scheduled')
        `;
        const result = await db.run(sql, [
            session.course_id,
            session.room_id,
            session.exam_date,
            session.start_time,
            session.end_time
        ]);
        return result.id;
    }

    static async updateStatus(sessionId, status) {
        const sql = 'UPDATE examination_sessions SET status = ? WHERE session_id = ?';
        await db.run(sql, [status, sessionId]);
    }

    static async getAllocations(sessionId) {
        const sql = `
            SELECT a.*, i.first_name, i.last_name, i.email, r.role_name
            FROM allocations a
            JOIN invigilators i ON a.invigilator_id = i.invigilator_id
            JOIN roles r ON i.role_id = r.role_id
            WHERE a.session_id = ?
            ORDER BY a.is_chief DESC, r.role_name
        `;
        return await db.all(sql, [sessionId]);
    }

    static async getUnallocatedSessions() {
        const sql = `
            SELECT es.*, c.course_code, c.course_name, r.room_name
            FROM examination_sessions es
            JOIN courses c ON es.course_id = c.course_id
            JOIN rooms r ON es.room_id = r.room_id
            WHERE es.session_id NOT IN (
                SELECT DISTINCT session_id FROM allocations
            )
            ORDER BY es.exam_date, es.start_time
        `;
        return await db.all(sql);
    }

    static async checkTimeConflict(invigilatorId, examDate, startTime, endTime, excludeSessionId = null) {
        let sql = `
            SELECT COUNT(*) as count
            FROM examination_sessions es
            JOIN allocations a ON es.session_id = a.session_id
            WHERE a.invigilator_id = ? 
            AND es.exam_date = ?
            AND (
                (es.start_time < ? AND es.end_time > ?) OR
                (es.start_time < ? AND es.end_time > ?) OR
                (es.start_time >= ? AND es.end_time <= ?)
            )
        `;
        let params = [invigilatorId, examDate, startTime, startTime, endTime, endTime, startTime, endTime];

        if (excludeSessionId) {
            sql += ' AND es.session_id != ?';
            params.push(excludeSessionId);
        }

        const result = await db.get(sql, params);
        return result.count > 0;
    }
}

module.exports = ExaminationSession;

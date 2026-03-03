const db = require('./Database');

class Allocation {
    static async create(allocation) {
        const sql = `
            INSERT INTO allocations (invigilator_id, session_id, status, is_chief)
            VALUES (?, ?, ?, ?)
        `;
        const result = await db.run(sql, [
            allocation.invigilator_id,
            allocation.session_id,
            allocation.status || 'assigned',
            allocation.is_chief || 0
        ]);
        return result.id;
    }

    static async getBySession(sessionId) {
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

    static async getByInvigilator(invigilatorId) {
        const sql = `
            SELECT a.*, es.exam_date, es.start_time, es.end_time,
                   c.course_code, c.course_name, r.room_name
            FROM allocations a
            JOIN examination_sessions es ON a.session_id = es.session_id
            JOIN courses c ON es.course_id = c.course_id
            JOIN rooms r ON es.room_id = r.room_id
            WHERE a.invigilator_id = ?
            ORDER BY es.exam_date, es.start_time
        `;
        return await db.all(sql, [invigilatorId]);
    }

    static async updateStatus(allocationId, status) {
        const sql = 'UPDATE allocations SET status = ? WHERE allocation_id = ?';
        await db.run(sql, [status, allocationId]);
    }

    static async delete(allocationId) {
        const sql = 'DELETE FROM allocations WHERE allocation_id = ?';
        await db.run(sql, [allocationId]);
    }

    static async deleteBySession(sessionId) {
        const sql = 'DELETE FROM allocations WHERE session_id = ?';
        await db.run(sql, [sessionId]);
    }

    static async exists(invigilatorId, sessionId) {
        const sql = 'SELECT COUNT(*) as count FROM allocations WHERE invigilator_id = ? AND session_id = ?';
        const result = await db.get(sql, [invigilatorId, sessionId]);
        return result.count > 0;
    }

    static async getChiefInvigilator(sessionId) {
        const sql = `
            SELECT i.*
            FROM allocations a
            JOIN invigilators i ON a.invigilator_id = i.invigilator_id
            WHERE a.session_id = ? AND a.is_chief = 1
        `;
        return await db.get(sql, [sessionId]);
    }
}

module.exports = Allocation;

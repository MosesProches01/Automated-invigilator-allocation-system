const db = require('./Database');

class Invigilator {
    static async getAll() {
        const sql = `
            SELECT i.*, r.role_name 
            FROM invigilators i 
            JOIN roles r ON i.role_id = r.role_id 
            ORDER BY i.current_workload ASC
        `;
        return await db.all(sql);
    }

    static async getById(id) {
        const sql = `
            SELECT i.*, r.role_name 
            FROM invigilators i 
            JOIN roles r ON i.role_id = r.role_id 
            WHERE i.invigilator_id = ?
        `;
        return await db.get(sql, [id]);
    }

    static async create(invigilator) {
        const sql = `
            INSERT INTO invigilators (first_name, last_name, email, department, role_id, current_workload)
            VALUES (?, ?, ?, ?, ?, 0)
        `;
        const result = await db.run(sql, [
            invigilator.first_name,
            invigilator.last_name,
            invigilator.email,
            invigilator.department,
            invigilator.role_id
        ]);
        return result.id;
    }

    static async updateWorkload(invigilatorId, workload) {
        const sql = 'UPDATE invigilators SET current_workload = ? WHERE invigilator_id = ?';
        await db.run(sql, [workload, invigilatorId]);
    }

    static async getAvailableForSession(sessionId) {
        const sql = `
            SELECT i.*, r.role_name 
            FROM invigilators i 
            JOIN roles r ON i.role_id = r.role_id 
            WHERE i.invigilator_id NOT IN (
                SELECT a.invigilator_id 
                FROM allocations a 
                JOIN examination_sessions es ON a.session_id = es.session_id 
                WHERE es.session_id = ?
            )
            ORDER BY i.current_workload ASC
        `;
        return await db.all(sql, [sessionId]);
    }

    static async getSchedule(invigilatorId) {
        const sql = `
            SELECT es.*, c.course_code, c.course_name, r.room_name,
                   a.is_chief, a.status as allocation_status
            FROM examination_sessions es
            JOIN allocations a ON es.session_id = a.session_id
            JOIN courses c ON es.course_id = c.course_id
            JOIN rooms r ON es.room_id = r.room_id
            WHERE a.invigilator_id = ?
            ORDER BY es.exam_date, es.start_time
        `;
        return await db.all(sql, [invigilatorId]);
    }
}

module.exports = Invigilator;

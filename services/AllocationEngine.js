const Invigilator = require('../models/Invigilator');
const ExaminationSession = require('../models/ExaminationSession');
const Allocation = require('../models/Allocation');

class AllocationEngine {
    constructor() {
        this.constraints = {
            MAX_SESSIONS_PER_DAY: 3,
            MIN_SESSIONS_BETWEEN: 2, // hours
            REQUIRED_SENIOR_COUNT: 1,
            REQUIRED_ASSISTANT_COUNT: 1
        };
    }

    async generateAllocations() {
        try {
            const sessions = await ExaminationSession.getUnallocatedSessions();
            const invigilators = await Invigilator.getAll();
            
            const results = {
                success: [],
                failed: [],
                total: sessions.length
            };

            for (const session of sessions) {
                try {
                    const allocation = await this.allocateSession(session, invigilators);
                    if (allocation.success) {
                        results.success.push({
                            sessionId: session.session_id,
                            allocations: allocation.allocations
                        });
                    } else {
                        results.failed.push({
                            sessionId: session.session_id,
                            reason: allocation.reason
                        });
                    }
                } catch (error) {
                    results.failed.push({
                        sessionId: session.session_id,
                        reason: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Allocation generation failed: ${error.message}`);
        }
    }

    async allocateSession(session, allInvigilators) {
        const eligibleInvigilators = await this.getEligibleInvigilators(session, allInvigilators);
        
        const seniors = eligibleInvigilators.filter(i => i.role_name === 'Senior Invigilator');
        const assistants = eligibleInvigilators.filter(i => i.role_name === 'Assistant Invigilator');

        if (seniors.length === 0) {
            return { success: false, reason: 'No senior invigilators available' };
        }

        if (assistants.length === 0) {
            return { success: false, reason: 'No assistant invigilators available' };
        }

        // Sort by workload (ascending)
        seniors.sort((a, b) => a.current_workload - b.current_workload);
        assistants.sort((a, b) => a.current_workload - b.current_workload);

        const allocations = [];

        try {
            // Select senior invigilator (lowest workload)
            const senior = seniors[0];
            const seniorAllocation = await Allocation.create({
                invigilator_id: senior.invigilator_id,
                session_id: session.session_id,
                is_chief: 1,
                status: 'assigned'
            });
            allocations.push(seniorAllocation);

            // Update workload
            await Invigilator.updateWorkload(senior.invigilator_id, senior.current_workload + 1);

            // Select assistant invigilator (lowest workload)
            const assistant = assistants[0];
            const assistantAllocation = await Allocation.create({
                invigilator_id: assistant.invigilator_id,
                session_id: session.session_id,
                is_chief: 0,
                status: 'assigned'
            });
            allocations.push(assistantAllocation);

            // Update workload
            await Invigilator.updateWorkload(assistant.invigilator_id, assistant.current_workload + 1);

            return { success: true, allocations };
        } catch (error) {
            // Rollback on failure
            await this.rollbackAllocations(allocations);
            throw error;
        }
    }

    async getEligibleInvigilators(session, allInvigilators) {
        const eligible = [];

        for (const invigilator of allInvigilators) {
            if (await this.isInvigilatorEligible(invigilator, session)) {
                eligible.push(invigilator);
            }
        }

        return eligible;
    }

    async isInvigilatorEligible(invigilator, session) {
        // Check if invigilator is the course lecturer
        const course = await this.getCourseDetails(session.course_id);
        if (course.lecturer_id === invigilator.invigilator_id) {
            return false;
        }

        // Check for time conflicts
        const hasConflict = await ExaminationSession.checkTimeConflict(
            invigilator.invigilator_id,
            session.exam_date,
            session.start_time,
            session.end_time
        );

        if (hasConflict) {
            return false;
        }

        // Check workload constraints
        const todaySessions = await this.getTodaySessions(invigilator.invigilator_id, session.exam_date);
        if (todaySessions.length >= this.constraints.MAX_SESSIONS_PER_DAY) {
            return false;
        }

        return true;
    }

    async getCourseDetails(courseId) {
        const db = require('../models/Database');
        const sql = 'SELECT * FROM courses WHERE course_id = ?';
        return await db.get(sql, [courseId]);
    }

    async getTodaySessions(invigilatorId, examDate) {
        const db = require('../models/Database');
        const sql = `
            SELECT es.* FROM examination_sessions es
            JOIN allocations a ON es.session_id = a.session_id
            WHERE a.invigilator_id = ? AND es.exam_date = ?
        `;
        return await db.all(sql, [invigilatorId, examDate]);
    }

    async rollbackAllocations(allocations) {
        try {
            for (const allocation of allocations) {
                await Allocation.delete(allocation.allocation_id);
            }
        } catch (error) {
            console.error('Rollback failed:', error);
        }
    }

    async manualAllocation(sessionId, invigilatorIds, chiefInvigilatorId = null) {
        try {
            const session = await ExaminationSession.getById(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            const allocations = [];
            const invigilators = await Invigilator.getAll();

            for (const invigilatorId of invigilatorIds) {
                const invigilator = invigilators.find(i => i.invigilator_id === invigilatorId);
                if (!invigilator) {
                    throw new Error(`Invigilator ${invigilatorId} not found`);
                }

                if (!(await this.isInvigilatorEligible(invigilator, session))) {
                    throw new Error(`Invigilator ${invigilator.first_name} ${invigilator.last_name} is not eligible for this session`);
                }

                const isChief = chiefInvigilatorId === invigilatorId;
                
                const allocation = await Allocation.create({
                    invigilator_id: invigilatorId,
                    session_id: sessionId,
                    is_chief: isChief ? 1 : 0,
                    status: 'assigned'
                });

                allocations.push(allocation);
                await Invigilator.updateWorkload(invigilatorId, invigilator.current_workload + 1);
            }

            return { success: true, allocations };
        } catch (error) {
            await this.rollbackAllocations(allocations);
            throw error;
        }
    }
}

module.exports = AllocationEngine;

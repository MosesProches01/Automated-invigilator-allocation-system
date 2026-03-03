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
            console.log('Starting allocation generation...');
            
            const sessions = await ExaminationSession.getUnallocatedSessions();
            const invigilators = await Invigilator.getAll();
            
            // Debug: Log what we found
            console.log('Unallocated sessions type:', typeof sessions);
            console.log('Unallocated sessions:', sessions);
            console.log('All invigilators type:', typeof invigilators);
            console.log('All invigilators:', invigilators);
            
            // Handle null/undefined responses
            if (!sessions) {
                console.log('Sessions is null/undefined, using empty array');
                sessions = [];
            }
            if (!invigilators) {
                console.log('Invigilators is null/undefined, using empty array');
                invigilators = [];
            }
            
            // Ensure we have arrays
            if (!Array.isArray(sessions)) {
                console.error('Sessions is not an array, converting...');
                sessions = Array.isArray(sessions) ? sessions : [];
            }
            if (!Array.isArray(invigilators)) {
                console.error('Invigilators is not an array, converting...');
                invigilators = Array.isArray(invigilators) ? invigilators : [];
            }
            
            console.log('Final sessions count:', sessions.length);
            console.log('Final invigilators count:', invigilators.length);
            
            const results = {
                success: [],
                failed: [],
                total: sessions ? sessions.length : 0
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
        
        // Debug: Log eligible invigilators
        console.log('Eligible invigilators:', eligibleInvigilators);
        
        // Filter by role_id instead of role_name to avoid undefined issues
        const seniors = eligibleInvigilators.filter(i => i.role_id === 1);
        const assistants = eligibleInvigilators.filter(i => i.role_id === 2);

        console.log('Seniors found:', seniors.length);
        console.log('Assistants found:', assistants.length);

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
            console.log('Creating allocation for senior:', senior.first_name, senior.last_name);
            
            const seniorAllocation = await this.retryOperation(() => 
                Allocation.create({
                    invigilator_id: senior.invigilator_id,
                    session_id: session.session_id,
                    is_chief: 1,
                    status: 'assigned'
                })
            );
            allocations.push(seniorAllocation);

            // Update workload
            await this.retryOperation(() => 
                Invigilator.updateWorkload(senior.invigilator_id, senior.current_workload + 1)
            );

            // Select assistant invigilator (lowest workload)
            const assistant = assistants[0];
            console.log('Creating allocation for assistant:', assistant.first_name, assistant.last_name);
            
            const assistantAllocation = await this.retryOperation(() => 
                Allocation.create({
                    invigilator_id: assistant.invigilator_id,
                    session_id: session.session_id,
                    is_chief: 0,
                    status: 'assigned'
                })
            );
            allocations.push(assistantAllocation);

            // Update workload
            await this.retryOperation(() => 
                Invigilator.updateWorkload(assistant.invigilator_id, assistant.current_workload + 1)
            );

            console.log('Session allocation completed successfully');
            return { success: true, allocations };
        } catch (error) {
            console.error('Allocation failed for session:', session.session_id, error);
            // Rollback on failure
            await this.rollbackAllocations(allocations);
            throw error;
        }
    }

    async getEligibleInvigilators(session, allInvigilators) {
        const eligible = [];
        
        console.log('Checking eligibility for session:', session.session_id);
        console.log('Total invigilators to check:', allInvigilators?.length || 0);

        // Ensure allInvigilators is an array
        if (!Array.isArray(allInvigilators)) {
            console.error('allInvigilators is not an array:', allInvigilators);
            return eligible;
        }

        for (const invigilator of allInvigilators) {
            try {
                if (await this.isInvigilatorEligible(invigilator, session)) {
                    eligible.push(invigilator);
                    console.log(`Invigilator ${invigilator.first_name} ${invigilator.last_name} is eligible`);
                } else {
                    console.log(`Invigilator ${invigilator.first_name} ${invigilator.last_name} is not eligible`);
                }
            } catch (error) {
                console.error(`Error checking eligibility for invigilator ${invigilator.invigilator_id}:`, error);
            }
        }

        console.log(`Found ${eligible.length} eligible invigilators`);
        return eligible;
    }

    async isInvigilatorEligible(invigilator, session) {
        try {
            console.log(`Checking eligibility for invigilator ${invigilator.invigilator_id} and session ${session.session_id}`);
            
            // Check if invigilator is the course lecturer
            const course = await this.getCourseDetails(session.course_id);
            console.log('Course details:', course);
            
            if (course && course.lecturer_id === invigilator.invigilator_id) {
                console.log('Invigilator is course lecturer, not eligible');
                return false;
            }

            // Check for time conflicts
            const hasConflict = await ExaminationSession.checkTimeConflict(
                invigilator.invigilator_id,
                session.exam_date,
                session.start_time,
                session.end_time
            );

            console.log('Time conflict:', hasConflict);
            if (hasConflict) {
                console.log('Invigilator has time conflict, not eligible');
                return false;
            }

            // Check workload constraints
            const todaySessions = await this.getTodaySessions(invigilator.invigilator_id, session.exam_date);
            console.log('Today sessions:', todaySessions);
            console.log('Today sessions length:', todaySessions ? todaySessions.length : 'undefined');
            
            // Handle undefined todaySessions
            if (!todaySessions || !Array.isArray(todaySessions)) {
                console.log('Today sessions is not a valid array, treating as 0');
                todaySessions = [];
            }
            
            if (todaySessions.length >= this.constraints.MAX_SESSIONS_PER_DAY) {
                console.log('Invigilator has too many sessions today, not eligible');
                return false;
            }

            console.log('Invigilator is eligible');
            return true;
        } catch (error) {
            console.error('Error in eligibility check:', error);
            return false;
        }
    }

    async getCourseDetails(courseId) {
        const db = require('../models/Database');
        const sql = 'SELECT * FROM courses WHERE course_id = ?';
        return await db.get(sql, [courseId]);
    }

    async getTodaySessions(invigilatorId, examDate) {
        try {
            const db = require('../models/Database');
            const sql = `
                SELECT es.* FROM examination_sessions es
                JOIN allocations a ON es.session_id = a.session_id
                WHERE a.invigilator_id = ? AND es.exam_date = ?
            `;
            const result = await db.all(sql, [invigilatorId, examDate]);
            console.log(`Today sessions for invigilator ${invigilatorId}:`, result);
            return result || [];
        } catch (error) {
            console.error('Error getting today sessions:', error);
            return [];
        }
    }

    async retryOperation(operation, maxRetries = 3, delay = 100) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.log(`Operation attempt ${attempt} failed:`, error.message);
                
                if (error.message.includes('SQLITE_BUSY') && attempt < maxRetries) {
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    throw error;
                }
            }
        }
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

    // Method to match API call - simplified version without transactions
    async generateAllAllocations() {
        try {
            console.log('Starting simplified allocation generation...');
            
            const sessions = await ExaminationSession.getUnallocatedSessions();
            const invigilators = await Invigilator.getAll();
            
            console.log('Found sessions:', sessions.length);
            console.log('Found invigilators:', invigilators.length);
            
            if (!sessions || !invigilators || sessions.length === 0 || invigilators.length === 0) {
                return {
                    success: [],
                    failed: sessions ? sessions.map(s => ({ sessionId: s.session_id, reason: 'No data available' })) : [],
                    total: 0
                };
            }
            
            const results = {
                success: [],
                failed: [],
                total: sessions.length
            };

            // Process each session individually without transactions
            for (const session of sessions) {
                try {
                    console.log('Processing session:', session.session_id);
                    
                    const seniors = invigilators.filter(i => i.role_id === 1);
                    const assistants = invigilators.filter(i => i.role_id === 2);
                    
                    console.log('Available seniors:', seniors.length);
                    console.log('Available assistants:', assistants.length);
                    
                    if (seniors.length === 0 || assistants.length === 0) {
                        results.failed.push({
                            sessionId: session.session_id,
                            reason: seniors.length === 0 ? 'No senior invigilators available' : 'No assistant invigilators available'
                        });
                        continue;
                    }
                    
                    // Select invigilators (simple workload-based selection)
                    const senior = seniors.reduce((min, inv) => inv.current_workload < min.current_workload ? inv : min);
                    const assistant = assistants.reduce((min, inv) => inv.current_workload < min.current_workload ? inv : min);
                    
                    console.log('Selected senior:', senior.first_name);
                    console.log('Selected assistant:', assistant.first_name);
                    
                    // Create allocations individually with retry
                    const seniorAllocation = await this.retryOperation(() => 
                        Allocation.create({
                            invigilator_id: senior.invigilator_id,
                            session_id: session.session_id,
                            is_chief: 1,
                            status: 'assigned'
                        })
                    );
                    
                    const assistantAllocation = await this.retryOperation(() => 
                        Allocation.create({
                            invigilator_id: assistant.invigilator_id,
                            session_id: session.session_id,
                            is_chief: 0,
                            status: 'assigned'
                        })
                    );
                    
                    // Update workloads
                    await this.retryOperation(() => 
                        Invigilator.updateWorkload(senior.invigilator_id, senior.current_workload + 1)
                    );
                    
                    await this.retryOperation(() => 
                        Invigilator.updateWorkload(assistant.invigilator_id, assistant.current_workload + 1)
                    );
                    
                    results.success.push({
                        sessionId: session.session_id,
                        allocations: [seniorAllocation, assistantAllocation]
                    });
                    
                    console.log('✅ Successfully allocated session:', session.session_id);
                    
                } catch (error) {
                    console.error('❌ Failed to allocate session:', session.session_id, error.message);
                    results.failed.push({
                        sessionId: session.session_id,
                        reason: error.message
                    });
                }
            }
            
            console.log('Allocation generation completed');
            console.log('Success:', results.success.length);
            console.log('Failed:', results.failed.length);
            
            return results;
            
        } catch (error) {
            console.error('Allocation generation failed:', error);
            throw new Error(`Allocation generation failed: ${error.message}`);
        }
    }

    // Method for individual session allocation
    async allocateForSession(sessionId) {
        try {
            const session = await ExaminationSession.getById(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            const invigilators = await Invigilator.getAll();
            const result = await this.allocateSession(session, invigilators);
            
            if (result.success) {
                return {
                    success: true,
                    sessionId: sessionId,
                    allocations: result.allocations
                };
            } else {
                throw new Error(result.reason);
            }
        } catch (error) {
            throw new Error(`Allocation for session ${sessionId} failed: ${error.message}`);
        }
    }
}

module.exports = AllocationEngine;

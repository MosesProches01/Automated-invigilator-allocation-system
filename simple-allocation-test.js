// Simple allocation test with transaction
const database = require('./models/Database');

async function testSimpleAllocation() {
    const db = database.db;
    
    try {
        console.log('Starting simple allocation test...');
        
        // Begin transaction
        await database.run('BEGIN TRANSACTION');
        
        // Get sessions
        const sessions = await database.all(`
            SELECT es.*, c.course_code, c.course_name, r.room_name
            FROM examination_sessions es
            JOIN courses c ON es.course_id = c.course_id
            JOIN rooms r ON es.room_id = r.room_id
            WHERE es.session_id NOT IN (
                SELECT DISTINCT session_id FROM allocations
            )
            ORDER BY es.exam_date, es.start_time
        `);
        
        console.log('Found sessions:', sessions.length);
        
        // Get invigilators
        const invigilators = await database.all(`
            SELECT i.*, r.role_name 
            FROM invigilators i 
            JOIN roles r ON i.role_id = r.role_id 
            ORDER BY i.current_workload ASC
        `);
        
        console.log('Found invigilators:', invigilators.length);
        
        // Allocate first session
        if (sessions.length > 0 && invigilators.length > 0) {
            const session = sessions[0];
            const seniors = invigilators.filter(i => i.role_id === 1);
            const assistants = invigilators.filter(i => i.role_id === 2);
            
            console.log('Seniors:', seniors.length);
            console.log('Assistants:', assistants.length);
            
            if (seniors.length > 0 && assistants.length > 0) {
                const senior = seniors[0];
                const assistant = assistants[0];
                
                console.log('Allocating:', senior.first_name, 'and', assistant.first_name);
                
                // Create allocations
                const seniorResult = await database.run(`
                    INSERT INTO allocations (invigilator_id, session_id, status, is_chief)
                    VALUES (?, ?, 'assigned', 1)
                `, [senior.invigilator_id, session.session_id]);
                
                const assistantResult = await database.run(`
                    INSERT INTO allocations (invigilator_id, session_id, status, is_chief)
                    VALUES (?, ?, 'assigned', 0)
                `, [assistant.invigilator_id, session.session_id]);
                
                // Update workloads
                await database.run(`
                    UPDATE invigilators SET current_workload = current_workload + 1
                    WHERE invigilator_id = ?
                `, [senior.invigilator_id]);
                
                await database.run(`
                    UPDATE invigilators SET current_workload = current_workload + 1
                    WHERE invigilator_id = ?
                `, [assistant.invigilator_id]);
                
                console.log('Allocation successful!');
                console.log('Senior allocation ID:', seniorResult.id);
                console.log('Assistant allocation ID:', assistantResult.id);
            }
        }
        
        // Commit transaction
        await database.run('COMMIT');
        console.log('Transaction committed successfully');
        
    } catch (error) {
        console.error('Error:', error);
        await database.run('ROLLBACK');
        console.log('Transaction rolled back');
    }
    
    process.exit(0);
}

testSimpleAllocation();

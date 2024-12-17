const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();

/* post: program */
router.post('/register-program', async (req, res) => {
    try {
        const { program_code, program_name, department_id, status } = req.body;
        
        const insertProgramQuery = 'INSERT INTO program (program_code, program_name, department_id, status) VALUES (?, ?, ?, ?)';
        await db.promise().execute(insertProgramQuery, [program_code, program_name, department_id, status]);

        res.status(201).json({ message: 'Program registered successfully' });
    } catch (error) {
        console.error('Error registering program:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: 1 program */
router.get('/program/:id', (req, res) => {
    let program_id = req.params.id;

    if (!program_id) {
        return res.status(400).send({ error: true, message: 'Please provide program_id' });
    }

    try {
        const query = `
            SELECT 
                p.program_id, 
                p.program_code, 
                p.program_name, 
                d.department_name, 
                p.status 
            FROM 
                program p
            JOIN 
                department d 
            ON 
                p.department_id = d.department_id
            WHERE 
                p.program_id = ?`;

        db.query(query, [program_id], (err, result) => {
            if (err) {
                console.error('Error fetching program:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else if (result.length === 0) {
                res.status(404).json({ error: true, message: 'Program not found' });
            } else {
                res.status(200).json(result[0]);
            }
        });
    } catch (error) {
        console.error('Error loading program:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: programs */
router.get('/programs', (req, res) => {
    try {
        // Modify the SQL query to join the program table with the department table
        const query = `
            SELECT 
                program.program_id,
                program.program_name,
                program.program_code,
                department.department_name,
                program.status
            FROM program
            JOIN department ON program.department_id = department.department_id;
        `;

        db.query(query, (err, result) => {
            if (err) {
                console.error('Error fetching programs:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading programs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* Get: programs by department_id  */
router.get('/programs/:department_id', async (req, res) => {
    const department_id = req.params.department_id;

    if (!department_id) {
        return res.status(400).json({ error: 'Please provide department_id' });
    }

    try {
        // Fetch programs from the program table and include department_id and department_name from department table
        const [programs] = await db.promise().query(`
            SELECT p.program_id, p.program_name, d.department_id, d.department_name
            FROM program p
            JOIN department d ON p.department_id = d.department_id
            WHERE p.department_id = ?
        `, [department_id]);

        if (programs.length === 0) {
            return res.status(404).json({ error: 'No programs found for this department' });
        }

        res.status(200).json(programs); // Return the list of programs
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* put: program */
router.put('/program/:id', async (req, res) => {
    let program_id = req.params.id;
    const { program_code, program_name, status, department_name } = req.body;

    if (!program_id || !program_code || !program_name || !status || !department_name) {
        return res.status(400).send({ error: true, message: 'Please provide all required information' });
    }

    try {
        // First, fetch the department_id based on department_name
        db.query('SELECT department_id FROM department WHERE department_name = ?', [department_name], (err, result) => {
            if (err) {
                console.error('Error fetching department_id:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(400).send({ error: true, message: 'Department not found' });
            }

            // Now, update the program with the department_id
            const department_id = result[0].department_id;

            db.query('UPDATE program SET program_code = ?, program_name = ?, status = ?, department_id = ? WHERE program_id = ?', [program_code, program_name, status, department_id, program_id], (err, result) => {
                if (err) {
                    console.error('Error updating program:', err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json({ message: 'Program updated successfully', result });
                }
            });
        });
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* delete: program */
router.delete('/program/:id', async (req, res) => {
    let program_id = req.params.id;

    if (!program_id) {
        return res.status(400).send({ error: true, message: 'Please provide program_id' });
    }

    try {
        const deleteProgramQuery = 'DELETE FROM program WHERE program_id = ?';
        const [result] = await db.promise().execute(deleteProgramQuery, [program_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Program not found' });
        }

        res.status(200).json({ message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

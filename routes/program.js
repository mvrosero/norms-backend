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
        db.query('SELECT program_id, program_code, program_name, department_id, status FROM program WHERE program_id = ?', program_id, (err, result) => {
            if (err) {
                console.error('Error fetching program:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
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
        db.query('SELECT * FROM program', (err, result) => {
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

/* put: program */
router.put('/program/:id', async (req, res) => {
    let program_id = req.params.id;
    const { program_code, program_name, status, department_id } = req.body;

    if (!program_id || !program_code || !program_name || !status || !department_id) {
        return res.status(400).send({ error: true, message: 'Please provide all required information' });
    }

    try {
        db.query('UPDATE program SET program_code = ?, program_name = ?, status = ?, department_id = ? WHERE program_id = ?', [program_code, program_name, status, department_id, program_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating program:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json({ message: 'Program updated successfully', result });
            }
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

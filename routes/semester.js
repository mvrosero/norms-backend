const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();

/* post: semester */
router.post('/register-semester', async (req, res) => {
    try {
        const { semester_name, status } = req.body;
        
        const insertSemesterQuery = 'INSERT INTO semester (semester_name, status) VALUES (?, ?)';
        await db.promise().execute(insertSemesterQuery, [semester_name, status]);

        res.status(201).json({ message: 'Semester registered successfully' });
    } catch (error) {
        console.error('Error registering semester:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get: 1 semester */
router.get('/semester/:id', (req, res) => {
    let semester_id = req.params.id;

    if (!semester_id) {
        return res.status(400).send({ error: true, message: 'Please provide semester_id' });
    }

    try {
        db.query('SELECT semester_id, semester_name, status FROM semester WHERE semester_id = ?', semester_id, (err, result) => {
            if (err) {
                console.error('Error fetching semester:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading semester:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get: semesters */
router.get('/semesters', (req, res) => {
    try {
        db.query('SELECT * FROM semester', (err, result) => {
            if (err) {
                console.error('Error fetching semesters:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading semesters:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* delete: semester */
router.delete('/semester/:id', (req, res) => {
    let semester_id = req.params.id;

    if (!semester_id) {
        return res.status(400).send({ error: true, message: 'Please provide semester_id' });
    }

    try {
        db.query('DELETE FROM semester WHERE semester_id = ?', semester_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting semester:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading semester:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

module.exports = router;

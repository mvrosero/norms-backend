const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: violation record*/
router.post('/create-violationrecord', async (req, res) => {
    try {
        const { user_id, description, created_by, category_id, offense_id, sanction_id, acadyear_id, semester_id } = req.body;

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertViolationQuery = 'INSERT INTO violation_record (user_id, description, created_by, created_at, category_id, offense_id, sanction_id, acadyear_id, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        await db.promise().execute(insertViolationQuery, [user_id, description, created_by, currentTimestamp, category_id, offense_id, sanction_id, acadyear_id, semester_id]);

        res.status(201).json({ message: 'Violation recorded successfully' });
    } catch (error) {
        console.error('Error registering violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 violation*/
router.get('/violation_record/:user_id', (req, res) => {
    let user_id = req.params.user_id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide student_id' });
    }

    try {
        db.query('SELECT * FROM violation_record WHERE user_id = ?', user_id, (err, result) => {
            if (err) {
                console.error('Error fetching violation records:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: violations*/
router.get('/violation_records', (req, res) => {

    try {
        db.query('SELECT * FROM violation_record', (err, result) => {

            if (err) {
                console.error('Error fetching violation records:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading violation records:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


module.exports = router;
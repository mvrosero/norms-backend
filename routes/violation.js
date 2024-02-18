const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: violation*/
router.post('/createViolation', async (req, res) => {

    try {
        const {description, student_id, category_id, offense_id, sanction_id, report_id} = req.body;
        
        const insertViolationQuery = 'INSERT INTO violation (description, student_id, category_id, offense_id, sanction_id, report_id) VALUES ( ?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertViolationQuery, [description, student_id, category_id, offense_id, sanction_id, report_id]);

        res.status(201).json({ message: 'Violation recorded successfully' });
    } catch (error) {
        console.error('Error registering violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 violation*/
router.get('/violation/:id',  (req, res) => {

    let violation_id = req.params.id;

    if (!violation_id) {
        return res.status(400).send({ error: true, message: 'Please provide violation_id' });
    }

    try {
        db.query('SELECT description, student_id, category_id, offense_id, sanction_id, report_id FROM report WHERE report_id = ?', report_id, (err, result) => {
            if (err) {
                console.error('Error fetching violation:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: violations*/
router.get('/violations', authenticateToken, (req, res) => {

    try {
        db.query('SELECT description, student_id, category_id, offense_id, sanction_id, report_id FROM report', (err, result) => {

            if (err) {
                console.error('Error fetching violations:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading violations:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: offense*/
router.put('/violation/:id', authenticateToken, async (req, res) => {

    let violation_id = req.params.id;

    const {description, student_id, category_id, offense_id, sanction_id, report_id} = req.body;

    if (!violation_id || !description || !student_id || !category_id || !sanction_id || !report_id) {
        return res.status(400).send({ error: user, message: 'Please provide description, student id, category id, sanction id, and report id' });
    }

    try {
        db.query('UPDATE violation SET description = ?, student_id =?, category_id = ?, offense_id = ?, sanction_id = ?, report_id = ? WHERE violation_id = ?', [description, student_id, category_id, offense_id, sanction_id, report_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating violation:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: offense*/
router.delete('/violation/:id', authenticateToken, (req, res) => {

    let violation_id = req.params.id;

    if (!violation_id) {
        return res.status(400).send({ error: true, message: 'Please provide violation_id' });
    }

    try {
        db.query('DELETE FROM violation WHERE violation_id = ?', violation_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting violation:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading violation:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
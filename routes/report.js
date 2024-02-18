const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: report*/
router.post('/createReport', async (req, res) => {

    try {
        const {report_name, report_type, description, student_id} = req.body;
        
        const insertReportQuery = 'INSERT INTO report (report_name, report_type, description, student_id) VALUES ( ?, ?, ?, ?)';
        await db.promise().execute(insertReportQuery, [report_name, report_type, description, student_id]);

        res.status(201).json({ message: 'Report created successfully' });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/*get: 1 report*/
router.get('/report/:id',  (req, res) => {

    let report_id = req.params.id;

    if (!report_id) {
        return res.status(400).send({ error: true, message: 'Please provide report_id' });
    }

    try {
        db.query('SELECT report_id, report_name, report_type, description, student_id FROM report WHERE report_id = ?', report_id, (err, result) => {
            if (err) {
                console.error('Error fetching report:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: reports*/
router.get('/reports', authenticateToken, (req, res) => {

    try {
        db.query('SELECT report_name, report_type, description, student_id FROM report', (err, result) => {

            if (err) {
                console.error('Error fetching reports:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading reports:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: report*/
router.put('/report/:id', authenticateToken, async (req, res) => {

    let report_id = req.params.id;

    const {report_name, report_type, description, student_id} = req.body;

    if (!report_id || !report_name || !report_type || !description || !student_id) {
        return res.status(400).send({ error: user, message: 'Please provide report name, report type, description, and student id' });
    }

    try {
        db.query('UPDATE report SET report_name, report_type, description, student_id WHERE report_id = ?', [report_name, report_type, description, student_id, report_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating report:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: report*/
router.delete('/report/:id', authenticateToken, (req, res) => {

    let report_id = req.params.id;

    if (!report_id) {
        return res.status(400).send({ error: true, message: 'Please provide report_id' });
    }

    try {
        db.query('DELETE FROM report WHERE report_id = ?', report_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting report:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading report:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
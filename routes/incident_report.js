const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();

/*post: create incident report*/
router.post('/createIncidentReport', async (req, res) => {
    try {
        const { report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_path, status } = req.body;
        
        const insertReportQuery = 'INSERT INTO incident_report (report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertReportQuery, [report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_path, status]);

        res.status(201).json({ message: 'Incident report created successfully' });
    } catch (error) {
        console.error('Error creating incident report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: 1 incident report*/
router.get('/incidentReport/:id', (req, res) => {
    let report_id = req.params.id;

    if (!report_id) {
        return res.status(400).send({ error: true, message: 'Please provide report_id' });
    }

    try {
        db.query('SELECT * FROM incident_report WHERE report_id = ?', report_id, (err, result) => {
            if (err) {
                console.error('Error fetching incident report:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading incident report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: incident reports*/
router.get('/incidentReports', (req, res) => {
    try {
        db.query('SELECT * FROM incident_report', (err, result) => {
            if (err) {
                console.error('Error fetching incident reports:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading incident reports:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

/*put: incident report*/
router.put('/incidentReport/:id', async (req, res) => {
    let report_id = req.params.id;
    const { report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_path, status } = req.body;

    if (!report_id || !report_title || !description || !incident_date || !incident_time || !location || !reporter || !victim || !offender || !status) {
        return res.status(400).send({ error: true, message: 'Please provide all required fields' });
    }

    try {
        db.query('UPDATE incident_report SET report_title = ?, description = ?, incident_date = ?, incident_time = ?, location = ?, reporter = ?, victim = ?, offender = ?, witness = ?, photo_video_path = ?, status = ? WHERE report_id = ?', [report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_path, status, report_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating incident report:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading incident report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*delete: incident report*/
router.delete('/incidentReport/:id', (req, res) => {
    let report_id = req.params.id;

    if (!report_id) {
        return res.status(400).send({ error: true, message: 'Please provide report_id' });
    }

    try {
        db.query('DELETE FROM incident_report WHERE report_id = ?', report_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting incident report:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading incident report:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

module.exports = router;

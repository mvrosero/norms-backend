const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();
const multer = require('multer');
const path = require('path');
// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Specify the directory where files will be stored
    },
    filename: function (req, file, cb) {
      // Save the file with a unique name
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  // Initialize multer middleware
  const upload = multer({ storage: storage });
  
  // POST: create incident report
  router.post('/createIncidentReport', upload.single('photo_video'), async (req, res) => {
      try {
          const { report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, status } = req.body;
          const photo_video_filename = req.file ? req.file.filename : ''; // Get the filename if file was uploaded, otherwise use empty string
  
          const insertReportQuery = 'INSERT INTO incident_report (report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_filename, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          await db.promise().execute(insertReportQuery, [report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_filename, status]);
  
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
        db.query(`SELECT 
        ir.report_id,
        ir.report_title,
        ir.description,
        ir.incident_date,
        ir.incident_time,
        ir.location,
        CONCAT(reporter.first_name, ' ', reporter.middle_name, ' ', reporter.last_name) AS reporter_full_name,
        CONCAT(offender.first_name, ' ', offender.middle_name, ' ', offender.last_name) AS offender_full_name,
        CONCAT(victim.first_name, ' ', victim.middle_name, ' ', victim.last_name) AS victim_full_name,
        CONCAT(witness.first_name, ' ', witness.middle_name, ' ', witness.last_name) AS witness_full_name,
        ir.photo_video_filename,
        ir.status,
        ir.created_at
    FROM 
        incident_report ir
    JOIN 
        user AS reporter ON ir.reporter = reporter.user_id
    JOIN 
        user AS offender ON ir.offender = offender.user_id
    LEFT JOIN 
        user AS victim ON ir.victim = victim.user_id
    LEFT JOIN 
        user AS witness ON ir.witness = witness.user_id;`, (err, result) => {
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
    const { report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_filename, status } = req.body;

    if (!report_id || !report_title || !description || !incident_date || !incident_time || !location || !reporter || !victim || !offender || !status) {
        return res.status(400).send({ error: true, message: 'Please provide all required fields' });
    }

    try {
        db.query('UPDATE incident_report SET report_title = ?, description = ?, incident_date = ?, incident_time = ?, location = ?, reporter = ?, victim = ?, offender = ?, witness = ?, photo_video_filename = ?, status = ? WHERE report_id = ?', [report_title, description, incident_date, incident_time, location, reporter, victim, offender, witness, photo_video_filename, status, report_id], (err, result, fields) => {
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

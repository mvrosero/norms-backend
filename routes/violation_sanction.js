const express = require('express');
const router = express.Router();
const db = require('../app/configuration/database');


// Add a violation sanction
router.post('/violation_sanction', (req, res) => {
    const { record_id, sanction_id } = req.body;
    const query = 'INSERT INTO violation_sanction (record_id, sanction_id) VALUES (?, ?)';

    db.query(query, [record_id, sanction_id], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }
        res.status(201).json({ message: 'Violation sanction added', id: results.insertId });
    });
});

// Get all violation sanctions
router.get('/violation_sanctions', (req, res) => {
    const query = 'SELECT * FROM violation_sanction';
    
    db.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }
        res.status(200).json(results);
    });
});

module.exports = router;

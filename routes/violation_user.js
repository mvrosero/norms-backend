const express = require('express');
const router = express.Router();
const db = require('../app/configuration/database');

// Add a violation user
router.post('/violation_user', (req, res) => {
    const { record_id, user_id } = req.body;
    const query = 'INSERT INTO violation_user (record_id, user_id) VALUES (?, ?)';

    db.query(query, [record_id, user_id], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }
        res.status(201).json({ message: 'Violation user added', id: results.insertId });
    });
});

// Get all violation users
router.get('/violation_users', (req, res) => {
    const query = 'SELECT * FROM violation_user';
    
    db.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }
        res.status(200).json(results);
    });
});


module.exports = router;

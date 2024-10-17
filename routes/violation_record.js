const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();

/* Post: Create violation record */
router.post('/create-violationrecord', async (req, res) => {
    try {
        const { 
            description, 
            category_id, 
            offense_id, 
            acadyear_id, 
            semester_id, 
            users,      // Array of user IDs
            sanctions   // Array of sanction IDs
        } = req.body;

        // Ensure all required fields are present
        if (!description || !category_id || !offense_id || !acadyear_id || !semester_id || !users || !sanctions) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert the violation record
        const insertViolationQuery = `
            INSERT INTO violation_record 
            (description, category_id, offense_id, acadyear_id, semester_id) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [violationResult] = await db.promise().execute(insertViolationQuery, [
            description, category_id, offense_id, acadyear_id, semester_id
        ]);

        const record_id = violationResult.insertId; // Get the new violation record ID

        // Insert multiple users linked to the violation
        const userInsertPromises = users.map((user_id) =>
            db.promise().execute(
                'INSERT INTO violation_user (record_id, user_id) VALUES (?, ?)',
                [record_id, user_id]
            )
        );

        // Insert multiple sanctions linked to the violation
        const sanctionInsertPromises = sanctions.map((sanction_id) =>
            db.promise().execute(
                'INSERT INTO violation_sanction (record_id, sanction_id) VALUES (?, ?)',
                [record_id, sanction_id]
            )
        );

        // Execute all insertion promises in parallel
        await Promise.all([...userInsertPromises, ...sanctionInsertPromises]);

        res.status(201).json({ message: 'Violation record created successfully with multiple users and sanctions' });
    } catch (error) {
        console.error('Error creating violation record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Post: Create violation record by student_idnumber */
router.post('/create-violationrecord/:student_idnumber', async (req, res) => {
    try {
        const student_idnumber = req.params.student_idnumber;
        const { description, category_id, offense_id, sanction_id, acadyear_id, semester_id } = req.body;

        // Check if any required fields are missing
        if (!description || !category_id || !offense_id || !sanction_id || !acadyear_id || !semester_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch the user_id associated with the provided student_idnumber
        const [userResult] = await db.promise().query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertViolationQuery = `
            INSERT INTO violation_record (description, created_at, category_id, offense_id, acadyear_id, semester_id, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.promise().execute(insertViolationQuery, [description, currentTimestamp, category_id, offense_id, acadyear_id, semester_id, user_id]);

        res.status(201).json({ message: 'Violation recorded successfully' });
    } catch (error) {
        console.error('Error registering violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Get: Violation record by record_id */
router.get('/violation_record/record/:record_id', async (req, res) => {
    const record_id = req.params.record_id;

    if (!record_id) {
        return res.status(400).json({ error: 'Please provide record_id' });
    }

    try {
        const [result] = await db.promise().query('SELECT * FROM violation_record WHERE record_id = ?', [record_id]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No record found' });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get: All violation records */
router.get('/violation_records', async (req, res) => {
    try {
        const [result] = await db.promise().query('SELECT * FROM violation_record');
        res.status(200).json(result);
    } catch (error) {
        console.error('Error loading violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

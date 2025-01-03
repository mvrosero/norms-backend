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
        if (!description || !category_id || !offense_id || !acadyear_id || !semester_id || !Array.isArray(users) || !Array.isArray(sanctions)) {
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
        const { 
            description, 
            category_id, 
            offense_id, 
            sanctions,  // Array of sanction IDs
            acadyear_id, 
            semester_id 
        } = req.body;

        // Ensure all required fields are present
        if (!description || !category_id || !offense_id || !Array.isArray(sanctions) || !acadyear_id || !semester_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch the user_id associated with the provided student_idnumber
        const [userResult] = await db.promise().query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        // Insert the violation record
        const insertViolationQuery = `
            INSERT INTO violation_record 
            (description, category_id, offense_id, acadyear_id, semester_id) 
            VALUES (?, ?, ?, ?, ?)
        `;

        const [violationResult] = await db.promise().execute(insertViolationQuery, [
            description, 
            category_id, 
            offense_id, 
            acadyear_id, 
            semester_id
        ]);

        const record_id = violationResult.insertId;  // Get the newly created violation record ID

        // Link the user to the violation record
        await db.promise().execute(
            'INSERT INTO violation_user (record_id, user_id) VALUES (?, ?)',
            [record_id, user_id]
        );

        // Insert multiple sanctions linked to the violation record
        const sanctionInsertPromises = sanctions.map((sanction_id) =>
            db.promise().execute(
                'INSERT INTO violation_sanction (record_id, sanction_id) VALUES (?, ?)',
                [record_id, sanction_id]
            )
        );

        // Execute all sanction insertions in parallel
        await Promise.all(sanctionInsertPromises);

        res.status(201).json({ message: 'Violation recorded successfully with sanctions' });
    } catch (error) {
        console.error('Error registering violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Get: Violation record by record_id with associated users, sanctions, and subcategory */
router.get('/violation_record/:record_id', async (req, res) => {
    const record_id = req.params.record_id;

    if (!record_id) {
        return res.status(400).json({ error: 'Please provide record_id' });
    }

    try {
        // Fetch the violation record by record_id, including subcategory_id from the offense table
        const [violationRecord] = await db.promise().query(`
            SELECT vr.*, 
                   o.subcategory_id,
                   GROUP_CONCAT(DISTINCT vu.user_id) AS user_ids, 
                   GROUP_CONCAT(DISTINCT vs.sanction_id) AS sanction_ids
            FROM violation_record vr
            LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN violation_sanction vs ON vr.record_id = vs.record_id
            LEFT JOIN offense o ON vr.offense_id = o.offense_id
            WHERE vr.record_id = ?
            GROUP BY vr.record_id
        `, [record_id]);

        if (violationRecord.length === 0) {
            return res.status(404).json({ error: 'Violation record not found' });
        }

        res.status(200).json(violationRecord[0]); // Return the first record since record_id is unique
    } catch (error) {
        console.error('Error fetching violation record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Get: Violation records by student_idnumber with users, sanctions, and subcategory */
router.get('/violation_record/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).json({ error: 'Please provide student_idnumber' });
    }

    try {
        // Fetch the user_id associated with the student_idnumber
        const [userResult] = await db
            .promise()
            .query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        // Fetch all violation records linked to the user, including the created_at field and subcategory_id
        const [violations] = await db.promise().query(`
            SELECT vr.record_id, vr.description, vr.category_id, vr.offense_id, 
                   vr.acadyear_id, vr.semester_id, vr.created_at,
                   o.subcategory_id,
                   GROUP_CONCAT(DISTINCT vs.sanction_id) AS sanction_ids
            FROM violation_record vr
            LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN violation_sanction vs ON vr.record_id = vs.record_id
            LEFT JOIN offense o ON vr.offense_id = o.offense_id  -- Join with the offense table
            WHERE vu.user_id = ?
            GROUP BY vr.record_id
        `, [user_id]);

        if (violations.length === 0) {
            return res.status(404).json({ message: 'No violation records found for this student' });
        }

        res.status(200).json(violations);
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Get: All violation records by student_idnumber */
router.get('/myrecords/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).json({ error: 'Please provide student_idnumber' });
    }

    try {
        // Fetch the user_id associated with the student_idnumber
        const [userResult] = await db
            .promise()
            .query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        // Fetch all violation records linked to the user, including the created_at field and subcategory_id
        const [violations] = await db.promise().query(`
            SELECT vr.record_id, vr.description, vr.category_id, vr.offense_id, 
                   vr.acadyear_id, vr.semester_id, vr.created_at,
                   o.subcategory_id,  -- Include subcategory_id from offense table
                   GROUP_CONCAT(DISTINCT vs.sanction_id) AS sanction_ids
            FROM violation_record vr
            LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN violation_sanction vs ON vr.record_id = vs.record_id
            LEFT JOIN offense o ON vr.offense_id = o.offense_id  -- Join with the offense table
            WHERE vu.user_id = ?
            GROUP BY vr.record_id
        `, [user_id]);

        if (violations.length === 0) {
            return res.status(404).json({ message: 'No violation records found for this student' });
        }

        res.status(200).json(violations);
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Get: All violation records with associated users and sanctions */
router.get('/violation_records', async (req, res) => {
    try {
        const query = `
            SELECT vr.*, 
                   GROUP_CONCAT(DISTINCT vu.user_id) AS user_ids, 
                   GROUP_CONCAT(DISTINCT vs.sanction_id) AS sanction_ids
            FROM violation_record vr
            LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN violation_sanction vs ON vr.record_id = vs.record_id
            GROUP BY vr.record_id
        `;

        const [result] = await db.promise().query(query);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error loading violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;

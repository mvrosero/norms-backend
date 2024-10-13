const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();

/* Post: Create violation record */
router.post('/create-violationrecord', async (req, res) => {
    try {
        const { user_id, description, category_id, offense_id, sanction_id, acadyear_id, semester_id } = req.body;

        // Check if any required fields are missing
        if (!user_id || !description || !category_id || !offense_id || !sanction_id || !acadyear_id || !semester_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch subcategory_id based on the offense_id
        const [offenseRows] = await db.promise().query('SELECT subcategory_id FROM offense WHERE offense_id = ?', [offense_id]);
        
        if (offenseRows.length === 0) {
            return res.status(404).json({ error: 'Offense not found' });
        }

        const subcategory_id = offenseRows[0].subcategory_id; // Automatically set subcategory_id

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertViolationQuery = 'INSERT INTO violation_record (user_id, description, created_at, category_id, offense_id, sanction_id, acadyear_id, semester_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        await db.promise().execute(insertViolationQuery, [user_id, description, currentTimestamp, category_id, offense_id, sanction_id, acadyear_id, semester_id, subcategory_id]);

        res.status(201).json({ message: 'Violation recorded successfully' });
    } catch (error) {
        console.error('Error registering violation:', error);
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

        // Fetch subcategory_id based on the offense_id
        const [offenseRows] = await db.promise().query('SELECT subcategory_id FROM offense WHERE offense_id = ?', [offense_id]);

        if (offenseRows.length === 0) {
            return res.status(404).json({ error: 'Offense not found' });
        }

        const subcategory_id = offenseRows[0].subcategory_id; // Automatically set subcategory_id

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertViolationQuery = 'INSERT INTO violation_record (user_id, description, created_at, category_id, offense_id, sanction_id, acadyear_id, semester_id, subcategory_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

        await db.promise().execute(insertViolationQuery, [user_id, description, currentTimestamp, category_id, offense_id, sanction_id, acadyear_id, semester_id, subcategory_id]);

        res.status(201).json({ message: 'Violation recorded successfully' });
    } catch (error) {
        console.error('Error registering violation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get: 1 violation (student_idnumber) */
router.get('/myrecords/:student_idnumber', (req, res) => {
    let student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        // Fetch user_id associated with the provided student_idnumber
        db.query('SELECT user_id FROM user WHERE student_idnumber = ?', student_idnumber, (err, result) => {
            if (err) {
                console.error('Error fetching user ID:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.length === 0) {
                    return res.status(404).json({ message: 'User not found' });
                }
                const user_id = result[0].user_id;

                // Fetch violation records associated with the user_id
                db.query('SELECT * FROM violation_record WHERE user_id = ?', user_id, (err, records) => {
                    if (err) {
                        console.error('Error fetching violation records:', err);
                        res.status(500).json({ message: 'Internal Server Error' });
                    } else {
                        res.status(200).json(records);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get: 1 violation (user) */
router.get('/violation_record/:student_idnumber', (req, res) => {
    let student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query(`SELECT 
        vr.record_id,
        u.student_idnumber,
        u.first_name,
        u.last_name,
        vr.description,
        vr.created_at,
        vr.category_id,
        vr.offense_id,
        vr.sanction_id,
        vr.acadyear_id,
        vr.semester_id,
        vr.subcategory_id -- Include subcategory_id in the selection
    FROM 
        violation_record AS vr
    INNER JOIN 
        user AS u ON vr.user_id = u.user_id
    WHERE 
        u.student_idnumber = ?`, student_idnumber, (err, result) => {
            if (err) {
                console.error('Error fetching violation records:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.length === 0) {
                    // No records found for the user_id
                    res.status(404).json({ message: 'No records found' });
                } else {
                    res.status(200).json(result);
                }
            }
        });
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Get: 1 violation (record) */
router.get('/violation_record/record/:record_id', (req, res) => {
    let record_id = req.params.record_id;

    if (!record_id) {
        return res.status(400).send({ error: true, message: 'Please provide record_id' });
    }

    try {
        db.query('SELECT * FROM violation_record WHERE record_id = ?', record_id, (err, result) => {
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

/*get all: violations*/
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
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

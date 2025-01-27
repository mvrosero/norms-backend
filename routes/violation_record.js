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

        // Ensure description doesn't exceed the maximum length
        const maxDescriptionLength = 5000; // Set your desired length limit
        if (description && description.length > maxDescriptionLength) {
            return res.status(400).json({ error: `Description exceeds the maximum length of ${maxDescriptionLength} characters` });
        }

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

        // Ensure description doesn't exceed the maximum length
        const maxDescriptionLength = 5000; // Set your desired length limit
        if (description && description.length > maxDescriptionLength) {
            return res.status(400).json({ error: `Description exceeds the maximum length of ${maxDescriptionLength} characters` });
        }

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
router.get('/individual_violationrecords/:student_idnumber', async (req, res) => {
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

        // Fetch all violation records linked to the user, retaining the sanction handling as it was
        const [violations] = await db.promise().query(`
            SELECT 
                vr.created_at, 
                vr.description, 
                c.category_name,
                o.offense_name, 
                s.semester_name,
                CONCAT(ay.start_year, ' - ', ay.end_year) AS academic_year,  
                sc.subcategory_name,
                GROUP_CONCAT(DISTINCT sa.sanction_name SEPARATOR ', ') AS sanction_names
            FROM violation_record vr
            LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN violation_sanction vs ON vr.record_id = vs.record_id
            LEFT JOIN offense o ON vr.offense_id = o.offense_id 
            LEFT JOIN category c ON vr.category_id = c.category_id  
            LEFT JOIN semester s ON vr.semester_id = s.semester_id  
            LEFT JOIN academic_year ay ON vr.acadyear_id = ay.acadyear_id  
            LEFT JOIN subcategory sc ON o.subcategory_id = sc.subcategory_id  
            LEFT JOIN sanction sa ON vs.sanction_id = sa.sanction_id  
            WHERE vu.user_id = ?
            GROUP BY vr.record_id
        `, [user_id]);

        if (violations.length === 0) {
            return res.status(404).json({ message: 'No violation records found for this student' });
        }

        // Send the response with the retrieved violation records
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







/* Get: All violation records of a student grouped by subcategory, with offense counts */
router.get('/violation_records-offensescount/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).json({ error: 'Please provide student_idnumber' });
    }

    try {
        // Fetch the user_id associated with the student_idnumber
        const [userResult] = await db.promise().query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        const [violations] = await db.promise().query(`
        SELECT 
            o.subcategory_id, 
            sc.subcategory_name,  /* Join with subcategory table for the name */
            vr.offense_id,
            vr.description, 
            COUNT(vr.offense_id) AS offense_count,
            GROUP_CONCAT(vr.record_id) AS violation_record_ids
        FROM violation_record vr
        LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
        LEFT JOIN offense o ON vr.offense_id = o.offense_id
        LEFT JOIN subcategory sc ON o.subcategory_id = sc.subcategory_id  /* Join with subcategory table */
        WHERE vu.user_id = ?
        GROUP BY o.subcategory_id, vr.offense_id
        ORDER BY o.subcategory_id, offense_count DESC
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


/* Get: View subcategory details, offenses, and violation records grouped by subcategory */
router.get('/violation_records-subcategory/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).json({ error: 'Please provide student_idnumber' });
    }

    try {
        // Fetch the user_id associated with the student_idnumber
        const [userResult] = await db.promise().query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        // Fetch subcategories, offenses, and violation records
        const [subcategoryDetails] = await db.promise().query(`
        SELECT 
            sc.subcategory_id,
            sc.subcategory_name
        FROM subcategory sc
        LEFT JOIN offense o ON sc.subcategory_id = o.subcategory_id
        LEFT JOIN violation_record vr ON o.offense_id = vr.offense_id
        LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
        WHERE vu.user_id = ?
        GROUP BY sc.subcategory_id
        ORDER BY sc.subcategory_name
    `, [user_id]);

        if (subcategoryDetails.length === 0) {
            return res.status(404).json({ message: 'No subcategories found for this student' });
        }

        // Fetch offenses and violation records grouped by subcategory
        const [offensesAndRecords] = await db.promise().query(`
        SELECT 
            o.subcategory_id,
            sc.subcategory_name, 
            o.offense_id, 
            o.offense_name,
            COUNT(vr.record_id) AS violation_count,
            GROUP_CONCAT(vr.record_id) AS violation_record_ids
        FROM offense o
        LEFT JOIN violation_record vr ON o.offense_id = vr.offense_id
        LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
        LEFT JOIN subcategory sc ON o.subcategory_id = sc.subcategory_id
        WHERE vu.user_id = ?
        GROUP BY o.subcategory_id, o.offense_id
        ORDER BY o.subcategory_id, violation_count DESC
    `, [user_id]);

        if (offensesAndRecords.length === 0) {
            return res.status(404).json({ message: 'No offenses or violation records found for this student' });
        }

        // Structure the response
        const response = subcategoryDetails.map(subcategory => {
            const offenses = offensesAndRecords.filter(offense => offense.subcategory_id === subcategory.subcategory_id);
            return {
                subcategory_name: subcategory.subcategory_name,
                offenses: offenses.map(offense => ({
                    offense_name: offense.offense_name,
                    violation_count: offense.violation_count,
                    violation_record_ids: offense.violation_record_ids
                }))
            };
        });

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching subcategory details, offenses, and violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});













// GET all violation records categorized by subcategory name for a specific student
/* Get: All violation records by student_idnumber grouped by subcategories */
router.get('/violation_records/subcategory/:student_idnumber', async (req, res) => {
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

        // Fetch all violation records grouped by subcategories and additional fields
        const [violations] = await db.promise().query(`
            SELECT 
                o.subcategory_id,
                s.subcategory_name,
                GROUP_CONCAT(vr.record_id) AS record_ids,
                GROUP_CONCAT(vr.description) AS descriptions,
                GROUP_CONCAT(vr.created_at) AS created_at,
                GROUP_CONCAT(DISTINCT vs.sanction_id) AS sanction_ids,
                GROUP_CONCAT(vr.category_id) AS category_ids,
                GROUP_CONCAT(vr.offense_id) AS offense_ids,
                GROUP_CONCAT(vr.acadyear_id) AS acadyear_ids,
                GROUP_CONCAT(vr.semester_id) AS semester_ids
            FROM 
                violation_record vr
            LEFT JOIN 
                violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN 
                violation_sanction vs ON vr.record_id = vs.record_id
            LEFT JOIN 
                offense o ON vr.offense_id = o.offense_id
            LEFT JOIN 
                subcategory s ON o.subcategory_id = s.subcategory_id
            WHERE 
                vu.user_id = ?
            GROUP BY 
                o.subcategory_id, s.subcategory_name
            ORDER BY 
                s.subcategory_name ASC
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







/* Get: Number of violation records for each offense, grouped by subcategory WORKING */
router.get('/student-myrecords-visual/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).json({ error: 'Please provide student_idnumber' });
    }

    try {
        // Fetch the user_id associated with the student_idnumber
        const [userResult] = await db.promise().query('SELECT user_id FROM user WHERE student_idnumber = ?', [student_idnumber]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user_id = userResult[0].user_id;

        // Query to count violation records for each offense, grouped by subcategory
        const [violationsCount] = await db.promise().query(`
        SELECT 
            o.subcategory_id, 
            sc.subcategory_name,  /* Join with subcategory table for the name */
            vr.offense_id,
            vr.description, 
            COUNT(vr.record_id) AS violation_count
        FROM violation_record vr
        LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
        LEFT JOIN offense o ON vr.offense_id = o.offense_id
        LEFT JOIN subcategory sc ON o.subcategory_id = sc.subcategory_id  /* Join with subcategory table */
        WHERE vu.user_id = ?
        GROUP BY o.subcategory_id, vr.offense_id
        ORDER BY o.subcategory_id, violation_count DESC
    `, [user_id]);

        if (violationsCount.length === 0) {
            return res.status(404).json({ message: 'No violation records found for this student' });
        }

        res.status(200).json(violationsCount);
    } catch (error) {
        console.error('Error fetching violation records count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});







/* Get: All violation records by student_idnumber grouped by subcategories WORKING*/
/* Get: All violation records by student_idnumber grouped by subcategories */
router.get('/student-myrecords/subcategory/:student_idnumber', async (req, res) => {
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

        // Fetch all violation records for the specific student
        const [violations] = await db.promise().query(`
            SELECT 
                vr.record_id,
                vr.description,
                vr.created_at,
                vr.acadyear_id,
                acad.acadyear_code,  -- Fetch acadyear name
                vr.semester_id,
                sem.semester_name,  -- Fetch semester name
                vr.category_id,
                cat.category_name,  -- Fetch category name
                vr.offense_id,
                off.offense_name,   -- Fetch offense name
                o.subcategory_id,
                sub.subcategory_name, -- Fetch subcategory name
                GROUP_CONCAT(DISTINCT vs.sanction_id) AS sanction_ids, -- Group concatenated sanction_ids for the selected record
                GROUP_CONCAT(DISTINCT s.sanction_name) AS sanction_names -- Fetch sanction names
            FROM 
                violation_record vr
            INNER JOIN 
                violation_user vu ON vr.record_id = vu.record_id AND vu.user_id = ? -- Ensure records are for this user only
            LEFT JOIN 
                offense o ON vr.offense_id = o.offense_id
            LEFT JOIN 
                subcategory sub ON o.subcategory_id = sub.subcategory_id
            LEFT JOIN 
                semester sem ON vr.semester_id = sem.semester_id -- Join with semester table
            LEFT JOIN 
                academic_year acad ON vr.acadyear_id = acad.acadyear_id -- Join with acadyear table
            LEFT JOIN 
                category cat ON vr.category_id = cat.category_id -- Join with category table
            LEFT JOIN 
                offense off ON vr.offense_id = off.offense_id -- Join with offense table
            LEFT JOIN 
                violation_sanction vs ON vr.record_id = vs.record_id -- Join with violation_sanction table
            LEFT JOIN 
                sanction s ON vs.sanction_id = s.sanction_id -- Join with sanction table to get sanction_name
            GROUP BY 
                vr.record_id, vr.description, vr.created_at, vr.acadyear_id, acad.acadyear_code, 
                vr.semester_id, sem.semester_name, vr.category_id, cat.category_name, vr.offense_id, 
                off.offense_name, o.subcategory_id, sub.subcategory_name
            ORDER BY 
                sub.subcategory_name ASC, vr.created_at DESC
        `, [user_id]);

        if (violations.length === 0) {
            return res.status(404).json({ message: 'No violation records found for this student' });
        }

        // Group violations by subcategory_name
        const groupedViolations = violations.reduce((acc, violation) => {
            const { subcategory_name, sanction_names } = violation;

            if (!acc[subcategory_name]) {
                acc[subcategory_name] = [];
            }

            acc[subcategory_name].push({
                record_id: violation.record_id,
                description: violation.description,
                created_at: violation.created_at,
                acadyear_name: violation.acadyear_code, // Added acadyear_name
                semester_name: violation.semester_name, // Added semester_name
                category_name: violation.category_name, // Added category_name
                offense_name: violation.offense_name,   // Added offense_name
                sanction_names: sanction_names ? sanction_names.split(',') : [], // Include sanction_names here
            });

            return acc;
        }, {});

        res.status(200).json(groupedViolations);
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






/* Get: All violation records by student_idnumber with department and program at the time of violation */
router.get('/myrecords-history/:student_idnumber', async (req, res) => {
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

        // Fetch all violation records linked to the user
        const [violations] = await db.promise().query(`
            SELECT 
                vr.created_at, 
                vr.description,
                c.category_name,
                o.offense_name,
                s.semester_name,
                CONCAT(ay.start_year, ' - ', ay.end_year) AS academic_year,
                sc.subcategory_name,
                -- Format sanctions with space after the comma
                GROUP_CONCAT(DISTINCT sa.sanction_name SEPARATOR ', ') AS sanction_names,
                -- Join user_history for department and program at the time of violation
                dh.department_name,
                ph.program_name
            FROM violation_record vr
            LEFT JOIN violation_user vu ON vr.record_id = vu.record_id
            LEFT JOIN violation_sanction vs ON vr.record_id = vs.record_id
            LEFT JOIN sanction sa ON vs.sanction_id = sa.sanction_id
            LEFT JOIN offense o ON vr.offense_id = o.offense_id
            LEFT JOIN category c ON vr.category_id = c.category_id
            LEFT JOIN semester s ON vr.semester_id = s.semester_id
            LEFT JOIN academic_year ay ON vr.acadyear_id = ay.acadyear_id
            LEFT JOIN subcategory sc ON o.subcategory_id = sc.subcategory_id
            LEFT JOIN user_history uh ON vu.user_id = uh.user_id
            LEFT JOIN (
                SELECT 
                    h.user_id, 
                    d.department_name, 
                    h.changed_at 
                FROM user_history h
                LEFT JOIN department d ON d.department_id = h.new_department_id
                WHERE h.user_id = ? AND h.changed_at <= (SELECT vr.created_at FROM violation_record vr WHERE vr.record_id = ?)
                ORDER BY h.changed_at DESC
                LIMIT 1
            ) dh ON vu.user_id = dh.user_id

            LEFT JOIN (
                SELECT 
                    h.user_id, 
                    p.program_name, 
                    h.changed_at 
                FROM user_history h
                LEFT JOIN program p ON p.program_id = h.new_program_id
                WHERE h.user_id = ? AND h.changed_at <= (SELECT vr.created_at FROM violation_record vr WHERE vr.record_id = ?)
                ORDER BY h.changed_at DESC
                LIMIT 1
            ) ph ON vu.user_id = ph.user_id

            WHERE vu.user_id = ?
            GROUP BY vr.record_id
            ORDER BY vr.created_at
        `, [user_id, user_id, user_id, user_id, user_id]);

        if (violations.length === 0) {
            return res.status(404).json({ message: 'No violation records found for this student' });
        }

        res.status(200).json(violations);
    } catch (error) {
        console.error('Error fetching violation records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





module.exports = router;

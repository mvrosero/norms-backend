const express = require('express');
const router = express.Router();
const db = require('../app/configuration/database');


/* post: subcategory */
router.post('/create-subcategory', async (req, res) => {
    const { subcategory_code, subcategory_name, status } = req.body;

    // Check for required fields
    if (!subcategory_code || !subcategory_name) {
        return res.status(400).json({ error: 'Please provide subcategory_code and subcategory_name' });
    }

    try {
        const insertSubcategoryQuery = `
            INSERT INTO subcategory (subcategory_code, subcategory_name, status) 
            VALUES (?, ?, ?)
        `;
        await db.promise().execute(insertSubcategoryQuery, [subcategory_code, subcategory_name, status]);

        res.status(201).json({ message: 'Subcategory created successfully' });
    } catch (error) {
        console.error('Error creating subcategory:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: subcategories */
router.get('/subcategories', async (req, res) => {
    try {
        const query = 'SELECT * FROM subcategory';
        const [results] = await db.promise().execute(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get 1: subcategories */
router.get('/subcategory/:id', async (req, res) => {
    const subcategory_id = req.params.id;

    try {
        const query = 'SELECT * FROM subcategory WHERE subcategory_id = ?';
        const [results] = await db.promise().execute(query, [subcategory_id]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Subcategory not found' });
        }

        res.status(200).json(results[0]);
    } catch (error) {
        console.error('Error fetching subcategory:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* put: subcategories */
router.put('/subcategory/:id', async (req, res) => {
    const subcategory_id = req.params.id;
    const { subcategory_code, subcategory_name, status } = req.body;

    if (!subcategory_code || !subcategory_name) {
        return res.status(400).json({ error: 'Please provide subcategory_code and subcategory_name' });
    }

    try {
        const query = 'UPDATE subcategory SET subcategory_code = ?, subcategory_name = ?, status = ? WHERE subcategory_id = ?';
        const result = await db.promise().execute(query, [subcategory_code, subcategory_name, status || 'active', subcategory_id]);

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Subcategory not found' });
        }

        res.status(200).json({ message: 'Subcategory updated successfully' });
    } catch (error) {
        console.error('Error updating subcategory:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* delete: subcategory */
router.delete('/subcategory/:id', async (req, res) => {
    const subcategory_id = req.params.id;

    try {
        const query = 'DELETE FROM subcategory WHERE subcategory_id = ?';
        const result = await db.promise().execute(query, [subcategory_id]);

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ error: 'Subcategory not found' });
        }

        res.status(200).json({ message: 'Subcategory deleted successfully' });
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/*VISUAL */
router.get('/myrecords-visual/:student_idnumber', async (req, res) => {
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

        // Fetch all offenses, even if there's no violation record
        const [offenseResults] = await db.promise().query(`
            SELECT 
                subcat.subcategory_name,
                o.offense_id
            FROM offense o
            JOIN subcategory subcat ON o.subcategory_id = subcat.subcategory_id
        `);

        if (offenseResults.length === 0) {
            return res.status(404).json({ message: 'No offenses found' });
        }

        // Fetch violation data (using LEFT JOIN to include offenses with no violations)
        const [violationResults] = await db.promise().query(`
            SELECT 
                subcat.subcategory_name,
                o.offense_id,
                COUNT(vu.record_id) AS offense_count
            FROM violation_user vu
            LEFT JOIN violation_record vr ON vu.record_id = vr.record_id
            LEFT JOIN offense o ON vr.offense_id = o.offense_id
            LEFT JOIN subcategory subcat ON o.subcategory_id = subcat.subcategory_id
            WHERE vu.user_id = ?
            GROUP BY subcat.subcategory_name, o.offense_id
            ORDER BY subcat.subcategory_name, offense_count DESC
        `, [user_id]);

        // Create a map to store offense counts
        const offenseCountMap = {};
        violationResults.forEach(row => {
            if (!offenseCountMap[row.subcategory_name]) {
                offenseCountMap[row.subcategory_name] = {};
            }
            offenseCountMap[row.subcategory_name][row.offense_id] = row.offense_count;
        });

        // Formatting the response, ensuring all offenses are included
        const formattedData = {};
        offenseResults.forEach(row => {
            if (!formattedData[row.subcategory_name]) {
                formattedData[row.subcategory_name] = {};
            }
            if (!formattedData[row.subcategory_name][row.offense_id]) {
                formattedData[row.subcategory_name][row.offense_id] = 0;
            }
        });

        // Merge counts with all offenses
        for (const subcategory in formattedData) {
            for (const offense_id in formattedData[subcategory]) {
                if (offenseCountMap[subcategory] && offenseCountMap[subcategory][offense_id] !== undefined) {
                    formattedData[subcategory][offense_id] = offenseCountMap[subcategory][offense_id];
                }
            }
        }

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




module.exports = router;

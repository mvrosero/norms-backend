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






// Get violation records categorized by subcategory for a specific student
router.get("/myrecords-visual/:student_idnumber", async (req, res) => {
    const { student_idnumber } = req.params;

    const query = `
        SELECT 
            s.subcategory_name,
            o.offense_name,
            COUNT(vu.record_id) AS offense_count
        FROM violation_user vu
        JOIN violation_record vr ON vu.record_id = vr.record_id
        JOIN offense o ON vr.offense_id = o.offense_id
        JOIN subcategory s ON o.subcategory_id = s.subcategory_id
        JOIN user u ON vu.user_id = u.user_id
        WHERE u.student_idnumber = ?
        GROUP BY s.subcategory_name, o.offense_name
        ORDER BY s.subcategory_name, offense_count DESC;
    `;

    try {
        const [results] = await db.execute(query, [student_idnumber]);

        // Formatting the response
        const formattedData = {};
        results.forEach(row => {
            if (!formattedData[row.subcategory_name]) {
                formattedData[row.subcategory_name] = {};
            }
            formattedData[row.subcategory_name][row.offense_name] = row.offense_count;
        });

        res.json(formattedData);
    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});








module.exports = router;

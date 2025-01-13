const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();


/* POST: Register an academic year */
router.post('/register-academicyear', async (req, res) => {
    try {
        const { acadyear_code, start_year, end_year, status } = req.body;
        
        // Validate acadyear_code format: "A/Y 00-00"
        const acadyearCodePattern = /^A\/Y \d{2}-\d{2}$/; 
        if (!acadyear_code || !acadyearCodePattern.test(acadyear_code)) {
            return res.status(400).json({ error: 'acadyear_code must follow the format "A/Y 00-00"' });
        }

        // Validate start_year and end_year
        if (!start_year || !end_year) {
            return res.status(400).json({ error: 'Both start_year and end_year are required' });
        }

        // Check if start_year is earlier than end_year
        if (start_year >= end_year) {
            return res.status(400).json({ error: 'start_year must be earlier than end_year' });
        }

        // Check if the duration is exactly 1 year
        if (end_year - start_year !== 1) {
            return res.status(400).json({ error: 'The duration between start_year and end_year must be exactly 1 year' });
        }

        // Check for duplicates: ensure no existing record has the same start_year and end_year
        const checkDuplicateQuery = `
            SELECT COUNT(*) AS count 
            FROM academic_year 
            WHERE start_year = ? AND end_year = ?
        `;
        const [duplicateCheck] = await db.promise().execute(checkDuplicateQuery, [start_year, end_year]);
        
        if (duplicateCheck[0].count > 0) {
            return res.status(400).json({ error: 'An academic year with the same start and end year already exists' });
        }

        const insertAcademicYearQuery = `
            INSERT INTO academic_year (acadyear_code, start_year, end_year, status) 
            VALUES (?, ?, ?, ?)
        `;
        await db.promise().execute(insertAcademicYearQuery, [acadyear_code, start_year, end_year, status]);

        res.status(201).json({ message: 'Academic year registered successfully' });
    } catch (error) {
        console.error('Error registering academic year:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: Single academic year */
router.get('/academic_year/:id', (req, res) => {
    let acadyear_id = req.params.id;

    if (!acadyear_id) {
        return res.status(400).send({ error: true, message: 'Please provide acadyear_id' });
    }

    try {
        db.query('SELECT acadyear_id, acadyear_code, start_year, end_year, status FROM academic_year WHERE acadyear_id = ?', acadyear_id, (err, result) => {
            if (err) {
                console.error('Error fetching academic year:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading academic year:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: All academic years */
router.get('/academic_years', (req, res) => {
    try {
        db.query('SELECT * FROM academic_year', (err, result) => {
            if (err) {
                console.error('Error fetching academic years:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading academic years:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* GET: All academic years formatted */
router.get('/academicyears', (req, res) => {
    try {
        db.query('SELECT start_year, end_year FROM academic_year', (err, result) => {
            if (err) {
                console.error('Error fetching academic years:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                // Format the start_year and end_year as "A/Y YYYY-YYYY"
                const formattedYears = result.map(item => {
                    const formattedYear = `A/Y ${item.start_year}-${item.end_year}`;
                    return { formatted_year: formattedYear };
                });
                res.status(200).json(formattedYears);
            }
        });
    } catch (error) {
        console.error('Error loading academic years:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* PUT: Update an academic year */
router.put('/academic_year/:id', async (req, res) => {
    const acadyear_id = req.params.id;
    const { acadyear_code, start_year, end_year, status } = req.body;

    if (!acadyear_id) {
        return res.status(400).send({ error: true, message: 'Please provide acadyear_id' });
    }

    // Validate acadyear_code format: "A/Y 00-00"
    const acadyearCodePattern = /^A\/Y \d{2}-\d{2}$/;
    if (!acadyear_code || !acadyearCodePattern.test(acadyear_code)) {
        return res.status(400).json({ error: 'acadyear_code must follow the format "A/Y 00-00"' });
    }

    // Validate start_year and end_year
    if (!start_year || !end_year) {
        return res.status(400).json({ error: 'Both start_year and end_year are required' });
    }

    // Check if start_year is earlier than end_year
    if (start_year >= end_year) {
        return res.status(400).json({ error: 'start_year must be earlier than end_year' });
    }

    // Check if the duration is exactly 1 year
    if (end_year - start_year !== 1) {
        return res.status(400).json({ error: 'The duration between start_year and end_year must be exactly 1 year' });
    }

    try {
        // Check for duplicates: ensure no other record has the same start_year and end_year
        const checkDuplicateQuery = `
            SELECT COUNT(*) AS count 
            FROM academic_year 
            WHERE start_year = ? AND end_year = ? AND acadyear_id != ?
        `;
        const [duplicateCheck] = await db.promise().execute(checkDuplicateQuery, [start_year, end_year, acadyear_id]);

        if (duplicateCheck[0].count > 0) {
            return res.status(400).json({ error: 'An academic year with the same start and end year already exists' });
        }

        // Proceed with updating the academic year
        const updateAcademicYearQuery = `
            UPDATE academic_year 
            SET acadyear_code = ?, start_year = ?, end_year = ?, status = ? 
            WHERE acadyear_id = ?
        `;
        await db.promise().execute(updateAcademicYearQuery, [acadyear_code, start_year, end_year, status, acadyear_id]);

        res.status(200).json({ message: 'Academic year updated successfully' });
    } catch (error) {
        console.error('Error updating academic year:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* DELETE: Academic year */
router.delete('/academic_year/:id', (req, res) => {
    let acadyear_id = req.params.id;

    if (!acadyear_id) {
        return res.status(400).send({ error: true, message: 'Please provide acadyear_id' });
    }

    try {
        db.query('DELETE FROM academic_year WHERE acadyear_id = ?', acadyear_id, (err, result) => {
            if (err) {
                console.error('Error deleting academic year:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error deleting academic year:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


module.exports = router;

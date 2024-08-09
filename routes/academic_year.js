const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();

/* post: academic year */
router.post('/register-academicyear', async (req, res) => {
    try {
        const { acadyear_name, status } = req.body;
        
        const insertAcademicYearQuery = 'INSERT INTO academic_year (acadyear_name, status) VALUES (?, ?)';
        await db.promise().execute(insertAcademicYearQuery, [acadyear_name, status]);

        res.status(201).json({ message: 'Academic year registered successfully' });
    } catch (error) {
        console.error('Error registering academic year:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: 1 academic year */
router.get('/academic_year/:id', (req, res) => {
    let acadyear_id = req.params.id;

    if (!acadyear_id) {
        return res.status(400).send({ error: true, message: 'Please provide acadyear_id' });
    }

    try {
        db.query('SELECT acadyear_id, acadyear_name, status FROM academic_year WHERE acadyear_id = ?', acadyear_id, (err, result) => {
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


/* get: academic years */
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


/* put: update academic year */
router.put('/academic_year/:id', async (req, res) => {
    const acadyear_id = req.params.id;
    const { acadyear_name, status } = req.body;

    if (!acadyear_id) {
        return res.status(400).send({ error: true, message: 'Please provide acadyear_id' });
    }

    try {
        const updateAcademicYearQuery = `
            UPDATE academic_year 
            SET acadyear_name = ?, status = ? 
            WHERE acadyear_id = ?
        `;
        await db.promise().execute(updateAcademicYearQuery, [acadyear_name, status, acadyear_id]);

        res.status(200).json({ message: 'Academic year updated successfully' });
    } catch (error) {
        console.error('Error updating academic year:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* delete: academic year */
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

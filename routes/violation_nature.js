const express = require('express');
const db = require('../app/configuration/database');
const router = express.Router();

/* post: violation nature */
router.post('/create-violationnature', async (req, res) => {
    try {
        const { nature_code, nature_name, status } = req.body;

        const insertNatureQuery = `
            INSERT INTO violation_nature (nature_code, nature_name, status) 
            VALUES (?, ?, ?)
        `;

        await db.promise().execute(insertNatureQuery, [nature_code, nature_name, status]);

        res.status(201).json({ message: 'Violation nature created successfully' });
    } catch (error) {
        console.error('Error creating violation nature:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get: violation natures */
router.get('/violation-natures', (req, res) => {
    try {
        db.query(`SELECT * FROM violation_nature`, (err, result) => {
            if (err) {
                console.error('Error fetching violation natures:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading violation natures:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get 1: violation nature */
router.get('/violation-nature/:id', (req, res) => {
    const nature_id = req.params.id;

    if (!nature_id) {
        return res.status(400).send({ error: true, message: 'Please provide nature_id' });
    }

    try {
        db.query(
            `SELECT nature_id, nature_code, nature_name, status FROM violation_nature WHERE nature_id = ?`,
            [nature_id],
            (err, result) => {
                if (err) {
                    console.error('Error fetching violation nature:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else if (result.length === 0) {
                    res.status(404).json({ message: 'Violation nature not found' });
                } else {
                    res.status(200).json(result[0]);
                }
            }
        );
    } catch (error) {
        console.error('Error loading violation nature:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: uniform defiance records */
router.get('/uniform-defiance', (req, res) => {
    try {
        const query = `
            SELECT ud.*, vn.nature_name
            FROM uniform_defiance ud
            LEFT JOIN violation_nature vn ON ud.nature_id = vn.nature_id
        `;

        db.query(query, (err, result) => {
            if (err) {
                console.error('Error fetching uniform defiance records:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            res.status(200).json(result);
        });
    } catch (error) {
        console.error('Error loading uniform defiance records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* put: violation nature */
router.put('/violation-nature/:id', async (req, res) => {
    const nature_id = req.params.id;
    const { nature_code, nature_name, status } = req.body;

    if (!nature_id || !nature_code || !nature_name || !status) {
        return res.status(400).send({ error: 'Please provide all required details' });
    }

    try {
        db.query(
            'UPDATE violation_nature SET nature_code = ?, nature_name = ?, status = ? WHERE nature_id = ?',
            [nature_code, nature_name, status, nature_id],
            (err, result) => {
                if (err) {
                    console.error('Error updating violation nature:', err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }
                res.status(200).json({ message: 'Violation nature updated successfully' });
            }
        );
    } catch (error) {
        console.error('Error updating violation nature:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* delete: violation nature */
router.delete('/violation-nature/:id', (req, res) => {
    const nature_id = req.params.id;

    if (!nature_id) {
        return res.status(400).send({ error: true, message: 'Please provide nature_id' });
    }

    try {
        db.query('DELETE FROM violation_nature WHERE nature_id = ?', [nature_id], (err, result) => {
            if (err) {
                console.error('Error deleting violation nature:', err);
                return res.status(500).json({ message: 'Internal Server Error', details: err });
            }
            res.status(200).json({ message: 'Violation nature deleted successfully' });
        });
    } catch (error) {
        console.error('Error deleting violation nature:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error });
    }
});


module.exports = router;

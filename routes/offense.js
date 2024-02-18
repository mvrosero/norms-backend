const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: offense*/
router.post('/registerOffense', async (req, res) => {

    try {
        const {offense_code, offense_name, description, category_id} = req.body;
        
        const insertOffenseQuery = 'INSERT INTO offense (offense_code, offense_name, description, category_id) VALUES ( ?, ?, ?, ?)';
        await db.promise().execute(insertOffenseQuery, [offense_code, offense_name, description, category_id]);

        res.status(201).json({ message: 'Offense registered successfully' });
    } catch (error) {
        console.error('Error registering offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 offense*/
router.get('/offense/:id',  (req, res) => {

    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide offense_id' });
    }

    try {
        db.query('SELECT offense_id, offense_code, offense_name, description, category_id FROM offense WHERE offense_id = ?', offense_id, (err, result) => {
            if (err) {
                console.error('Error fetching offense:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: offenses*/
router.get('/offenses', authenticateToken, (req, res) => {

    try {
        db.query('SELECT offense_code, offense_name, description, category_id FROM offense', (err, result) => {

            if (err) {
                console.error('Error fetching offenses:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading offenses:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: offense*/
router.put('/offense/:id', authenticateToken, async (req, res) => {

    let offense_id = req.params.id;

    const {offense_code, offense_name, description} = req.body;

    if (!offense_id || !offense_code || !offense_name || !description) {
        return res.status(400).send({ error: user, message: 'Please provide offense code, offense name and description' });
    }

    try {
        db.query('UPDATE offense SET offense_code = ?, offense_name = ?, description = ? WHERE offense_id = ?', [offense_code, offense_name, description, offense_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating offense:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: offense*/
router.delete('/offense/:id', authenticateToken, (req, res) => {

    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide offense_id' });
    }

    try {
        db.query('DELETE FROM offense WHERE offense_id = ?', offense_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting offense:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading offense:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
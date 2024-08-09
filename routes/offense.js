const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();


/*post: offense*/
router.post('/register-offense', async (req, res) => {

    try {
        const {offense_code, offense_name, category_id, status} = req.body;
        
        const insertOffenseQuery = 'INSERT INTO offense (offense_code, offense_name, category_id, status) VALUES ( ?, ?, ?, ?)';
        await db.promise().execute(insertOffenseQuery, [offense_code, offense_name, category_id, status]);

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
        db.query('SELECT offense_id, offense_code, offense_name, status, category_id FROM offense WHERE offense_id = ?', offense_id, (err, result) => {
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
router.get('/offenses', (req, res) => {

    try {
        db.query('SELECT * FROM offense', (err, result) => {

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
router.put('/offense/:id', async (req, res) => {

    let offense_id = req.params.id;

    const {offense_code, offense_name, status, category_id} = req.body;

    if (!offense_id || !offense_code || !offense_name || !status || !category_id) {
        return res.status(400).send({ error: user, message: 'Please provide information' });
    }

    try {
        db.query('UPDATE offense SET offense_code = ?, offense_name = ?, status = ?, category_id = ? WHERE offense_id = ?', [offense_code, offense_name, status, category_id, offense_id], (err, result, fields) => {
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
router.delete('/offense/:id', async (req, res) => {
    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide offense_id' });
    }

    try {
        db.query('DELETE FROM offense WHERE offense_id = ?', [offense_id], (err, result) => {
            if (err) {
                console.error('Error deleting offense:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                if (result.affectedRows === 0) {
                    res.status(404).json({ message: 'Offense not found' });
                } else {
                    res.status(200).json({ message: 'Offense deleted successfully' });
                }
            }
        });
    } catch (error) {
        console.error('Error deleting offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
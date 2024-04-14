const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt'); 
const router = express.Router();


/*post: sanction*/
router.post('/registerUnifDefiance', async (req, res) => {

    try {
        const {sanction_code, sanction_name, description, offense_id} = req.body;
        
        const insertSanctionQuery = 'INSERT INTO sanction (sanction_code, sanction_name, description, offense_id) VALUES ( ?, ?, ?, ?)';
        await db.promise().execute(insertSanctionQuery, [sanction_code, sanction_name, description, offense_id]);

        res.status(201).json({ message: 'Sanction registered successfully' });
    } catch (error) {
        console.error('Error registering sanction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 sanction*/
router.get('/sanction/:id',  (req, res) => {

    let sanction_id = req.params.id;

    if (!sanction_id) {
        return res.status(400).send({ error: true, message: 'Please provide sanction_id' });
    }

    try {
        db.query('SELECT sanction_id, sanction_code, sanction_name, description, offense_id FROM sanction WHERE sanction_id = ?', sanction_id, (err, result) => {
            if (err) {
                console.error('Error fetching sanction:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: sanctions*/
router.get('/sanctions', (req, res) => {

    try {
        db.query('SELECT sanction_code, sanction_name, description, offense_id FROM sanction', (err, result) => {

            if (err) {
                console.error('Error fetching sanctions:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanctions:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: sanction*/
router.put('/sanction/:id', async (req, res) => {

    let sanction_id = req.params.id;

    const {sanction_code, sanction_name, description} = req.body;

    if (!sanction_id || !sanction_code || !sanction_name || !description) {
        return res.status(400).send({ error: user, message: 'Please provide sanction code, sanction name and description' });
    }

    try {
        db.query('UPDATE sanction SET sanction_code = ?, sanction_name = ?, description = ? WHERE sanction_id = ?', [sanction_code, sanction_name, description, sanction_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating sanction:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: sanction*/
router.delete('/sanction/:id', (req, res) => {

    let sanction_id = req.params.id;

    if (!sanction_id) {
        return res.status(400).send({ error: true, message: 'Please provide sanction_id' });
    }

    try {
        db.query('DELETE FROM sanction WHERE sanction_id = ?', sanction_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting sanction:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanction:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});



/*export*/
module.exports = router;
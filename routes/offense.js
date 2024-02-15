const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt'); 
const router = express.Router();



router.post('/offenseReg', async (req, res) => {

    try {
        const {offense_code,offense_name,description, category_id} = req.body;
        

        const insertUsersQuery = 'INSERT INTO offense (offense_code, offense_name,description,category_id) VALUES ( ?, ?)';
        await db.promise().execute(insertUsersQuery, [offense_code, offense_name,description,category_id]);

        res.status(201).json({ message: 'offense registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/*get: 1 role*/
router.get('/offense/:id',  (req, res) => {

    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('SELECT offense_id, offense_code, offense_name,category_id FROM offense WHERE offense_id = ?', offense_id, (err, result) => {
            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: roles*/
router.get('/offense', authenticateToken, (req, res) => {

    try {
        db.query('SELECT offense_name, description, category_id FROM offense', (err, result) => {

            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: role*/
router.put('/offense/:id', authenticateToken, async (req, res) => {

    let offense_id = req.params.id;

    const {offense_name, description} = req.body;

    if (!offense_id || !offense_name || !description) {
        return res.status(400).send({ error: user, message: 'Please provide role code and role name' });
    }

    try {
        db.query('UPDATE offense SET offense_name = ?, description = ? WHERE offense_id = ?', [offense_name, description, offense_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating item:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: role*/
router.delete('/offense/:id', authenticateToken, (req, res) => {

    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('DELETE FROM offense  WHERE offense_id = ?', offense_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting item:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
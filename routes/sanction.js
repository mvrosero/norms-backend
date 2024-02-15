const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt'); 
const router = express.Router();



router.post('/sanctionReg', async (req, res) => {

    try {
        const {sanction_code,sanction_name,description, offense_id} = req.body;
        

        const insertUsersQuery = 'INSERT INTO sanction (sanction_code, sanction_name,description,offense_id) VALUES ( ?, ?,?,?)';
        await db.promise().execute(insertUsersQuery, [sanction_code, sanction_name,description,offense_id]);

        res.status(201).json({ message: 'Sanction registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/*get: 1 role*/
router.get('/sanction/:id',  (req, res) => {

    let sanction_id = req.params.id;

    if (!sanction_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('SELECT sanction_id, sanction_code, sanction_name,offense_id FROM offense WHERE sanction_id = ?', sanction_id, (err, result) => {
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
router.get('/sanction', authenticateToken, (req, res) => {

    try {
        db.query('SELECT sanction_code, sanction_name,description, offense_id FROM sanction', (err, result) => {

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
router.put('/sanction/:id', authenticateToken, async (req, res) => {

    let sanction_id = req.params.id;

    const {sanction_code, sanction_name,description} = req.body;

    if (!sanction_id || !sanction_code || !sanction_name ||!description) {
        return res.status(400).send({ error: user, message: 'Please provide role code and role name' });
    }

    try {
        db.query('UPDATE offense SET sanction_code = ?,sanction_name = ?, description = ? WHERE sanction_id = ?', [sanction_code,sanction_name, description, sanction_id], (err, result, fields) => {
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
router.delete('/sanction/:id', authenticateToken, (req, res) => {

    let sanction_id = req.params.id;

    if (!sanction_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('DELETE FROM sanction  WHERE sanction_id = ?', sanction_id, (err, result, fields) => {
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
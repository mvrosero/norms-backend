const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: role*/
router.post('/registerRole', async (req, res) => {

    try {
        const {role_code, role_name} = req.body;

        const insertRoleQuery = 'INSERT INTO role (role_code, role_name) VALUES ( ?, ?)';
        await db.promise().execute(insertRoleQuery, [role_code, role_name]);

        res.status(201).json({ message: 'Role registered successfully' });
    } catch (error) {
        console.error('Error registering role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 role*/
router.get('/role/:id',  (req, res) => {

    let role_id = req.params.id;

    if (!role_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('SELECT role_id, role_code, role_name FROM role WHERE role_id = ?', role_id, (err, result) => {
            if (err) {
                console.error('Error fetching role:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: roles*/
router.get('/roles', (req, res) => {

    try {
        db.query('SELECT role_id, role_code, role_name FROM role', (err, result) => {

            if (err) {
                console.error('Error fetching roles:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading roles:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: role*/
router.put('/role/:id', async (req, res) => {

    let role_id = req.params.id;

    const {role_code, role_name} = req.body;

    if (!role_id || !role_code || !role_name) {
        return res.status(400).send({ error: user, message: 'Please provide role code and role name' });
    }

    try {
        db.query('UPDATE role SET role_code = ?, role_name = ? WHERE role_id = ?', [role_code, role_name, role_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating role:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: role*/
router.delete('/role/:id', (req, res) => {

    let role_id = req.params.id;

    if (!role_id) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('DELETE FROM role WHERE role_id = ?', role_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting role:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading role:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
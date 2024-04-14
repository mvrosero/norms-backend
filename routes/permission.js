const express = require('express'); 
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: permission*/
router.post('/registerPermission', async (req, res) => {

    try {
        const {permission_name, resource} = req.body;

        const insertPermissionQuery = 'INSERT INTO permission (permission_name, resource) VALUES ( ?, ?)';
        await db.promise().execute(insertPermissionQuery, [permission_name, resource]);

        res.status(201).json({ message: 'Permission registered successfully' });
    } catch (error) {
        console.error('Error registering permission:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 permission*/
router.get('/permission/:id',  (req, res) => {

    let permission_id = req.params.id;

    if (!permission_id) {
        return res.status(400).send({ error: true, message: 'Please provide permission_id' });
    }

    try {
        db.query('SELECT permission_id, permission_name, resource FROM permission WHERE permission_id = ?', permission_id, (err, result) => {
            if (err) {
                console.error('Error fetching permission:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading permission:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: permissions*/
router.get('/permissions', (req, res) => {

    try {
        db.query('SELECT permission_id, permission_name, resource FROM permissions', (err, result) => {

            if (err) {
                console.error('Error fetching permissions:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading permissions:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: permissions*/
router.put('/permission/:id', async (req, res) => {

    let permission_id = req.params.id;

    const {permission_name, resource} = req.body;

    if (!permission_id || !permission_name || !resource) {
        return res.status(400).send({ error: user, message: 'Please provide permission_name and resource' });
    }

    try {
        db.query('UPDATE permission SET permission_name = ?, resource = ? WHERE permission_id = ?', [permission_name, resource, permission_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating permission:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading permission:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: permission*/
router.delete('/permission/:id', (req, res) => {

    let permission_id = req.params.id;

    if (!permission_id) {
        return res.status(400).send({ error: true, message: 'Please provide permission_id' });
    }

    try {
        db.query('DELETE FROM permission WHERE permission_id = ?', permission_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting permission:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading permission:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
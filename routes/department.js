const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: department*/
router.post('/registerDepartment', async (req, res) => {

    try {
        const {dept_code, dept_name} = req.body;
        
        const insertDepartmentQuery = 'INSERT INTO department (dept_code, dept_name) VALUES ( ?, ?)';
        await db.promise().execute(insertDepartmentQuery, [dept_code, dept_name]);

        res.status(201).json({ message: 'Department registered successfully' });
    } catch (error) {
        console.error('Error registering department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 department*/
router.get('/department/:id',  (req, res) => {

    let dept_id = req.params.id;

    if (!dept_id) {
        return res.status(400).send({ error: true, message: 'Please provide dept_id' });
    }

    try {
        db.query('SELECT dept_id, dept_code, dept_name FROM department WHERE dept_id = ?', dept_id, (err, result) => {
            if (err) {
                console.error('Error fetching department:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: departments*/
router.get('/departments', (req, res) => {

    try {
        db.query('SELECT dept_id, dept_code, dept_name FROM department', (err, result) => {

            if (err) {
                console.error('Error fetching departments:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading departments:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: department*/
router.put('/department/:id', async (req, res) => {

    let dept_id = req.params.id;

    const {dept_code, dept_name} = req.body;

    if (!dept_id || !dept_code || !dept_name) {
        return res.status(400).send({ error: user, message: 'Please provide department code and department name' });
    }

    try {
        db.query('UPDATE department SET dept_code = ?, dept_name = ? WHERE dept_id = ?', [dept_code, dept_name, dept_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating department:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: department*/
router.delete('/department/:id', (req, res) => {

    let dept_id = req.params.id;

    if (!dept_id) {
        return res.status(400).send({ error: true, message: 'Please provide dept_id' });
    }

    try {
        db.query('DELETE FROM department  WHERE dept_id = ?', dept_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting department:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading department:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;
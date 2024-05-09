const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();


/*post: department*/
router.post('/register-department', async (req, res) => {

    try {
        const {department_code, department_name, status} = req.body;
        
        const insertDepartmentQuery = 'INSERT INTO department (department_code, department_name, status) VALUES ( ?, ?, ?)';
        await db.promise().execute(insertDepartmentQuery, [department_code, department_name, status]);

        res.status(201).json({ message: 'Department registered successfully' });
    } catch (error) {
        console.error('Error registering department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 department*/
router.get('/department/:id',  (req, res) => {

    let department_id = req.params.id;

    if (!department_id) {
        return res.status(400).send({ error: true, message: 'Please provide department_id' });
    }

    try {
        db.query('SELECT department_id, department_code, department_name FROM department WHERE department_id = ?', department_id, (err, result) => {
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
        db.query('SELECT * FROM department', (err, result) => {

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

    let department_id = req.params.id;

    const {department_code, department_name} = req.body;

    if (!department_id || !department_code || !department_name) {
        return res.status(400).send({ error: user, message: 'Please provide department code and department name' });
    }

    try {
        db.query('UPDATE department SET department_code = ?, department_name = ? WHERE department_id = ?', [department_code, department_name, department_id], (err, result, fields) => {
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


module.exports = router;
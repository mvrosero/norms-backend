const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/
const bcrypt = require('bcrypt'); /*password encryption*/
const config =require('../app/middleware/config')
const secretKey = config.secretKey;
const router = express.Router();

/*post: employee login*/
router.post('/employeeLogin', async (req, res) => {
   
    try {
        const {employee_number, password } = req.body;

        const getEmployeeQuery = 'SELECT * FROM employee WHERE employee_number = ?';
        const [rows] = await db.promise().execute(getEmployeeQuery,[employee_number]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid employee number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);


        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({employeeId: user.id, employee_number:user.employee_number,}, secretKey, { expiresIn: '1h'});

            res.status(200).json({ token });
        }   catch (error) {
            console.error('Error logging in user:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
});


/*post: register employee*/
router.post('/registerEmployee',  async (req, res) => {

    try {
        const {employee_number, name, email, password, birthdate, role_id} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertEmployeeQuery = 'INSERT INTO employee (employee_number,name, email, password, birthdate, role_id) VALUES (?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertEmployeeQuery, [employee_number, name, email, hashedPassword, birthdate, role_id]);

        res.status(201).json({ message: 'Employee registered successfully' });
    } catch (error) {
        console.error('Error registering employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: employee*/
router.get('/employee/:id', authenticateToken, (req, res) => {

    let employee_id = req.params.id;

    if (!employee_id) {
        return res.status(400).send({ error: true, message: 'Please provide employee_id' });
    }

    try {
        db.query('SELECT employee_number, name, email, birthdate FROM employee WHERE employee_id = ?', employee_id, (err, result) => {
            if (err) {
                console.error('Error fetching employee:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: employees*/
router.get('/employees', authenticateToken, (req, res) => {

    try {
        db.query('SELECT employee_number,name, email, birthdate FROM employee', (err, result) => {

            if (err) {
                console.error('Error fetching employees:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading employees:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: student*/
router.put('/employee/:id', authenticateToken, async (req, res) => {

    let employee_id = req.params.id;

    const {password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!employee_id || !password) {
        return res.status(400).send({ error: user, message: 'Please provide password' });
    }

    try {
        db.query('UPDATE employee SET password = ? WHERE employee_id = ?', [hashedPassword, employee_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating employee:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: employee (for admin only)*/
router.delete('/employee/:id', authenticateToken, (req, res) => {

    let employee_id = req.params.id;

    if (!employee_id) {
        return res.status(400).send({ error: true, message: 'Please provide employee_id' });
    }

    try {
        db.query('DELETE FROM employee WHERE employee_id = ?', employee_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting employee:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading employee:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;


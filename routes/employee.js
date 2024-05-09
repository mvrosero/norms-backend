const express = require('express');
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();

/* post: employee login */
router.post('/employee-login', async (req, res) => {
    try {
        const { employee_idnumber, password } = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE employee_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [employee_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid employee number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Retrieve the role_id from the user data
        const { role_id } = user;

        // generate JWT token
        const token = jwt.sign({ userId: user.employee_idnumber, employee_idnumber: user.employee_idnumber }, secretKey, { expiresIn: '1h' });

        // return token and role_id in response
        res.status(200).json({ token, role_id });
    } catch (error) {
        console.error('Error logging in employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* post: register employee */
router.post('/register-employee', async (req, res) => {
    try {
        const { employee_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, password,profile_photo_filename, role_id, department_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertEmployeeQuery = 'INSERT INTO user (employee_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, password,profile_photo_filename, role_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?,?)';
        await db.promise().execute(insertEmployeeQuery, [employee_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, hashedPassword,profile_photo_filename, role_id, department_id]);

        res.status(201).json({ message: 'Employee registered successfully' });
    } catch (error) {
        console.error('Error registering employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* get: employees */
router.get('/employees', (req, res) => {
    try {
        db.query(`SELECT employee_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, profile_photo_filename, role_id, department_id ,status  FROM user WHERE employee_idnumber IS NOT NULL`, (err, result) => {
            if (err) {
                console.error('Error fetching employees:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading employees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

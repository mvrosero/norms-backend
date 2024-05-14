const express = require('express');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();


/*post: employee login*/



router.post('/employee-login', async (req, res) => {
    try {
        const { employee_idnumber, password } = req.body;

        // Sanitize input and prevent SQL injection
        const getUserQuery = 'SELECT * FROM user WHERE employee_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [employee_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid employee number or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid employee number or password' });
        }

        // Generate JWT token with minimal payload
        const tokenPayload = {
            userId: user.employee_idnumber,
            role_id: user.role_id
        };
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' });

        // Return token and role_id in response
        res.status(200).json({ token, role_id: user.role_id });
    } catch (error) {
        console.error('Error logging in employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* post: register employee */
router.post('/register-employee', async (req, res) => {
    try {
        const { employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, role_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertEmployeeQuery = 'INSERT INTO user (employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertEmployeeQuery, [employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, hashedPassword, profile_photo_filename, role_id]);

        res.status(201).json({ message: 'Employee registered successfully' });
    } catch (error) {
        console.error('Error registering employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 employee*/
router.get('/employee/:id',  (req, res) => {

    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('SELECT employee_idnumber, first_name,middle_name,last_name,suffix, birthdate, email, profile_photo_filename, role_id, status  FROM user WHERE user_id = ?', user_id, (err, result) => {
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
router.get('/employees', (req, res) => {
    try {
        db.query(`SELECT * FROM user WHERE employee_idnumber IS NOT NULL`, (err, result) => {
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


/*put: employee*/
router.put('/employee/:id', async (req, res) => {
    try {
        const user_id = req.params.id;
        const { employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, role_id, status } = req.body;

        // Validate required fields
        if (!user_id || !employee_idnumber || !first_name || !last_name || !birthdate || !email || !profile_photo_filename || !role_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        // Perform database update
        db.query(
            'UPDATE user SET employee_idnumber = ?, first_name = ?, middle_name = ?, last_name = ?, suffix = ?, birthdate = ?, email = ?, password = ?, profile_photo_filename = ?, role_id = ?, status = ? WHERE user_id = ?', 
            [employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, role_id, status, user_id], 
            (err, result) => {
                if (err) {
                    console.error('Error updating employee:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                res.status(200).json({ message: 'Employee updated successfully', result });
            }
        );
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/*delete: employee*/
router.delete('/employee/:id', (req, res) => {

    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM user WHERE user_id = ?', user_id, (err, result, fields) => {
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


module.exports = router;

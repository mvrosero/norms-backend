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
            user_id: user.user_id, // Include user_id
            userId: user.employee_idnumber,
            role_id: user.role_id
        };
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' });

        // Return token and role_id in response
        res.status(200).json({ token, user_id: user.user_id, role_id: user.role_id });
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


// Get employee by employee_idnumber
router.get('/employees/:employee_idnumber', async (req, res) => {
    const employee_idnumber = req.params.employee_idnumber.trim(); // Trim spaces

    if (!employee_idnumber) {
        return res.status(400).json({ error: 'Please provide employee_idnumber' });
    }

    const sqlQuery = `
        SELECT 
            CONCAT_WS(' ', first_name, COALESCE(middle_name, ''), last_name, COALESCE(suffix, '')) AS full_name
        FROM user
        WHERE employee_idnumber = ?
    `;

    console.log('Executing SQL Query:', sqlQuery);
    console.log('With Parameter:', employee_idnumber);

    try {
        const [rows] = await db.promise().execute(sqlQuery, [employee_idnumber]);

        console.log('Query Result:', rows);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json({ name: rows[0].full_name });
    } catch (error) {
        console.error('Error fetching employee:', error);
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
        const { employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, role_id, status } = req.body;

        // Validate required fields
        if (!user_id || !employee_idnumber || !first_name || !last_name || !birthdate || !email || !role_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        // Perform database update
        db.query(
            'UPDATE user SET employee_idnumber = ?, first_name = ?, middle_name = ?, last_name = ?, suffix = ?, birthdate = ?, email = ?, password = ?, role_id = ?, status = ? WHERE user_id = ?', 
            [employee_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, role_id, status, user_id], 
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


/*put: employee password*/
router.put('/password-change/:id', async (req, res) => {
    const user_id = req.params.id;
    const { current_password, new_password } = req.body;

    // Validate required fields
    if (!user_id || !current_password || !new_password) {
        return res.status(400).json({ error: 'Please provide all required details' });
    }

    try {
        // Fetch the current hashed password from the database
        db.query('SELECT password FROM user WHERE user_id = ?', [user_id], async (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const hashedPassword = results[0].password;

            // Verify the current password
            const match = await bcrypt.compare(current_password, hashedPassword);
            if (!match) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Hash the new password
            const newHashedPassword = await bcrypt.hash(new_password, 10);

            // Update the new password in the database
            db.query('UPDATE user SET password = ? WHERE user_id = ?', [newHashedPassword, user_id], (err, result) => {
                if (err) {
                    console.error('Error updating password:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                res.status(200).json({ message: 'Password updated successfully' });
            });
        });
    } catch (error) {
        console.error('Error updating password:', error);
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

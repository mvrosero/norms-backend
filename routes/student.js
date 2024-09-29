const express = require('express');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();


/*post: student login*/
router.post('/student-login', async (req, res) => {
    try {
        const { student_idnumber, password } = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE student_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [student_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Retrieve the role_id, and user_id from the user data
        const { role_id, user_id } = user;

        // Generate JWT token
        const token = jwt.sign(
            { student_idnumber: user.student_idnumber },
            secretKey,
            { expiresIn: '1h' }
        );

        // Return token, role_id, student_idnumber, and user_id in response
        res.status(200).json({ token, role_id, student_idnumber: user.student_idnumber, user_id });
    } catch (error) {
        console.error('Error logging in student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* post: register student */
router.post('/register-student', async (req, res) => {
    try {
        const { student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, year_level, batch, department_id, program_id, role_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertStudentQuery = `
            INSERT INTO user 
            (student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, password, profile_photo_filename, year_level, batch, department_id, program_id, role_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.promise().execute(insertStudentQuery, [student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, hashedPassword, profile_photo_filename, year_level, batch, department_id, program_id, role_id]);

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* get: 1 student using student_idnumber */
router.get('/student/:student_idnumber', (req, res) => {
    let student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        db.query(
            `SELECT u.student_idnumber, u.first_name, u.middle_name, u.last_name, u.suffix, u.birthdate, u.email, u.profile_photo_filename, u.year_level, u.batch, d.department_name, p.program_name, u.role_id, u.status 
             FROM user u 
             JOIN department d ON u.department_id = d.department_id 
             JOIN program p ON u.program_id = p.program_id 
             WHERE u.student_idnumber = ?`,
            student_idnumber,
            (err, result) => {
                if (err) {
                    console.error('Error fetching student:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: students*/
router.get('/students', (req, res) => {
    try {
        db.query(`SELECT * FROM user WHERE student_idnumber IS NOT NULL`, (err, result) => {
            if (err) {
                console.error('Error fetching students:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* put:  student */
router.put('/student/:id', async (req, res) => {
    let user_id = req.params.id;
    console.log('User ID:', user_id); // Log user_id for debugging
    console.log('Request Body:', req.body); // Log the request body for debugging

    const { student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, year_level, batch, department_id, program_id, status } = req.body;

    // Check for required fields
    if (!user_id || !student_idnumber || !first_name || !last_name || !birthdate || !email || !year_level || !batch || !department_id || !program_id || !status) {
        return res.status(400).send({ error: 'Please provide all required details' });
    }

    try {
        db.query('UPDATE user SET student_idnumber = ?, first_name = ?, middle_name = ?, last_name = ?, suffix = ?, birthdate = ?, email = ?, year_level = ?, batch = ?, department_id = ?, program_id = ?, status = ? WHERE user_id = ?', 
        [student_idnumber, first_name, middle_name, last_name, suffix, birthdate, email, year_level, batch, department_id, program_id, status, user_id], 
        (err, result, fields) => {
            if (err) {
                console.error('Error updating student:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            res.status(200).json(result);
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/*put: student password*/
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


/*delete: student*/
router.delete('/student/:id', (req, res) => {
    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM user WHERE user_id = ?', [user_id], (err, result, fields) => {
            if (err) {
                console.error('Error deleting student:', err);
                return res.status(500).json({ message: 'Internal Server Error', details: err });
            } else {
                // Only return the success message
                res.status(200).json({ message: 'Student deleted successfully' });
            }
        });
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error });
    }
});




module.exports = router;

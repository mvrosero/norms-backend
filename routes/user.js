const express = require('express');
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();

/* Post: user login */
router.post('/employeelogin', async (req, res) => {
    try {
        const { employee_idnumber, password } = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE employee_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [employee_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid user_number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user.employee_idnumber, employee_idnumber: user.employee_idnumber }, secretKey, { expiresIn: '1h' });

        // Return token in response
        res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/StudentLogin', async (req, res) => {
    try {
        const { student_idnumber, password } = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE student_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [student_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid user_number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user.student_idnumber, student_idnumber: user.student_idnumber }, secretKey, { expiresIn: '1h' });

        // Return token and birthdate in response
        res.status(200).json({ token, birthdate: user.birthdate });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/* Post: register user */
/* Post: register user */
router.post('/registerEmployee', async (req, res) => {
    try {
  
            const { employee_idnumber, fullname, birthdate, email, password,role_id, department_id } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertStudentQuery = 'INSERT INTO user (employee_idnumber, fullname, birthdate, email, password,  role_id, department_id) VALUES ( ?, ?, ?, ?, ?, ?, ?)';
            await db.promise().execute(insertStudentQuery, [employee_idnumber, fullname, birthdate, email, hashedPassword,role_id, department_id]);
       

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/registerStudents', async (req, res) => {
    try {
  
            const { student_idnumber, fullname, birthdate, email, password,year_level, profile_photo_filename,role_id, department_id,program_id } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertStudQuery = 'INSERT INTO user (student_idnumber, fullname, birthdate, email, password,year_level, profile_photo_filename, role_id, department_id,program_id) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?,?,?)';
            await db.promise().execute(insertStudQuery, [student_idnumber, fullname, birthdate, email, hashedPassword,year_level,profile_photo_filename, role_id, department_id,program_id]);
       

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/employees', (req, res) => {
    try {
        db.query(`SELECT employee_idnumber, fullname, birthdate, email, profile_photo_filename, role_id, department_id
        FROM user
        WHERE employee_idnumber IS NOT NULL`, (err, result) => {
            if (err) {
                console.error('Error fetching users:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/students', (req, res) => {
    try {
        db.query(`SELECT student_idnumber, fullname, birthdate, email, year_level, profile_photo_filename, role_id, department_id, program_id
        FROM user
        WHERE student_idnumber IS NOT NULL`, (err, result) => {
            if (err) {
                console.error('Error fetching users:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/* Get: user */
router.get('/user/:id', (req, res) => {
    let id = req.params.id;

    if (!id) {
        return res.status(400).send({ error: true, message: 'Please provide id' });
    }

    try {
        db.query('SELECT name, user_number, email FROM user WHERE user_id = ?', id, (err, result) => {
            if (err) {
                console.error('Error fetching user:', err);
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

/* Get: users */
router.get('/users', (req, res) => {
    try {
        db.query('SELECT * FROM user INNER JOIN role ON user.role_id = role.role_id', (err, result) => {
            if (err) {
                console.error('Error fetching users:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* Put: user */
/* Put: user */
router.put('/user/:id', async (req, res) => {
    let user_id = req.params.id;

    const {student_idnumber, fullname, birthdate, email, password, year_level,profile_photo_filename, department_id, program_id, role_id } = req.body;

    // Check if password is provided and not empty
    if (!password) {
        return res.status(400).send({ error: true, message: 'Password is required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user_id || !student_idnumber || !fullname || !birthdate || !email || !hashedPassword || !year_level ||  !profile_photo_filename|| !department_id || !program_id || !role_id) {
        return res.status(400).send({ error: true, message: 'Please provide all required fields' });
    }

    try {
        db.query('UPDATE user SET  student_idnumber =? , fullname = ?, birthdate = ?, email = ?, password = ?, year_level = ?,profile_photo_filename = ?, department_id = ?, program_id = ?, role_id = ? WHERE user_id = ?', 
            [student_idnumber,fullname, birthdate, email, hashedPassword, year_level,profile_photo_filename, department_id, program_id, role_id, user_id], 
            (err, result) => {
                if (err) {
                    console.error('Error updating user:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* Delete: user */
router.delete('/user/:id', (req, res) => {
    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM user WHERE user_id = ?', user_id, (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
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

module.exports = router;

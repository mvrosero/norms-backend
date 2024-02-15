const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/
const bcrypt = require('bcrypt'); /*password encryption*/
const config =require('../app/middleware/config')
const secretKey = config.secretKey;
const router = express.Router();

/*post: login*/
router.post('/login', async (req, res) => {
   
    try {
        const { student_number, password } = req.body;

        const getStudentQuery = 'SELECT * FROM student WHERE student_id = ?';
        const [rows] = await db.promise().execute(getStudentQuery, [student_number]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, student.password);


        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }


        const token = jwt.sign({ studentID: student.id, student_number: student.student_number }, secretKey, { expiresIn: '1h'});

            res.status(200).json({ token });
        }   catch (error) {
            console.error('Error logging in user:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
});

/*post: register*/
router.post('/register',  async (req, res) => {

    try {
        const {student_number,name, email, password, birthdate,role_id} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUsersQuery = 'INSERT INTO student (student_number,name, email, password, birthdate,role_id) VALUES (?, ?, ?, ?,?,?)';
        await db.promise().execute(insertUsersQuery, [student_number,name, username,email, hashedPassword,birthdate,role_id]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: user*/
router.get('/user/:id', authenticateToken, (req, res) => {

    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('SELECT user_id, name, username FROM users WHERE user_id = ?', user_id, (err, result) => {
            if (err) {
                console.error('Error fetching items:', err);
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

/*put: user*/
router.put('/user/:id', authenticateToken, async (req, res) => {

    let user_id = req.params.id;

    const {name, username, password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user_id || !name || !username || !password) {
        return res.status(400).send({ error: user, message: 'Please provide name, username, and password' });
    }

    try {
        db.query('UPDATE users SET name = ?, username = ?, password = ? WHERE user_id = ?', [name, username, hashedPassword, user_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating item:', err);
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


/*delete: user*/
router.delete('/user/:id', authenticateToken, (req, res) => {

    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM users WHERE user_id = ?', user_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting item:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*get: users*/
router.get('/users', authenticateToken, (req, res) => {

    try {
        db.query('SELECT user_id, name, username FROM users', (err, result) => {

            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

/*export*/
module.exports = router;


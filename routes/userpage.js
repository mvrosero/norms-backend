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
        const {student_number, password } = req.body;

        const getUserQuery = 'SELECT * FROM student WHERE student_number = ?';
        const [rows] = await db.promise().execute(getUserQuery,[student_number]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username ' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);


        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({studentId: user.id, student_number:user.student_number,}, secretKey, { expiresIn: '1h'});

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
        await db.promise().execute(insertUsersQuery, [student_number,name,email, hashedPassword,birthdate,role_id]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: user*/
router.get('/student/:id', authenticateToken, (req, res) => {

    let student_id = req.params.id;

    if (!student_id) {
        return res.status(400).send({ error: true, message: 'Please provide student_id' });
    }

    try {
        db.query('SELECT student_number, name, email,birthdate FROM student WHERE student_id = ?', student_id, (err, result) => {
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
router.put('/student/:id', authenticateToken, async (req, res) => {

    let student_id = req.params.id;

    const {name, password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!student_id || !name || !password) {
        return res.status(400).send({ error: user, message: 'Please provide name and password' });
    }

    try {
        db.query('UPDATE student SET name = ?,  password = ? WHERE student_id = ?', [name,  hashedPassword, student_id], (err, result, fields) => {
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
router.delete('/student/:id', authenticateToken, (req, res) => {

    let student_id = req.params.id;

    if (!student_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM student WHERE student_id = ?', student_id, (err, result, fields) => {
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
router.get('/students', authenticateToken, (req, res) => {

    try {
        db.query('SELECT student_number,name,email,birthdate username FROM student', (err, result) => {

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


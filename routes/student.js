const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/
const bcrypt = require('bcrypt'); /*password encryption*/
const config =require('../app/middleware/config')
const secretKey = config.secretKey;
const router = express.Router();


/*post: student login*/
router.post('/studentLogin', async (req, res) => {
   
    try {
        const {student_number, password } = req.body;

        const getStudentQuery = 'SELECT * FROM student WHERE student_number = ?';
        const [rows] = await db.promise().execute(getStudentQuery,[student_number]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student number' });
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


/*post: register student*/
router.post('/registerStudent',  async (req, res) => {

    try {
        const {student_number,name, email, password, birthdate, role_id, dept_id} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertStudentQuery = 'INSERT INTO student (student_number, name, email, password, birthdate, role_id, dept_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertStudentQuery, [student_number, name, email, hashedPassword, birthdate, role_id, dept_id]);

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: student*/
router.get('/student/:id', (req, res) => {

    let student_id = req.params.id;

    if (!student_id) {
        return res.status(400).send({ error: true, message: 'Please provide student_id' });
    }

    try {
        db.query('SELECT student_number, name, email, birthdate FROM student WHERE student_id = ?', student_id, (err, result) => {
            if (err) {
                console.error('Error fetching student:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: students*/
router.get('/students',  (req, res) => {

    try {
        db.query('SELECT student_number, name, email, birthdate FROM student', (err, result) => {

            if (err) {
                console.error('Error fetching students:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading students:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: student*/
router.put('/student/:id', async (req, res) => {

    let student_id = req.params.id;

    const {password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!student_id || !password) {
        return res.status(400).send({ error: user, message: 'Please provide password' });
    }

    try {
        db.query('UPDATE student SET password = ? WHERE student_id = ?', [hashedPassword, student_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating student:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: student (for admin only)*/
router.delete('/student/:id',  (req, res) => {

    let student_id = req.params.id;

    if (!student_id) {
        return res.status(400).send({ error: true, message: 'Please provide student_id' });
    }

    try {
        db.query('DELETE FROM student WHERE student_id = ?', student_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting student:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;


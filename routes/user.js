const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/
const bcrypt = require('bcrypt'); /*password encryption*/
const config =require('../app/middleware/config')
const secretKey = config.secretKey;
const router = express.Router();


/*post: user login*/
router.post('/login', async (req, res) => {
    try {
        const {user_number, password} = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE student_idnumber = ? OR employee_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [user_number, user_number]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid user_number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user.user_id, user_number: user.student_idnumber || user.employee_idnumber }, secretKey, { expiresIn: '1h' });

        /*redirect user based on role*/
        switch (user.role_id) {
            case 1: /*administrator role*/
                res.redirect('/administrator/login');  
                break;
            case 2: /*coordinator role*/
                res.redirect('/coordinator/login'); 
                break;
            case 3: /*osa staff role*/
                res.redirect('/osa_staff/login'); 
                break;
            case 4: /*ncf_staff role*/
                res.redirect('/ncf_staff/login'); 
                break;
            case 5: /*security role*/
                res.redirect('/security/login'); 
                break;
            case 6: /*student role*/
            res.redirect('/student/login'); 
            break;
        }
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*post: register user*/
router.post('/registerUser', async (req, res) => {
    try {
        const { name, user_number, username, email, password, role_id, department, program, year_level } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        if (role_id === 6) { /*student registration*/
            const insertStudentQuery = 'INSERT INTO user (name, user_number, username, email, password, role_id, department, program, year_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await db.promise().execute(insertStudentQuery, [name, user_number, username, email, hashedPassword, role_id, department, program, year_level]);
        } else { /*employee registration*/
            const insertUserQuery = 'INSERT INTO user (name, user_number, username, email, password, role_id) VALUES (?, ?, ?, ?, ?, ?)';
            await db.promise().execute(insertUserQuery, [name, user_number, username, email, hashedPassword, role_id]);
        }

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: user*/
router.get('/user/:id',  (req, res) => {

    let id = req.params.id;

    if (!id) {
        return res.status(400).send({ error: true, message: 'Please provide id' });
    }

    try {
        db.query('SELECT name, user_number, username, email FROM user WHERE id = ?', id, (err, result) => {
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


/*get: users*/
router.get('/users',  (req, res) => {

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
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: user*/
router.put('/user/:id',  async (req, res) => {

    let user_id = req.params.id;

    const {name,user_number,username,email,password,role_id} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user_id || !name || !user_number || !username || !email || !password || !role_id) {
        return res.status(400).send({ error: user, message: 'Please provide password' });
    }

    try {
        db.query('UPDATE user SET name = ?, user_number = ?, username = ?, email =?, password = ?, role_id = ? WHERE user_id = ?', [name, user_number, username, email, hashedPassword, role_id, user_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating user:', err);
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
router.delete('/user/:id',  (req, res) => {

    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM user WHERE user_id = ?', id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting user:', err);
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


/*export*/
module.exports = router;


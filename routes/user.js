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
        const {user_number, password } = req.body;

        const getUserQuery = 'SELECT * FROM user WHERE user_number = ?';
        const [rows] = await db.promise().execute(getUserQuery,[user_number]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid user_number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);


        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({userId: user.id, user_number:user.user_number,}, secretKey, { expiresIn: '1h'});

            res.status(200).json({ token });
        }   catch (error) {
            console.error('Error logging in user:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
});


/*post: register user*/
router.post('/register',  async (req, res) => {

    try {
        const {name, user_number,username, email, password, role_id} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUserQuery = 'INSERT INTO user (name, user_number, username, email, password, role_id) VALUES (?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertUserQuery, [name, user_number, username, email, hashedPassword, role_id]);

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
        db.query('SELECT name, user_number, username, email FROM user', (err, result) => {

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

    let id = req.params.id;

    const {password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!id || !password) {
        return res.status(400).send({ error: user, message: 'Please provide password' });
    }

    try {
        db.query('UPDATE user SET name = ?, user_number = ?, username = ?, email, =? password = ?, role_id = ? WHERE id = ?', [hashedPassword, id], (err, result, fields) => {
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

    let id = req.params.id;

    if (!id) {
        return res.status(400).send({ error: true, message: 'Please provide id' });
    }

    try {
        db.query('DELETE FROM user WHERE id = ?', id, (err, result, fields) => {
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


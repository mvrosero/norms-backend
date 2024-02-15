const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/
const bcrypt = require('bcrypt'); /*password encryption*/
const config =require('../app/middleware/config')
const secretKey = config.secretKey;
const router = express.Router();


/*post: register*/
router.post('/categoryReg',  async (req, res) => {

    try {
        const {category_name} = req.body;
        

        const insertUsersQuery = 'INSERT INTO category (category_name) VALUES (?)';
        await db.promise().execute(insertUsersQuery, [category_name]);

        res.status(201).json({ message: 'Category registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: user*/
router.get('/category/:id', authenticateToken, (req, res) => {

    let category_id = req.params.id;

    if (!category_id) {
        return res.status(400).send({ error: true, message: 'Please provide student_id' });
    }

    try {
        db.query('SELECT category_name FROM student WHERE category_id = ?', category_id, (err, result) => {
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
router.put('/category/:id', authenticateToken, async (req, res) => {

    let category_id = req.params.id;

    const {category_name} = req.body;
    

    if (!category_id || !category_name) {
        return res.status(400).send({ error: user, message: 'Please provide name and password' });
    }

    try {
        db.query('UPDATE student SET category_name = ? WHERE category_id = ?', [category_name, category_id], (err, result, fields) => {
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
router.delete('/category/:id', authenticateToken, (req, res) => {

    let category_id = req.params.id;

    if (!category_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM category WHERE category_id = ?', category_id, (err, result, fields) => {
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
router.get('/category', authenticateToken, (req, res) => {

    try {
        db.query('SELECT category_id,category_name FROM category', (err, result) => {

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


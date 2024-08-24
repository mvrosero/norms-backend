const express = require('express');
const db = require('../app/configuration/database');
const config = require('../app/middleware/config');
const router = express.Router();


/*get all - users*/
router.get('/users', (req, res) => {
    try {
        db.query(`SELECT * FROM user`, (err, result) => {
            if (err) {
                console.error('Error fetching users:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get user counts for each department*/
router.get('/user-counts', (req, res) => {
    try {
        db.query(`
            SELECT d.department_name, COUNT(u.user_id) AS user_count 
            FROM department d 
            LEFT JOIN user u ON d.department_id = u.department_id 
            GROUP BY d.department_id
        `, (err, result) => {
            if (err) {
                console.error('Error fetching user counts:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                const userCounts = {};
                result.forEach(row => {
                    userCounts[row.department_name] = row.user_count;
                });
                res.status(200).json(userCounts);
            }
        });
    } catch (error) {
        console.error('Error loading user counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get users by department*/
router.get('/admin-usermanagement/:department_code', (req, res) => {
    try {
        const department_code = req.params.department_code;

        db.query(`
            SELECT u.*, d.department_name FROM user u
            INNER JOIN department d ON u.department_id = d.department_id
            WHERE d.department_code = ?
        `, [department_code], (err, result) => {
            if (err) {
                console.error('Error fetching users by department:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                console.log('Fetched users by department:', result); // Log the fetched users
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users by department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;

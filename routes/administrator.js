const express = require('express');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router()


/*post: admin login*/
router.post('/admin-login', async (req, res) => {
    try {
        const { employee_idnumber, password } = req.body;

        const getAdminQuery = 'SELECT * FROM user WHERE employee_idnumber = ?';
        const [rows] = await db.promise().execute(getAdminQuery, [employee_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid employee number' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        /*retrieve the role_id from the user data*/
        const { role_id } = user;

        /*generate JWT token*/
        const token = jwt.sign({ userId: user.employee_idnumber, employee_idnumber: user.employee_idnumber }, secretKey, { expiresIn: '1h' });

        /*return token and role_id in response*/
        res.status(200).json({ token, role_id });
    } catch (error) {
        console.error('Error logging in administrator:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
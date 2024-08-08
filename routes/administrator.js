const express = require('express');
const db = require('../app/configuration/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../app/middleware/config');
const secretKey = config.secretKey;
const router = express.Router();


/*post: admin login*/
router.post('/admin-login', async (req, res) => {
    try {
        const { employee_idnumber, password } = req.body;

        // Sanitize input and prevent SQL injection
        const getUserQuery = 'SELECT * FROM user WHERE employee_idnumber = ?';
        const [rows] = await db.promise().execute(getUserQuery, [employee_idnumber]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid employee number or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid employee number or password' });
        }

        // Generate JWT token with minimal payload
        const tokenPayload = {
            userId: user.employee_idnumber,
            role_id: user.role_id
        };
        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '1h' });

        // Return token and role_id in response
        res.status(200).json({ token, role_id: user.role_id });
    } catch (error) {
        console.error('Error logging in employee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/
const bcrypt = require('bcrypt'); /*password encryption*/
const config = require('./config');
const secretKey = config.secretKey;

/*authentication*/
function authenticateToken(req, res, next) {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, secretKey, (err, user) => {

        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.user = user;
        next();
    });
}

/*export*/
module.exports = { authenticateToken };
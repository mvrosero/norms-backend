const mysql = require('mysql2'); /*use mysql2 package*/
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/

const db = mysql.createPool({
    host: 'sql6.freemysqlhosting.net',
    user: 'sql6683266',
    password: 'D3WIxRLPi7',
    database: 'sql6683266',
});


db.getConnection((err) => {

    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

/*export*/
module.exports = db;
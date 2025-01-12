const mysql = require('mysql2'); 
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'NORMSLOCAL',
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
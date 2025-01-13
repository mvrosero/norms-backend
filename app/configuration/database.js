const mysql = require('mysql2'); 
const jwt = require('jsonwebtoken'); /*authentication, login is required to view*/

const db = mysql.createPool({
    host: 'mysql-186603-0.cloudclusters.net',
    port: 10121, 
    user: 'admin',
    password: 'eoeiBuZJ',
    database: 'norms',
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0 
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
const mysql = require('mysql2/promise');

// Create a connection pool
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


async function testConnection() {
    try {
        
        const connection = await db.getConnection();
        console.log('Connected to MySQL!');
        connection.release(); 
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
    }
}

// Call the test connection function
testConnection();

module.exports = db;
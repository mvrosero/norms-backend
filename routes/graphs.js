const express = require('express');
const fs = require('fs');
const db = require('../app/configuration/database'); // Use the database connection here
const bcrypt = require('bcrypt');
const csv = require('csv-parser');
const jwt = require('jsonwebtoken');
const router = express.Router();
const multer = require('multer');


// top offenses by department
router.get('/api/top-offenses', (req, res) => {
    const query = `
      SELECT 
        d.department_name, 
        o.offense_name, 
        COUNT(v.record_id) AS offense_count
      FROM violation_record v
      JOIN user u ON u.student_idnumber = u.student_idnumber
      JOIN offense o ON v.offense_id = o.offense_id
      JOIN department d ON u.department_id = d.department_id
      GROUP BY d.department_name, o.offense_name
      ORDER BY offense_count DESC
    `;
    
    // Use db.query instead of connection.query
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data from database:', err);
        return res.status(500).json({ message: 'Database error' });
      }
  
      res.json(results);
    });
});




// Get violation records count per department
router.get('/api/top-violationrecords', (req, res) => {
    
    // SQL query to get violation records count per department
    const query = `
      SELECT 
        d.department_name, 
        COUNT(v.record_id) AS violation_count
      FROM 
        violation_record v
      JOIN 
        user u ON u.user_id = u.user_id
      JOIN 
        department d ON u.department_id = d.department_id
      GROUP BY 
        d.department_name
      ORDER BY 
        violation_count DESC;
    `;
  
    // Execute the query
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching violation records count:', err);
        return res.status(500).send('Server error');
      }
  
      // Send the results as JSON response
      res.json(results);
    });
});




// Route to fetch top uniform defiance by department
router.get('/api/top-uniformdefiances', async (req, res) => {
    try {
      const query = `
        SELECT 
          d.department_name, 
          COUNT(*) AS uniform_defiance_count
        FROM uniform_defiance u
        JOIN user s ON u.student_idnumber = s.student_idnumber
        JOIN department d ON s.department_id = d.department_id
        GROUP BY d.department_name
        ORDER BY uniform_defiance_count DESC;
      `;
      
      // Execute the query for MySQL (no rows attribute)
      db.query(query, (err, results) => {
        if (err) {
          console.error('Error fetching violation records count:', err);
          return res.status(500).send('Server error');
        }
      
        // Log the query results for debugging
        console.log('Query Results:', results); // Directly check the results for MySQL
  
        if (results.length > 0) {
          res.json(results); // For MySQL, results is directly the array of rows
        } else {
          res.status(404).json({ message: 'No data found' });
        }
      });
    } catch (err) {
      console.error('Error in route handler:', err);
      res.status(500).send('Server error');
    }
  });
  



// Get top violation natures
router.get('/api/top-violationnatures', async (req, res) => {
    try {
       const query = `
        SELECT vn.nature_name, COUNT(ud.slip_id) AS violation_count
        FROM uniform_defiance ud
        JOIN violation_nature vn ON ud.nature_id = vn.nature_id
        GROUP BY vn.nature_name
        ORDER BY violation_count DESC;
      `;

    // Execute the query for MySQL (no rows attribute)
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching uniform defainces count:', err);
            return res.status(500).send('Server error');
        }
        
        // Log the query results for debugging
        console.log('Query Results:', results); // Directly check the results for MySQL
    
        if (results.length > 0) {
            res.json(results); // For MySQL, results is directly the array of rows
        } else {
            res.status(404).json({ message: 'No data found' });
        }
        });
    } catch (err) {
        console.error('Error in route handler:', err);
        res.status(500).send('Server error');
    }
    });
  


  


module.exports = router;

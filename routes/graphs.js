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
    // Extract query parameters for filtering
    const { start_date, end_date } = req.query;
  
    // Base query
    let query = `
      SELECT 
        d.department_name, 
        o.offense_name, 
        COUNT(v.record_id) AS offense_count
      FROM violation_record v
      JOIN user u ON u.student_idnumber = u.student_idnumber
      JOIN offense o ON v.offense_id = o.offense_id
      JOIN department d ON u.department_id = d.department_id
    `;
  
    // Initialize query conditions array
    const conditions = [];
  
    // Add date filter conditions if provided
    if (start_date) {
      conditions.push(`v.created_at >= ?`);
    }
    if (end_date) {
      conditions.push(`v.created_at <= ?`);
    }
  
    // Append conditions to the query if any exist
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  
    // Grouping and ordering
    query += `
      GROUP BY d.department_name, o.offense_name
      ORDER BY offense_count DESC
    `;
  
    // Array to store query parameter values
    const queryParams = [];
    if (start_date) queryParams.push(start_date);
    if (end_date) queryParams.push(end_date);
  
    // Execute the query
    db.query(query, queryParams, (err, results) => {
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
  



// Get top categories based on total violation records
router.get('/api/top-categories', async (req, res) => {
    try {
        // Query to get the top categories by total violation records
        const query = `
            SELECT c.category_name, COUNT(vr.record_id) AS violation_count
            FROM violation_record vr
            JOIN category c ON vr.category_id = c.category_id
            GROUP BY c.category_name
            ORDER BY violation_count DESC;
        `;

        // Execute the query
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching violation records count:', err);
                return res.status(500).send('Server error');
            }

            // Check if there are any results
            if (results.length > 0) {
                // Send the results as a JSON response
                res.json(results);
            } else {
                res.status(404).json({ message: 'No data found' });
            }
        });
    } catch (err) {
        console.error('Error in route handler:', err);
        res.status(500).send('Server error');
    }
});
  



// Get top subcategories of violation records
router.get('/api/top-subcategories', async (req, res) => {
    try {
        const query = `
            SELECT 
                sc.subcategory_name, 
                COUNT(vr.record_id) AS violation_count
            FROM 
                violation_record vr
            JOIN 
                subcategory sc ON sc.subcategory_id = sc.subcategory_id
            GROUP BY 
                sc.subcategory_name
            ORDER BY 
                violation_count DESC;
        `;

        // Execute the query
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching top subcategories:', err);
                return res.status(500).send('Server error');
            }

            if (results.length > 0) {
                res.json(results);
            } else {
                res.status(404).json({ message: 'No data found' });
            }
        });
    } catch (err) {
        console.error('Error in route handler:', err);
        res.status(500).send('Server error');
    }
});





// Route for getting violation record totals by week (days of the week), month, and year
router.get('/violation-records/totals', (req, res) => {
    // Query to get weekly totals (grouped by day of the week)
    const weeklyQuery = `
      SELECT 
        DAYNAME(created_at) AS day_of_week, 
        COUNT(*) AS total
      FROM violation_record
      WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
      GROUP BY DAYOFWEEK(created_at)
      ORDER BY FIELD(DAYOFWEEK(created_at), 1, 2, 3, 4, 5, 6, 7); -- This ensures the days are in correct order (Mon, Tue, etc.)
    `;
  
    // Query to get monthly totals (grouped by month)
    const monthlyQuery = `
      SELECT 
        MONTHNAME(created_at) AS month, 
        COUNT(*) AS total
      FROM violation_record
      WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at);
    `;
  
    // Query to get yearly totals (grouped by year)
    const yearlyQuery = `
      SELECT 
        YEAR(created_at) AS year, 
        COUNT(*) AS total
      FROM violation_record
      GROUP BY YEAR(created_at)
      ORDER BY YEAR(created_at);
    `;
  
    // Run all queries in parallel
    Promise.all([
      new Promise((resolve, reject) => {
        db.query(weeklyQuery, (err, weeklyResults) => {
          if (err) reject(err);
          else resolve(weeklyResults);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(monthlyQuery, (err, monthlyResults) => {
          if (err) reject(err);
          else resolve(monthlyResults);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(yearlyQuery, (err, yearlyResults) => {
          if (err) reject(err);
          else resolve(yearlyResults);
        });
      })
    ])
      .then(([weeklyData, monthlyData, yearlyData]) => {
        // Format the results into a structured response
        res.json({
          weekly: weeklyData,
          monthly: monthlyData,
          yearly: yearlyData,
        });
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data' });
      });
  });




// Create the route to fetch violation record counts by year level
router.get('/violation-records/year-level', (req, res) => {
    const query = `
      SELECT 
        u.year_level, 
        COUNT(vu.user_id) AS user_count
      FROM 
        violation_record vr
      JOIN 
        violation_user vu ON vr.record_id = vu.record_id
      JOIN 
        user u ON vu.user_id = u.user_id
      GROUP BY 
        u.year_level
      ORDER BY 
        user_count DESC;
    `;
    
    // Execute the query
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Database query error' });
      } else {
        res.json(results);
      }
    });
  });


// Endpoint to get uniform defiance totals by status
router.get('/uniform-defiances/status', (req, res) => {
    const query = `
      SELECT 
        status, 
        COUNT(slip_id) AS total
      FROM 
        uniform_defiance
      GROUP BY 
        status
      ORDER BY 
        total DESC;
    `;
    
    // Execute the query
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching uniform defiance data:', err);
        res.status(500).json({ error: 'Database query error' });
      } else {
        res.json(results);
      }
    });
  });
  




module.exports = router;

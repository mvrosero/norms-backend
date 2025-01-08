const express = require('express');
const fs = require('fs');
const db = require('../app/configuration/database'); 
const bcrypt = require('bcrypt');
const csv = require('csv-parser');
const jwt = require('jsonwebtoken');
const router = express.Router();
const multer = require('multer');


// top offenses by department
router.get('/api/top-offenses', (req, res) => {
    const { start_date, end_date } = req.query;
  
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
    const { start_date, end_date } = req.query;

    let query = `
        SELECT 
        d.department_name, 
        COUNT(v.record_id) AS violation_count
        FROM 
            violation_record v
        JOIN 
            user u ON u.user_id = u.user_id
        JOIN 
            department d ON u.department_id = d.department_id
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("v.created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("v.created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            d.department_name
        ORDER BY 
            violation_count DESC;
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching violation records count:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});





// Route to fetch top uniform defiance by department
router.get('/api/top-uniformdefiances', (req, res) => {
    const { start_date, end_date } = req.query;

    let query = `
        SELECT 
        d.department_code, 
        COUNT(*) AS uniform_defiance_count
        FROM uniform_defiance u
        JOIN user s ON u.student_idnumber = s.student_idnumber
        JOIN department d ON s.department_id = d.department_id
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("u.created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("u.created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            d.department_name
        ORDER BY 
            uniform_defiance_count DESC;
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching uniform defiance count:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});
  



// Get top violation natures
router.get('/api/top-violationnatures', (req, res) => {
    const { start_date, end_date } = req.query;

    let query = `
        SELECT vn.nature_name, COUNT(ud.slip_id) AS violation_count
        FROM uniform_defiance ud
        JOIN violation_nature vn ON ud.nature_id = vn.nature_id
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("ud.created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("ud.created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            vn.nature_name
        ORDER BY 
            violation_count DESC;
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching violation natures:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});
  



// Get top categories based on total violation records
router.get('/api/top-categories', (req, res) => {
    const { start_date, end_date } = req.query;

    let query = `
        SELECT c.category_name, COUNT(vr.record_id) AS violation_count
        FROM violation_record vr
        JOIN category c ON vr.category_id = c.category_id
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("vr.created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("vr.created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            c.category_name
        ORDER BY 
            violation_count DESC;
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching top categories:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});

  



// Get top subcategories of violation records
router.get('/api/top-subcategories', (req, res) => {
    const { start_date, end_date } = req.query;

    let query = `
        SELECT 
            sc.subcategory_name, 
            COUNT(vr.record_id) AS violation_count
        FROM 
            violation_record vr
        JOIN 
            offense o ON o.offense_id = vr.offense_id
        JOIN 
            subcategory sc ON sc.subcategory_id = o.subcategory_id
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("vr.created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("vr.created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            sc.subcategory_name
        ORDER BY 
            violation_count DESC;
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching top subcategories:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);
    });
});





// Endpoint to get uniform defiance totals by status
router.get('/uniform-defiances/status', (req, res) => {
    const { start_date, end_date } = req.query;

    let query = `
        SELECT 
            status, 
            COUNT(slip_id) AS total
        FROM 
            uniform_defiance
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            status
        ORDER BY 
            total DESC;
    `;

    // Execute the query
    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Error fetching uniform defiance data:', err);
        res.status(500).json({ error: 'Database query error' });
      } else {
        res.json(results);
      }
    });
});

  


// Create the route to fetch violation record counts by year level
router.get('/violation-records/year-level', (req, res) => {
    const { start_date, end_date } = req.query;

    let query = `
        SELECT 
            u.year_level, 
            COUNT(vu.user_id) AS user_count
        FROM 
            violation_record vr
        JOIN 
            violation_user vu ON vr.record_id = vu.record_id
        JOIN 
            user u ON vu.user_id = u.user_id
    `;

    const conditions = [];
    const queryParams = [];

    if (start_date) {
        conditions.push("vr.created_at >= ?");
        queryParams.push(start_date);
    }

    if (end_date) {
        conditions.push("vr.created_at <= ?");
        queryParams.push(end_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY 
            u.year_level
        ORDER BY 
            user_count DESC;
    `;

    // Execute the query
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).json({ error: 'Database query error' });
        } else {
            res.json(results);
        }
    });
});










// Route for getting violation record totals by week (days of the week), month, and year
router.get('/violation-records/totals', (req, res) => {
    const { start_date, end_date } = req.query;

    // Base query condition for date filtering
    let dateCondition = '';
    const queryParams = [];

    if (start_date) {
        dateCondition += ' AND created_at >= ?';
        queryParams.push(start_date);
    }

    if (end_date) {
        dateCondition += ' AND created_at <= ?';
        queryParams.push(end_date);
    }

    // Query to get daily totals (grouped by day of the week)
    const dailyQuery = `
      SELECT 
        DAYNAME(created_at) AS day_of_week, 
        COUNT(*) AS total
      FROM violation_record
      WHERE 1=1 ${dateCondition}  -- Make sure to start with "WHERE 1=1" to allow AND conditions
      GROUP BY DAYOFWEEK(created_at)
      ORDER BY FIELD(DAYOFWEEK(created_at), 1, 2, 3, 4, 5, 6, 7); -- This ensures the days are in correct order (Mon, Tue, etc.)
    `;
  
    // Query to get monthly totals (grouped by month)
    const monthlyQuery = `
      SELECT 
        MONTHNAME(created_at) AS month, 
        COUNT(*) AS total
      FROM violation_record
      WHERE 1=1 ${dateCondition}  -- Make sure to start with "WHERE 1=1" to allow AND conditions
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at);
    `;
  
    // Query to get yearly totals (grouped by year)
    const yearlyQuery = `
      SELECT 
        YEAR(created_at) AS year, 
        COUNT(*) AS total
      FROM violation_record
      WHERE 1=1 ${dateCondition}  -- Make sure to start with "WHERE 1=1" to allow AND conditions
      GROUP BY YEAR(created_at)
      ORDER BY YEAR(created_at);
    `;
  
    // Run all queries in parallel
    Promise.all([
      new Promise((resolve, reject) => {
        db.query(dailyQuery, queryParams, (err, dailyResults) => {
          if (err) reject(err);
          else resolve(dailyResults);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(monthlyQuery, queryParams, (err, monthlyResults) => {
          if (err) reject(err);
          else resolve(monthlyResults);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(yearlyQuery, queryParams, (err, yearlyResults) => {
          if (err) reject(err);
          else resolve(yearlyResults);
        });
      })
    ])
      .then(([dailyData, monthlyData, yearlyData]) => {
        // Format the results into a structured response
        res.json({
          daily: dailyData,
          monthly: monthlyData,
          yearly: yearlyData,
        });
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data' });
      });
});






// Route for getting uniform defiance records totals by week (days of the week), month, and year
router.get('/uniform-defiances/totals', (req, res) => {
    const { start_date, end_date } = req.query;

    // Base query condition for date filtering
    let dateCondition = '';
    const queryParams = [];

    if (start_date) {
        // Format the start date to 'YYYY-MM-DD' to ensure it matches the format of created_at
        dateCondition += ' AND DATE(created_at) >= ?';
        queryParams.push(start_date);  // assuming 'start_date' is in 'YYYY-MM-DD'
    }

    if (end_date) {
        // Format the end date to 'YYYY-MM-DD' to ensure it matches the format of created_at
        dateCondition += ' AND DATE(created_at) <= ?';
        queryParams.push(end_date);  // assuming 'end_date' is in 'YYYY-MM-DD'
    }

    // Query to get daily totals (grouped by day of the week)
    const dailyQuery = `
      SELECT 
        DAYNAME(created_at) AS day_of_week, 
        COUNT(*) AS total
      FROM uniform_defiance
      WHERE 1=1 ${dateCondition}
      GROUP BY DAYOFWEEK(created_at)
      ORDER BY FIELD(DAYOFWEEK(created_at), 1, 2, 3, 4, 5, 6, 7); -- Ensures days are ordered from Mon to Sun
    `;
  
    // Query to get monthly totals (grouped by month)
    const monthlyQuery = `
      SELECT 
        MONTHNAME(created_at) AS month, 
        COUNT(*) AS total
      FROM uniform_defiance
      WHERE 1=1 ${dateCondition}
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at);
    `;
  
    // Query to get yearly totals (grouped by year)
    const yearlyQuery = `
      SELECT 
        YEAR(created_at) AS year, 
        COUNT(*) AS total
      FROM uniform_defiance
      WHERE 1=1 ${dateCondition}
      GROUP BY YEAR(created_at)
      ORDER BY YEAR(created_at);
    `;
  
    // Run all queries in parallel
    Promise.all([
      new Promise((resolve, reject) => {
        db.query(dailyQuery, queryParams, (err, dailyResults) => {
          if (err) reject(err);
          else resolve(dailyResults);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(monthlyQuery, queryParams, (err, monthlyResults) => {
          if (err) reject(err);
          else resolve(monthlyResults);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(yearlyQuery, queryParams, (err, yearlyResults) => {
          if (err) reject(err);
          else resolve(yearlyResults);
        });
      })
    ])
      .then(([dailyData, monthlyData, yearlyData]) => {
        // Format the results into a structured response
        res.json({
          daily: dailyData,
          monthly: monthlyData,
          yearly: yearlyData,
        });
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data' });
      });
});





module.exports = router;

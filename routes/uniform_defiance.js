const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const bcrypt = require('bcrypt'); 
const router = express.Router();


router.post('/registerUnifDefiance', async (req, res) => {
    try {
        const { student_idnumber, violation_nature, photo_video_filename, status, submitted_by } = req.body;
        
        // SQL query to insert a new record into the uniform_defiance table
        const insertQuery = 'INSERT INTO uniform_defiance (student_idnumber, violation_nature, photo_video_filename, status, submitted_by) VALUES (?, ?, ?, ?, ?)';
        
        // Execute the query
        await db.execute(insertQuery, [student_idnumber, violation_nature, photo_video_filename, status, submitted_by]);

        // Send a success response
        res.status(201).json({ message: 'Uniform defiance record registered successfully' });
    } catch (error) {
        console.error('Error registering uniform defiance record:', error);
        // Send an error response
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: 1 sanction*/
router.get('/sanction/:id',  (req, res) => {

    let sanction_id = req.params.id;

    if (!sanction_id) {
        return res.status(400).send({ error: true, message: 'Please provide sanction_id' });
    }

    try {
        db.query('SELECT sanction_id, sanction_code, sanction_name, description, offense_id FROM sanction WHERE sanction_id = ?', sanction_id, (err, result) => {
            if (err) {
                console.error('Error fetching sanction:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: sanctions*/
router.get('/uniformDefiances', (req, res) => {

    try {
        db.query('SELECT * FROM uniform_defiance', (err, result) => {

            if (err) {
                console.error('Error fetching sanctions:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanctions:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: sanction*/
router.put('/sanction/:id', async (req, res) => {

    let sanction_id = req.params.id;

    const {sanction_code, sanction_name, description} = req.body;

    if (!sanction_id || !sanction_code || !sanction_name || !description) {
        return res.status(400).send({ error: user, message: 'Please provide sanction code, sanction name and description' });
    }

    try {
        db.query('UPDATE sanction SET sanction_code = ?, sanction_name = ?, description = ? WHERE sanction_id = ?', [sanction_code, sanction_name, description, sanction_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating sanction:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: sanction*/
router.delete('/sanction/:id', (req, res) => {

    let sanction_id = req.params.id;

    if (!sanction_id) {
        return res.status(400).send({ error: true, message: 'Please provide sanction_id' });
    }

    try {
        db.query('DELETE FROM sanction WHERE sanction_id = ?', sanction_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting sanction:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading sanction:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});



/*export*/
module.exports = router;
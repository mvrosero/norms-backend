const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { parse } = require('json2csv');
const os = require('os');



router.get('/department-program-history/:user_id', (req, res) => {
    const { user_id } = req.params;

    const query = `
        SELECT 
            h.history_id, 
            h.user_id, 
            h.old_department_id, 
            old_dep.department_name AS old_department_name,
            h.new_department_id, 
            new_dep.department_name AS new_department_name,
            h.old_program_id, 
            old_prog.program_name AS old_program_name,
            h.new_program_id, 
            new_prog.program_name AS new_program_name,
            h.changed_at, 
            h.updated_by, 
            u.first_name AS updated_by_name
        FROM 
            department_program_history h
        LEFT JOIN department old_dep ON h.old_department_id = old_dep.department_id
        LEFT JOIN department new_dep ON h.new_department_id = new_dep.department_id
        LEFT JOIN program old_prog ON h.old_program_id = old_prog.program_id
        LEFT JOIN program new_prog ON h.new_program_id = new_prog.program_id
        LEFT JOIN user u ON h.updated_by = u.user_id
        WHERE h.user_id = ?
    `;

    db.query(query, [user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch history' });
        }
        res.json(results);
    });
});



/*get: histories*/
router.get('/histories', (req, res) => {
    try {
        const query = `
            SELECT 
                user_history.history_id, 
                CONCAT(user.first_name, ' ', user.last_name, ' ', user.suffix) AS user,
                user_history.user_id, 
                user_history.old_department_id, 
                old_department.department_name AS old_department_name, 
                user_history.new_department_id, 
                new_department.department_name AS new_department_name, 
                user_history.old_program_id, 
                old_program.program_name AS old_program_name, 
                user_history.new_program_id, 
                new_program.program_name AS new_program_name, 
                user_history.old_year_level, 
                user_history.new_year_level, 
                user_history.old_status, 
                user_history.new_status, 
                user_history.old_batch, 
                user_history.new_batch, 
                user_history.old_role_id, 
                old_role.role_name AS old_role_name, 
                user_history.new_role_id, 
                new_role.role_name AS new_role_name, 
                user_history.changed_at, 
                user_history.updated_by, 
                CONCAT(updated_by.first_name, ' ', updated_by.last_name, ' ', updated_by.suffix) AS updated_by
            FROM 
                user_history
            LEFT JOIN department AS old_department ON user_history.old_department_id = old_department.department_id
            LEFT JOIN department AS new_department ON user_history.new_department_id = new_department.department_id
            LEFT JOIN program AS old_program ON user_history.old_program_id = old_program.program_id
            LEFT JOIN program AS new_program ON user_history.new_program_id = new_program.program_id
            LEFT JOIN role AS old_role ON user_history.old_role_id = old_role.role_id
            LEFT JOIN role AS new_role ON user_history.new_role_id = new_role.role_id
            LEFT JOIN user ON user_history.user_id = user.user_id
            LEFT JOIN user AS updated_by ON user_history.updated_by = updated_by.user_id
        `;

        db.query(query, (err, result) => {
            if (err) {
                console.error('Error fetching histories:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading histories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});








// Get: histories for a specific user
router.get('/histories/:user_id', (req, res) => {
    const { user_id } = req.params;
    try {
        const query = `
            SELECT 
                user_history.history_id, 
                CONCAT(user.first_name, ' ', user.last_name, ' ', user.suffix) AS user,
                user_history.user_id, 
                user_history.old_department_id, 
                old_department.department_name AS old_department_name, 
                user_history.new_department_id, 
                new_department.department_name AS new_department_name, 
                user_history.old_program_id, 
                old_program.program_name AS old_program_name, 
                user_history.new_program_id, 
                new_program.program_name AS new_program_name, 
                user_history.old_year_level, 
                user_history.new_year_level, 
                user_history.old_status, 
                user_history.new_status, 
                user_history.old_batch, 
                user_history.new_batch, 
                user_history.old_role_id, 
                old_role.role_name AS old_role_name, 
                user_history.new_role_id, 
                new_role.role_name AS new_role_name, 
                user_history.changed_at, 
                user_history.updated_by, 
                CONCAT(updated_by.first_name, ' ', updated_by.last_name, ' ', updated_by.suffix) AS updated_by
            FROM 
                user_history
            LEFT JOIN department AS old_department ON user_history.old_department_id = old_department.department_id
            LEFT JOIN department AS new_department ON user_history.new_department_id = new_department.department_id
            LEFT JOIN program AS old_program ON user_history.old_program_id = old_program.program_id
            LEFT JOIN program AS new_program ON user_history.new_program_id = new_program.program_id
            LEFT JOIN role AS old_role ON user_history.old_role_id = old_role.role_id
            LEFT JOIN role AS new_role ON user_history.new_role_id = new_role.role_id
            LEFT JOIN user ON user_history.user_id = user.user_id
            LEFT JOIN user AS updated_by ON user_history.updated_by = updated_by.user_id
            WHERE user_history.user_id = ?
            ORDER BY user_history.changed_at DESC
        `;
        
        db.query(query, [user_id], (err, result) => {
            if (err) {
                console.error('Error fetching histories:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading histories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/* Get account history for any user (student or employee) */
router.get('/account-history/:user_id', (req, res) => {
    let user_id = req.params.user_id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query(
            `SELECT 
                u.user_id,
                u.student_idnumber,
                u.employee_idnumber,
                u.created_at,
                u.last_updated,
                CONCAT(c.first_name, ' ', c.middle_name, ' ', c.last_name, ' ', c.suffix) AS created_by
             FROM user u
             LEFT JOIN user c ON u.created_by = c.user_id
             WHERE u.user_id = ?`,
            user_id,
            (err, result) => {
                if (err) {
                    console.error('Error fetching user:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






/* GET: Export all user histories to CSV */
router.get('/histories/export', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                user_history.history_id, 
                DATE_FORMAT(user_history.changed_at, '%Y-%m-%d, %l:%i:%s %p') AS changed_at, 
                CONCAT(user.first_name, ' ', user.last_name, ' ', user.suffix) AS user,
                user_history.user_id, 
                IFNULL(old_department.department_name, 'Unknown') AS old_department_name, 
                IFNULL(new_department.department_name, 'Unknown') AS new_department_name, 
                IFNULL(old_program.program_name, 'Unknown') AS old_program_name, 
                IFNULL(new_program.program_name, 'Unknown') AS new_program_name, 
                user_history.old_year_level, 
                user_history.new_year_level, 
                user_history.old_status, 
                user_history.new_status, 
                user_history.old_batch, 
                user_history.new_batch, 
                IFNULL(old_role.role_name, 'Unknown') AS old_role_name, 
                IFNULL(new_role.role_name, 'Unknown') AS new_role_name, 
                user_history.updated_by, 
                CONCAT(updated_by.first_name, ' ', updated_by.last_name, ' ', updated_by.suffix) AS updated_by
            FROM 
                user_history
            LEFT JOIN department AS old_department ON user_history.old_department_id = old_department.department_id
            LEFT JOIN department AS new_department ON user_history.new_department_id = new_department.department_id
            LEFT JOIN program AS old_program ON user_history.old_program_id = old_program.program_id
            LEFT JOIN program AS new_program ON user_history.new_program_id = new_program.program_id
            LEFT JOIN role AS old_role ON user_history.old_role_id = old_role.role_id
            LEFT JOIN role AS new_role ON user_history.new_role_id = new_role.role_id
            LEFT JOIN user ON user_history.user_id = user.user_id
            LEFT JOIN user AS updated_by ON user_history.updated_by = updated_by.user_id;
        `);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // Define CSV fields
        const fields = [
            { label: 'History ID', value: 'history_id' },
            { label: 'Changed At', value: 'changed_at' },
            { label: 'User', value: 'user' },
            { label: 'Old Department', value: 'old_department_name' },
            { label: 'New Department', value: 'new_department_name' },
            { label: 'Old Program', value: 'old_program_name' },
            { label: 'New Program', value: 'new_program_name' },
            { label: 'Old Year Level', value: 'old_year_level' },
            { label: 'New Year Level', value: 'new_year_level' },
            { label: 'Old Status', value: 'old_status' },
            { label: 'New Status', value: 'new_status' },
            { label: 'Old Batch', value: 'old_batch' },
            { label: 'New Batch', value: 'new_batch' },
            { label: 'Old Role', value: 'old_role_name' },
            { label: 'New Role', value: 'new_role_name' },
            { label: 'Updated By', value: 'updated_by' },
        ];

        // Convert rows to CSV
        const csv = parse(rows, { fields });

        // Generate a temporary file path
        const filePath = path.join(os.tmpdir(), `user_histories.csv`);

        // Write CSV to a temporary file
        fs.writeFileSync(filePath, csv);

        // Send the file to the client
        res.download(filePath, `user_histories.csv`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                return res.status(500).json({ error: 'Error exporting CSV file' });
            }

            // Delete the temporary file after sending it
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temporary file:', unlinkErr);
                }
            });
        });
    } catch (error) {
        console.error('Error exporting user histories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





module.exports = router;
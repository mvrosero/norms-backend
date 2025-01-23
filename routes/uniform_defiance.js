const express = require('express');
const db = require('../app/configuration/database'); // Ensure this uses mysql2/promise
const router = express.Router();
const multer = require('multer');
const path = require('path');
const moment = require('moment-timezone');
const { google } = require('googleapis');
const { Readable } = require('stream');

// Google Drive Service Account Config
const googleServiceAccount = {
    type: "service_account",
    project_id: "ccsrepository-444308",
    private_key_id: "ad95bb0e9b7b40f9b43b2dd9dc33cc3eb925bce9",
    private_key: `-----BEGIN PRIVATE KEY-----
  MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVgISVob0EV2BE
  T0NXxB6R/TCLwgZzGG3ivK7uzoIJoGQPKLSkABLu0/3GNdwMx4ZEOOsEr+EMyUhp
  8LMj9iik9mOyb+R4kEDAEQlQZ0+HvK/Yabm67umX/6dGRv7JCC+yNRP28XQ9GuOU
  SmmhEqnmmga2lWp+mPBl6W6nX7gOAIj6xtugYU1IRAIZ0Yxs8eVTp5y4mh7sWqko
  xXUmkSCcLY6Wm1zlR8yHTExSL/QPmnWUNyOqyIg6bvRq3nAwYdGLUZRoTa1TWnQO
  ewqa1GM9aouAI0d+RsCw//UEG2V4v+kxkso21dB9YmmKbSnyRairNr2IIeyNrPWL
  NZShI6UHAgMBAAECggEAEXK2CY2ujYiS5yvV7fn3ogIS/q2/hC/Zzx73ahaTXWdv
  tfNwK9T1UL8fbRyHgr3aaBnn6KBAOdP7TuxRksQYinHrMBdH3ZIaA8UaQalnwC9e
  uZN0wjIQAhC6rwCFuV0pzk90woiO2AcqB4ghsMmxlXulLJryZi0073ppXu4jwKg+
  H9vdUlzNYUUHJVvHWIiv+ITN43Xx0EYRIe6n5e/ZeZ4hAFqtmqzb+rSOXgmgqIMw
  oGBW/OZbvlkJsGWHyGZeZSLL+iJXNDJDk8YFv3arpbInBk3OYQk9UPYY82l3f1au
  DlWtL389kSgyJ/Gfvr30qDhs1WEN5Te2//HZu5l7YQKBgQDrH5WbxHJzk/Hc1jpK
  JQmUlB2t26Cv+/+fOzAz5KHgFX2RLjXIHl5iufib3HM+nbUOe66As7U0r7/Va0Nn
  1qppy05HL4ZzA36bsQ8Fw5prdVQjjU+r4c1wEaY8O13ckzL6qKZIOGNEuBF0vRoq
  zGxN8iYsZ3MW6JX7E3zK/FvpYQKBgQDodXl5CJMw/67n6o/DlmnoxMdUNKXvyoxs
  Udz/daKX682tGBLa06u1ZCCMCJYgahQwqRv15apTscOvy5sBQraz8H/UGc3v0AZ0
  Dz5zyOaLw9pHv9C7MuDRhzd708Q3Z/Gh4YK6+syae6gposLh1wLqIbRUOTuCZGA6
  RSFZ4qYfZwKBgQCczEZgR6Sv0RS1WiQrOAHolNIqFFJXqi0xSi5+HNWa85n2jKOP
  HjmBi1Xw0xYDxvZsfyzDZZTNWvsKX2rnP7ALt2ovbNEzuDvhpjVHecdsLCV9RArC
  rGXte8epWUniBEQ2BuxFM114AWyatlVR/1umq3qrmB2XRGposvlBAQRmYQKBgQCS
  lwIzQSURESvLNC/Ut1WyY+UPROQfgytqY3Vp41TVWO4q6bN6K2Fs0ed0ZzXE2yBA
  T2RCfMIcZU1x3oOxF9D/R/pUVrF3OUfYiIRpn5dDLA7KkDug0UTU3OAwRirGhdXq
  r7sxDldYVAKHvwwGPwCnhPmi4zST1ZiZJl8Rv8vioQKBgQDOiy1z7ezJzgJSNoKz
  ee5zOWdsSRkxHBKRtc1vbBIxEg+z+838+TxXf2EJhkOA11OQptLGZ41iziR41P6A
  qZRp3lzXySc6REVOJI969AZSGovOFYPX6YguCb6X4wSuc/Avn+3AT/0bE6eMTAhX
  FgTYhJbE4mHJCmVUxn1C+iUleg==\n-----END PRIVATE KEY-----`,
    client_email: "ccsrepo@ccsrepository-444308.iam.gserviceaccount.com",
    client_id: "103197742225204345135",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ccsrepo%40ccsrepository-444308.iam.gserviceaccount.com",
};

const auth = new google.auth.GoogleAuth({
    credentials: googleServiceAccount,
    scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
    version: "v3",
    auth,
});




const bufferToStream = (buffer) => {
    const readable = new Readable();
    readable._read = () => {}; // No-op _read implementation
    readable.push(buffer);
    readable.push(null); // End the stream
    return readable;
};

// Function to upload a file to Google Drive
const uploadFileToDrive = async (fileBuffer, fileName, mimeType) => {
    const fileMetadata = {
        name: fileName,
        parents: ['1DAB7zLgAWRSzirl6oQTEe0Qsr3eDSXQ6'], // Replace with your Google Drive folder ID
    };
    const media = {
        mimeType,
        body: bufferToStream(fileBuffer), // Convert Buffer to Readable stream
    };

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });
        return response.data;
    } catch (error) {
        console.error(`Error uploading file to Google Drive: ${fileName}`, error);
        throw error;
    }
};

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// Post route to handle uniform defiance creation
router.post('/create-uniformdefiance', upload.array('photo_video_files'), async (req, res) => {
    try {
        const { student_idnumber, nature_id, submitted_by } = req.body;

        if (!student_idnumber || !nature_id || !submitted_by || !req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Missing required fields or files' });
        }

        const uploadedFiles = [];
        for (const file of req.files) {
            const driveFile = await uploadFileToDrive(file.buffer, file.originalname, file.mimetype);
            uploadedFiles.push(driveFile.id);
        }

        const fileId = uploadedFiles.join(',');

        // Get current time in Philippine timezone
        const currentTimestamp = moment.tz("Asia/Manila").format('YYYY-MM-DD HH:mm:ss');

        const insertDefianceQuery = `
            INSERT INTO uniform_defiance 
            (student_idnumber, photo_video_filenames, created_at, submitted_by, nature_id) 
            VALUES (?, ?, ?, ?, ?)`;

        await db.promise().execute(insertDefianceQuery, [
            student_idnumber,
            fileId,
            currentTimestamp,
            submitted_by,
            nature_id,
        ]);

        res.status(201).json({ message: 'Uniform defiance recorded successfully' });
    } catch (error) {
        console.error('Error registering uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// GET: uniform_defiances
router.get('/uniform_defiances', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                ud.photo_video_filenames, 
                ud.status, 
                ud.created_at, 
                ud.updated_at, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name, 
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber;
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching uniform defiances:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// GET: All uniform_defiances except status 'Pending'
router.get('/uniform_defiances-not-pending', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                ud.photo_video_filenames, 
                ud.status, 
                ud.created_at, 
                ud.updated_at, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name, 
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.status != 'pending';
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching uniform defiances (not pending):', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// GET: All uniform_defiances with status 'Pending'
router.get('/uniform_defiances-pending', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                ud.photo_video_filenames, 
                ud.status, 
                ud.created_at, 
                ud.updated_at, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name, 
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.status = 'pending';
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching uniform defiances (pending):', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


/* GET: uniform_defiances (by student_idnumber) */
router.get('/uniform_defiances/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        const query = `
            SELECT 
                ud.*, 
                vn.nature_name, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM 
                uniform_defiance ud
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.student_idnumber = ?`;

        const [result] = await db.promise().query(query, [student_idnumber]);

        if (result.length === 0) {
            res.status(404).json({ message: 'No records found' });
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        console.error('Error fetching uniform defiance records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: uniform_defiances (by employee_idnumber for submitted_by) */
router.get('/uniform_defiance/:file_id', async (req, res) => {
    const { file_id } = req.params;

    if (!file_id) {
        return res.status(400).json({ error: true, message: 'File ID is required' });
    }

    try {
        // Query the database to fetch the relevant uniform defiance record and associated details
        const query = `
            SELECT 
                ud.*, 
                vn.nature_name, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM 
                uniform_defiance ud
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                FIND_IN_SET(?, ud.photo_video_filenames) > 0
        `;
        const [result] = await db.promise().query(query, [file_id]);

        if (result.length === 0) {
            return res.status(404).json({ error: true, message: 'File not found in the database' });
        }

        // Extract the first record (assuming `file_id` uniquely identifies a file in `photo_video_filenames`)
        const record = result[0];

        // Construct the Google Drive file URL using the file ID
        const fileUrl = `https://drive.google.com/uc?id=${file_id}`;

        // Include the fetched record details in the response
        res.status(200).json({
            fileUrl,
            details: {
                uniform_defiance: record,
                nature_name: record.nature_name,
                full_name: record.full_name,
            },
        });
    } catch (error) {
        console.error('Error fetching uniform defiance record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/uniform_defiance/:file_id', async (req, res) => {
    const { file_id } = req.params;

    if (!file_id) {
        return res.status(400).json({ error: true, message: 'File ID is required' });
    }

    try {
        // Query the database to fetch the record with the provided file_id
        const query = `
            SELECT photo_video_filenames 
            FROM uniform_defiance 
            WHERE FIND_IN_SET(?, photo_video_filenames) > 0
        `;
        const [result] = await db.promise().query(query, [file_id]);

        if (result.length === 0) {
            return res.status(404).json({ error: true, message: 'File not found in the database' });
        }

        // If found, construct the Google Drive URL
        const fileUrl = `https://drive.google.com/uc?id=${file_id}`;
        res.status(200).json({ fileUrl });
    } catch (error) {
        console.error('Error fetching file from Google Drive:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// Put: uniform_defiance
router.put('/uniform_defiance/:id', async (req, res) => {
    try {
        const slip_id = req.params.id;
        const { status } = req.body;

        if (!slip_id || !status) {
            return res.status(400).json({ error: 'Please provide all required details' });
        }

        const [result] = await db.promise().query(
            'UPDATE uniform_defiance SET status = ? WHERE slip_id = ?', 
            [status, slip_id]
        );

        res.status(200).json({ message: 'Uniform defiance updated successfully', result });
    } catch (error) {
        console.error('Error updating uniform defiance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




/* GET: Export all uniform_defiances except status 'Pending' to CSV */
router.get('/uniform_defiances-history/export', async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                ud.slip_id, 
                ud.student_idnumber, 
                CONCAT(s.first_name, ' ', IFNULL(s.middle_name, ''), ' ', s.last_name) AS student_full_name, -- Student's full name
                ud.status, 
                DATE_FORMAT(ud.created_at, '%m/%d/%Y, %r') AS created_at, -- Formatted date
                DATE_FORMAT(ud.updated_at, '%m/%d/%Y, %r') AS updated_at, -- Formatted date
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS submitted_by_full_name, -- Submitted by full name
                vn.nature_name 
            FROM 
                uniform_defiance ud 
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber -- Submitted by employee details
            LEFT JOIN 
                user s ON ud.student_idnumber = s.student_idnumber -- Student details
            WHERE 
                ud.status != 'Pending';
        `);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // Define CSV fields
        const fields = [
            { label: 'Slip ID', value: 'slip_id' },
            { label: 'Student ID Number', value: 'student_idnumber' },
            { label: 'Full Name', value: 'student_full_name' }, // Added Student's Full Name
            { label: 'Created At', value: 'created_at' },
            { label: 'Updated At', value: 'updated_at' },
            { label: 'Nature of Violation', value: 'nature_name' },
            { label: 'Status', value: 'status' },
            { label: 'Submitted By', value: 'submitted_by_full_name' }, // Renamed to reflect the field
        ];

        // Convert rows to CSV
        const csv = parse(rows, { fields });

        // Generate a temporary file path
        const filePath = path.join(__dirname, '..', 'exports', `uniform_defiances_history.csv`);

        // Write CSV to a file
        fs.writeFileSync(filePath, csv);

        // Send the file to the client
        res.download(filePath, `uniform_defiances_history.csv`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send({ error: 'Error exporting CSV file' });
            }

            // Delete the file after sending it
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temporary file:', unlinkErr);
                }
            });
        });
    } catch (error) {
        console.error('Error exporting uniform defiance records (not pending):', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: Export uniform defiance records to CSV */
router.get('/uniform_defiances/export/:student_idnumber', async (req, res) => {
    const student_idnumber = req.params.student_idnumber;

    if (!student_idnumber) {
        return res.status(400).send({ error: true, message: 'Please provide student_idnumber' });
    }

    try {
        const query = `
            SELECT 
                ud.slip_id, 
                DATE_FORMAT(ud.created_at, '%m/%d/%Y, %r') AS created_at, -- Format as MM/DD/YYYY, hh:mm:ss AM/PM
                DATE_FORMAT(ud.updated_at, '%m/%d/%Y, %r') AS updated_at, -- Format as MM/DD/YYYY, hh:mm:ss AM/PM
                vn.nature_name, 
                ud.status, 
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) AS full_name
            FROM 
                uniform_defiance ud
            LEFT JOIN 
                violation_nature vn ON ud.nature_id = vn.nature_id
            LEFT JOIN 
                user u ON ud.submitted_by = u.employee_idnumber
            WHERE 
                ud.student_idnumber = ? AND
                ud.status = 'approved'`;

        const [result] = await db.promise().query(query, [student_idnumber]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // Convert JSON result to CSV
        const fields = [
            { label: 'Slip ID', value: 'slip_id' },
            { label: 'Created At', value: 'created_at' }, 
            { label: 'Updated At', value: 'updated_at' }, 
            { label: 'Nature of Violation', value: 'nature_name' },
            { label: 'Status', value: 'status' },
            { label: 'Submitted By', value: 'full_name' },
        ];

        const csv = parse(result, { fields });

        // Generate a temporary file path
        const filePath = path.join(__dirname, '..', 'exports', `individual_uniform_defiances_${student_idnumber}.csv`);

        // Write CSV to a file
        fs.writeFileSync(filePath, csv);

        // Send the file to the client
        res.download(filePath, `individual_uniform_defiances_${student_idnumber}.csv`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send({ error: 'Error exporting CSV file' });
            }

            // Delete the file after sending it
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temporary file:', unlinkErr);
                }
            });
        });
    } catch (error) {
        console.error('Error exporting uniform defiance records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../app/configuration/database');
const router = express.Router();

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


// POST: Create an announcement with file uploads
router.post('/create-announcement', upload.array('files'), async (req, res) => {
    try {
        const { title, content, status } = req.body;
        const files = req.files; // Array of files

        if (!title || !content || !status) {
            return res.status(400).json({ error: 'Title, content, and status are required' });
        }

        if (content.length > 1000) {
            return res.status(400).json({ error: 'Content length cannot exceed 1000 characters' });
        }

        // Handle filenames and upload files to Google Drive
        const fileUploadPromises = files.map(async (file) => {
            const fileBuffer = file.buffer;
            const fileName = file.originalname;
            const mimeType = file.mimetype;

            // Upload the file to Google Drive and return the file ID
            const driveResponse = await uploadFileToDrive(fileBuffer, fileName, mimeType);
            return driveResponse.id;
        });

        // Wait for all files to be uploaded to Google Drive
        const fileIds = await Promise.all(fileUploadPromises);

        const filenames = fileIds.join(','); // Concatenate the Google Drive file IDs

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertAnnouncementQuery = `
            INSERT INTO announcement (title, content, status, filenames, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.promise().execute(insertAnnouncementQuery, [
            title,
            content,
            status,
            filenames,
            currentTimestamp
        ]);

        res.status(201).json({ message: 'Announcement created successfully' });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* GET: Retrieve a specific announcement by ID */
router.get('/announcement/:id', (req, res) => {
    const announcement_id = req.params.id;

    if (!announcement_id) {
        return res.status(400).send({ error: true, message: 'Please provide announcement_id' });
    }

    try {
        db.query(
            'SELECT title, content, status, filenames, created_at, updated_at FROM announcement WHERE announcement_id = ?', 
            [announcement_id], 
            (err, result) => {
                if (err) {
                    console.error('Error fetching announcement:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else if (result.length === 0) {
                    res.status(404).json({ message: 'Announcement not found' });
                } else {
                    res.status(200).json(result[0]);
                }
            }
        );
    } catch (error) {
        console.error('Error loading announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* GET: Retrieve all announcements */
router.get('/announcements', (req, res) => {
    try {
        db.query('SELECT * FROM announcement', (err, result) => {
            if (err) {
                console.error('Error fetching announcements:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading announcements:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





// PUT: Update announcement fields individually
// PUT: Edit an announcement with optional file uploads
router.put('/announcement/:id', upload.array('files'), async (req, res) => {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const files = req.files; // Array of files

    try {
        if (!id) {
            return res.status(400).json({ error: 'Announcement ID is required' });
        }

        if (!title || !content || !status) {
            return res.status(400).json({ error: 'Title, content, and status are required' });
        }

        if (content.length > 1000) {
            return res.status(400).json({ error: 'Content length cannot exceed 1000 characters' });
        }

        // Handle new file uploads
        let fileIds = [];
        if (files && files.length > 0) {
            const fileUploadPromises = files.map(async (file) => {
                const fileBuffer = file.buffer;
                const fileName = file.originalname;
                const mimeType = file.mimetype;

                // Upload the file to Google Drive and return the file ID
                const driveResponse = await uploadFileToDrive(fileBuffer, fileName, mimeType);
                return driveResponse.id;
            });

            // Wait for all files to be uploaded to Google Drive
            fileIds = await Promise.all(fileUploadPromises);
        }

        // Fetch existing filenames from the database
        const fetchAnnouncementQuery = `
            SELECT filenames FROM announcement WHERE id = ?
        `;
        const [existingAnnouncement] = await db.promise().execute(fetchAnnouncementQuery, [id]);
        if (existingAnnouncement.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const existingFilenames = existingAnnouncement[0].filenames ? existingAnnouncement[0].filenames.split(',') : [];

        // Combine existing filenames with new file IDs, if any
        const updatedFilenames = [...existingFilenames, ...fileIds].join(',');

        // Update the announcement in the database
        const updateAnnouncementQuery = `
            UPDATE announcement
            SET title = ?, content = ?, status = ?, filenames = ?, updated_at = ?
            WHERE id = ?
        `;
        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await db.promise().execute(updateAnnouncementQuery, [
            title,
            content,
            status,
            updatedFilenames,
            currentTimestamp,
            id
        ]);

        res.status(200).json({ message: 'Announcement updated successfully' });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





// PUT: Pin an announcement
router.put('/announcement/:id/pin', async (req, res) => {
    const announcement_id = req.params.id;

    if (!announcement_id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
    }

    try {
        // Update the specific announcement to be pinned
        const [result] = await db.promise().execute('UPDATE announcement SET status = "Pinned" WHERE announcement_id = ?', [announcement_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Announcement not found or already pinned' });
        }

        res.status(200).json({ message: 'Announcement pinned successfully' });
    } catch (error) {
        console.error('Error pinning announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




// PUT: Unpin an announcement
router.put('/announcement/:id/unpin', async (req, res) => {
    const announcement_id = req.params.id;

    if (!announcement_id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
    }

    try {
        // Unpin the announcement
        await db.promise().execute('UPDATE announcement SET status = "Published" WHERE announcement_id = ?', [announcement_id]);

        res.status(200).json({ message: 'Announcement unpinned successfully' });
    } catch (error) {
        console.error('Error unpinning announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






// DELETE: Remove a file attached to an announcement
router.delete('/announcement/:id/file/:filename', async (req, res) => {
    const announcement_id = req.params.id;
    const filename = req.params.filename;

    if (!announcement_id || !filename) {
        return res.status(400).json({ error: 'Announcement ID and filename are required' });
    }

    try {
        // Fetch existing announcement to get current filenames
        const [existingAnnouncement] = await db.promise().query('SELECT filenames FROM announcement WHERE announcement_id = ?', [announcement_id]);

        // Ensure the announcement exists
        if (existingAnnouncement.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const existingData = existingAnnouncement[0];
        const filenames = existingData.filenames.split(',');

        // Remove the filename from the list
        const updatedFilenames = filenames.filter(file => file !== filename);

        // Remove the file from the filesystem
        const filePath = path.join(__dirname, '../uploads', filename);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // Update the announcement entry in the database
        const updateAnnouncementQuery = `
            UPDATE announcement 
            SET filenames = ?
            WHERE announcement_id = ?
        `;

        await db.promise().execute(updateAnnouncementQuery, [
            updatedFilenames.join(','),
            announcement_id
        ]);

        res.status(200).json({ message: 'File removed successfully' });
    } catch (error) {
        console.error('Error removing file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* DELETE: Remove an announcement by ID */
router.delete('/announcement/:id', (req, res) => {
    const announcement_id = req.params.id;

    if (!announcement_id) {
        return res.status(400).send({ error: true, message: 'Please provide announcement_id' });
    }

    try {
        db.query('DELETE FROM announcement WHERE announcement_id = ?', [announcement_id], (err, result) => {
            if (err) {
                console.error('Error deleting announcement:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else if (result.affectedRows === 0) {
                res.status(404).json({ message: 'Announcement not found' });
            } else {
                res.status(200).json({ message: 'Announcement deleted successfully' });
            }
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Serve static files from the uploads directory
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

module.exports = router;

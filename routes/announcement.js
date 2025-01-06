const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../app/configuration/database');
const router = express.Router();

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage });

// Helper function to update filenames
const updateFilenames = (existingFilenames, newFilenames) => {
    const existingFiles = existingFilenames ? existingFilenames.split(',') : [];
    return [...existingFiles, ...newFilenames].join(','); // Ensure no commas in the filenames
};


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

        // Handle filenames
        const filenames = files.map(file => file.filename).join(',');

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
router.put('/announcement/:id', upload.array('files'), async (req, res) => {
    const announcement_id = req.params.id;
    const { title, content, status } = req.body;
    const newFiles = req.files; // Array of new files

    if (!announcement_id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
    }

    try {
        // Fetch existing announcement to get current values
        const [existingAnnouncement] = await db.promise().query('SELECT * FROM announcement WHERE announcement_id = ?', [announcement_id]);

        // Ensure the announcement exists
        if (existingAnnouncement.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        if (content && content.length > 1000) {
            return res.status(400).json({ error: 'Content length cannot exceed 1000 characters' });
        }

        const existingData = existingAnnouncement[0];
        const updatedTitle = title || existingData.title;
        const updatedContent = content || existingData.content;
        const updatedStatus = status || existingData.status;

        let filenames = existingData.filenames || '';
        if (newFiles.length > 0) {
            const newFilenames = newFiles.map(file => file.filename);
            filenames = updateFilenames(filenames, newFilenames);
        }

        const updateAnnouncementQuery = `
            UPDATE announcement 
            SET title = ?, content = ?, status = ?, filenames = ?, updated_at = ?
            WHERE announcement_id = ?
        `;

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Execute the update query
        await db.promise().execute(updateAnnouncementQuery, [
            updatedTitle,
            updatedContent,
            updatedStatus,
            filenames,
            currentTimestamp,
            announcement_id
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

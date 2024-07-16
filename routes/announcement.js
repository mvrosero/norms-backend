const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();


/*post: announcement*/
router.post('/create-announcement', async (req, res) => {
    try {
        const { title, content, status, photo_video_filename } = req.body;

        // Check if any required fields are missing
        if (!title || !content || !status || !photo_video_filename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const insertAnnouncementQuery = 'INSERT INTO announcement (title, content, status, photo_video_filename, created_at) VALUES (?, ?, ?, ?, ?)';
        
        await db.promise().execute(insertAnnouncementQuery, [title, content, status, photo_video_filename, currentTimestamp]);

        res.status(201).json({ message: 'Announcement registered successfully' });
    } catch (error) {
        console.error('Error registering announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 announcement*/
router.get('/announcement/:id',  (req, res) => {

    let announcement_id = req.params.id;

    if (!announcement_id) {
        return res.status(400).send({ error: true, message: 'Please provide announcement_id' });
    }

    try {
        db.query('SELECT title, content, status, photo_video_filename, created_at, updated_at FROM announcement WHERE announcement_id = ?', announcement_id, (err, result) => {
            if (err) {
                console.error('Error fetching announcement:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: announcements*/
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
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: announcement*/
router.put('/announcement/:id', async (req, res) => {

    const announcement_id = req.params.id;
    const { title, content, status, photo_video_filename } = req.body;

    if (!announcement_id || !title || !content || !status || !photo_video_filename) {
        return res.status(400).json({ error: 'Please provide all required information' });
    }

    try {
        const updateAnnouncementQuery = 'UPDATE announcement SET title = ?, content = ?, status = ?, photo_video_filename = ? WHERE announcement_id = ?';
        await db.promise().execute(updateAnnouncementQuery, [title, content, status, photo_video_filename, announcement_id]);

        res.status(200).json({ message: 'Announcement updated successfully' });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: announcement*/
router.delete('/announcement/:id', (req, res) => {

    let announcement_id = req.params.id;

    if (!announcement_id) {
        return res.status(400).send({ error: true, message: 'Please provide announcement_id' });
    }

    try {
        db.query('DELETE FROM announcement WHERE announcement_id = ?', announcement_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting announcement:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading announcement:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


module.exports = router;
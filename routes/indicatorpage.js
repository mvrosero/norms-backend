const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();

/*post: indicator_register*/
router.post('/indicator_register', authenticateToken, async (req, res) => {

    try {
        const {description, user_id, evaluation_id} = req.body;

        const insertIndicatorsQuery = 'INSERT INTO indicators (description, user_id, evaluation_id) VALUES (?, ?, ?)';
        await db.promise().execute(insertIndicatorsQuery, [description, user_id, evaluation_id]);

        res.status(201).json({ message: 'Indicator registered successfully' });
    } catch (error) {
        console.error('Error registering indicator:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*get: 1 indicator*/
router.get('/indicators/:id', authenticateToken, (req, res) => {

    let indicator_id = req.params.id;

    if (!indicator_id) {
        return res.status(400).send({ error: true, message: 'Please provide indicator_id' });
    }

    try {
        db.query('SELECT indicator_id, description, user_id, evaluation_id FROM indicators WHERE indicator_id = ?', indicator_id, (err, result) => {
            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/*put: indicator*/
router.put('/indicators/:id', authenticateToken, async (req, res) => {

    let indicator_id = req.params.id;

    const {description, user_id, evaluation_id} = req.body;

    if (!description || !user_id || !evaluation_id) {
        return res.status(400).send({ error: user, message: 'Please provide description, user_id, and evaluation_id' });
    }

    try {
        db.query('UPDATE indicators SET description = ?, user_id = ?, evaluation_id = ? WHERE indicator_id = ?', [description, user_id, evaluation_id, indicator_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating item:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: indicator*/
router.delete('/indicators/:id', authenticateToken, (req, res) => {

    let indicator_id = req.params.id;

    if (!indicator_id) {
        return res.status(400).send({ error: true, message: 'Please provide indicator_id' });
    }

    try {
        db.query('DELETE FROM indicators  WHERE indicator_id = ?', indicator_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting item:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*get: indicators*/
router.get('/indicators', authenticateToken, (req, res) => {

    try {
        db.query('SELECT indicator_id, description, user_id, evaluation_id FROM indicators', (err, result) => {

            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

/*export*/
module.exports = router;
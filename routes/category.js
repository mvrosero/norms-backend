const express = require('express'); /*import js*/
const { authenticateToken } = require('../app/middleware/authentication');
const db = require('../app/configuration/database');
const router = express.Router();


/*post: category*/
router.post('/registerCategory', async (req, res) => {

    try {
        const {category_name} = req.body;

        const insertCategoryQuery = 'INSERT INTO category (category_name) VALUES (?)';
        await db.promise().execute(insertCategoryQuery, [category_name]);

        res.status(201).json({ message: 'Category registered successfully' });
    } catch (error) {
        console.error('Error registering category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: 1 category*/
router.get('/category/:id',  (req, res) => {

    let category_id = req.params.id;

    if (!category_id) {
        return res.status(400).send({ error: true, message: 'Please provide category_id' });
    }

    try {
        db.query('SELECT category_id, category_name FROM category WHERE category_id = ?', category_id, (err, result) => {
            if (err) {
                console.error('Error fetching category:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {

        console.error('Error loading category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*get: categories*/
router.get('/categories', (req, res) => {

    try {
        db.query('SELECT category_id, category_name FROM category', (err, result) => {

            if (err) {
                console.error('Error fetching categories:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*put: category*/
router.put('/category/:id', async (req, res) => {

    let category_id = req.params.id;

    const {category_name} = req.body;

    if (!category_id || !category_name) {
        return res.status(400).send({ error: user, message: 'Please provide category name' });
    }

    try {
        db.query('UPDATE category SET category_name = ? WHERE category_id = ?', [category_name, category_id], (err, result, fields) => {
            if (err) {
                console.error('Error updating category:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/*delete: category*/
router.delete('/category/:id', (req, res) => {

    let category_id = req.params.id;

    if (!category_id) {
        return res.status(400).send({ error: true, message: 'Please provide category_id' });
    }

    try {
        db.query('DELETE FROM category WHERE category_id = ?', category_id, (err, result, fields) => {
            if (err) {
                console.error('Error deleting category:', err);
                res.status(500).json({ message: 'Internal Server Error'});
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});


/*export*/
module.exports = router;


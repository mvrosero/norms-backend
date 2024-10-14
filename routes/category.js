const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();

/* POST: Register category */
router.post('/register-category', async (req, res) => {
    try {
        const { category_name, status } = req.body; // Destructure status from request body

        if (!category_name || status === undefined) {
            return res.status(400).json({ error: 'Please provide category_name and status' });
        }

        const insertCategoryQuery = 'INSERT INTO category (category_name, status) VALUES (?, ?)';
        await db.promise().execute(insertCategoryQuery, [category_name, status]);

        res.status(201).json({ message: 'Category registered successfully' });
    } catch (error) {
        console.error('Error registering category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* GET: Fetch one category by ID */
router.get('/category/:id', (req, res) => {
    const category_id = req.params.id;

    if (!category_id) {
        return res.status(400).send({ error: true, message: 'Please provide category_id' });
    }

    try {
        db.query('SELECT category_id, category_name, status FROM category WHERE category_id = ?', [category_id], (err, result) => {
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

/* GET: Fetch all categories */
router.get('/categories', (req, res) => {
    try {
        db.query('SELECT * FROM category', (err, result) => {
            if (err) {
                console.error('Error fetching categories:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* PUT: Update category by ID */
router.put('/category/:id', async (req, res) => {
    const category_id = req.params.id;
    const { category_name, status } = req.body; // Get status from request body

    if (!category_id || (!category_name && status === undefined)) {
        return res.status(400).send({ error: true, message: 'Please provide category_id and at least one field to update' });
    }

    try {
        // Prepare the query to update category
        const updateQuery = `
            UPDATE category 
            SET category_name = COALESCE(?, category_name), 
                status = COALESCE(?, status) 
            WHERE category_id = ?
        `;

        await db.promise().execute(updateQuery, [category_name, status, category_id]); // Update name and status

        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* DELETE: Delete category by ID */
router.delete('/category/:id', (req, res) => {
    const category_id = req.params.id;

    if (!category_id) {
        return res.status(400).send({ error: true, message: 'Please provide category_id' });
    }

    try {
        db.query('DELETE FROM category WHERE category_id = ?', [category_id], (err, result) => {
            if (err) {
                console.error('Error deleting category:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else if (result.affectedRows === 0) {
                res.status(404).json({ message: 'Category not found' });
            } else {
                res.status(200).json({ message: 'Category deleted successfully' });
            }
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

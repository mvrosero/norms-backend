const express = require('express'); 
const db = require('../app/configuration/database');
const router = express.Router();

/* post: register offense */
router.post('/register-offense', async (req, res) => {
    try {
        const { offense_code, offense_name, category_id, subcategory_id, status } = req.body; // Added subcategory_id
        
        const insertOffenseQuery = 'INSERT INTO offense (offense_code, offense_name, category_id, subcategory_id, status) VALUES (?, ?, ?, ?, ?)';
        await db.promise().execute(insertOffenseQuery, [offense_code, offense_name, category_id, subcategory_id, status]);

        res.status(201).json({ message: 'Offense registered successfully' });
    } catch (error) {
        console.error('Error registering offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* get: 1 offense */
router.get('/offense/:id', (req, res) => {
    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide offense_id' });
    }

    try {
        db.query(
            `SELECT offense.offense_id, offense.offense_code, offense.offense_name, offense.status, 
                    category.category_name AS category_name, subcategory.subcategory_name AS subcategory_name
             FROM offense
             LEFT JOIN category ON offense.category_id = category.category_id
             LEFT JOIN subcategory ON offense.subcategory_id = subcategory.subcategory_id
             WHERE offense.offense_id = ?`,
            offense_id,
            (err, result) => {
                if (err) {
                    console.error('Error fetching offense:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* get: offenses */
router.get('/offenses', (req, res) => {
    try {
        db.query(
            `SELECT offense.offense_id, offense.offense_code, offense.offense_name, offense.status, 
                    category.category_name AS category_name, subcategory.subcategory_name AS subcategory_name
             FROM offense
             LEFT JOIN category ON offense.category_id = category.category_id
             LEFT JOIN subcategory ON offense.subcategory_id = subcategory.subcategory_id`,
            (err, result) => {
                if (err) {
                    console.error('Error fetching offenses:', err);
                    res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    res.status(200).json(result);
                }
            }
        );
    } catch (error) {
        console.error('Error loading offenses:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/* get: offenses grouped by category */
/* Get: offenses by category_id*/
router.get('/active-offenses/:category_id', async (req, res) => {
    const { category_id } = req.params;

    if (!category_id) {
        return res.status(400).json({ error: 'Please provide a valid category_id' });
    }

    try {
        // Fetch offenses for the given category_id
        const [offenses] = await db.promise().query(`
            SELECT 
                o.offense_id, 
                o.offense_name, 
                o.offense_code, 
                o.status
            FROM offense o
            WHERE o.category_id = ? AND o.status = 'active'
            ORDER BY o.offense_name ASC
        `, [category_id]);

        if (offenses.length === 0) {
            return res.status(404).json({ error: 'No offenses found for the provided category' });
        }

        res.status(200).json(offenses); // Return the offenses for the given category
    } catch (error) {
        console.error('Error fetching offenses by category:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});





/* put: offense */
router.put('/offense/:id', async (req, res) => {
    let offense_id = req.params.id;
    const { offense_code, offense_name, status, category_name, subcategory_name } = req.body;

    if (!offense_id || !offense_code || !offense_name || !status || !category_name || !subcategory_name) {
        return res.status(400).send({ error: true, message: 'Please provide all required information' });
    }

    try {
        // Fetch category_id based on category_name
        const categoryResult = await new Promise((resolve, reject) => {
            db.query('SELECT category_id FROM category WHERE category_name = ?', [category_name], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        if (categoryResult.length === 0) {
            return res.status(400).send({ error: true, message: 'Category not found' });
        }

        const category_id = categoryResult[0].category_id;

        // Fetch subcategory_id based on subcategory_name
        const subcategoryResult = await new Promise((resolve, reject) => {
            db.query('SELECT subcategory_id FROM subcategory WHERE subcategory_name = ?', [subcategory_name], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        if (subcategoryResult.length === 0) {
            return res.status(400).send({ error: true, message: 'Subcategory not found' });
        }

        const subcategory_id = subcategoryResult[0].subcategory_id;

        // Now, update the offense
        db.query('UPDATE offense SET offense_code = ?, offense_name = ?, status = ?, category_id = ?, subcategory_id = ? WHERE offense_id = ?', 
            [offense_code, offense_name, status, category_id, subcategory_id, offense_id], 
            (err, result) => {
                if (err) {
                    console.error('Error updating offense:', err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }

                res.status(200).json({ message: 'Offense updated successfully', result });
            });

    } catch (error) {
        console.error('Error updating offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});






/* delete: offense */
router.delete('/offense/:id', async (req, res) => {
    let offense_id = req.params.id;

    if (!offense_id) {
        return res.status(400).send({ error: true, message: 'Please provide offense_id' });
    }

    try {
        const deleteOffenseQuery = 'DELETE FROM offense WHERE offense_id = ?';
        const [result] = await db.promise().execute(deleteOffenseQuery, [offense_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Offense not found' });
        }

        res.status(200).json({ message: 'Offense deleted successfully' });
    } catch (error) {
        console.error('Error deleting offense:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;

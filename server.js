const express = require('express'); /*import js*/
const bodyParser = require('body-parser'); /*route*/

/*enables cors for all routes*/
const app = express();
const cors = require('cors'); /*enables submitting data*/
app.use(cors());

const PORT = process.env.PORT || 3001; /*port number*/

/*import modules*/
const userpage = require('./routes/userpage');
const roles = require('./routes/roles');
const category = require('./routes/category');
const offense = require('./routes/offense');


app.use(bodyParser.json());

/*routes*/
app.use('/', userpage);
app.use('/', roles);
app.use('/', category);
app.use('/', offense);



/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








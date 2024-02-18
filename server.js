const express = require('express'); /*import js*/
const bodyParser = require('body-parser'); /*route*/

/*enables cors for all routes*/
const app = express();
const cors = require('cors'); /*enables submitting data*/
app.use(cors());

const PORT = process.env.PORT || 3001; /*port number*/

/*import modules*/
const student = require('./routes/student');
const role = require('./routes/role');
const category = require('./routes/category');
const offense = require('./routes/offense');
const sanction = require('./routes/sanction');
const employee = require('.//routes/employee');
const department = require('./routes/department');


app.use(bodyParser.json());

/*routes*/
app.use('/', student);
app.use('/', role);
app.use('/', category);
app.use('/', offense);
app.use('/', sanction);
app.use('/', employee);
app.use('/', department);



/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








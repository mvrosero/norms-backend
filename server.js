const express = require('express'); /*import js*/
const bodyParser = require('body-parser'); /*route*/

/*enables cors for all routes*/
const app = express();
const cors = require('cors'); /*enables submitting data*/
app.use(cors());

const PORT = process.env.PORT || 3001; /*port number*/

/*import modules*/
const role = require('./routes/role');
const department = require('./routes/department');
const student = require('./routes/student');
const employee = require('.//routes/employee');
const category = require('./routes/category');
const offense = require('./routes/offense');
const sanction = require('./routes/sanction');
const report = require('./routes/report');
const violation = require('./routes/violation');
const user = require('./routes/user');


app.use(bodyParser.json());

/*routes*/
app.use('/', role);
app.use('/', department);
app.use('/', student);
app.use('/', employee);
app.use('/', category);
app.use('/', offense);
app.use('/', sanction);
app.use('/', report);
app.use('/', violation);
app.use('/', user);


/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








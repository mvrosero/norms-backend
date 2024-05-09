const express = require('express'); /*import js*/
const bodyParser = require('body-parser'); /*route*/

/*enables cors for all routes*/
const app = express();
const cors = require('cors'); /*enables submitting data*/
app.use(cors());

const PORT = process.env.PORT || 9000; /*port number*/

/*import modules*/
const student = require('./routes/student')
const permission = require('./routes/permission');
const role = require('./routes/role');
const employee = require('./routes/employee');
const incident_report = require('./routes/incident_report');
const departments = require('./routes/department');
const category = require('./routes/category');
const offense = require('./routes/offense');
const sanction = require('./routes/sanction');
const violation_record = require('./routes/violation_record');
const uniformDefiance = require('./routes/uniform_defiance');
const programRoutes = require('./routes/programs');
const UserRoutes = require('./routes/users');


app.use(bodyParser.json());

/*define routes*/
app.use('/', student);
app.use('/', permission);
app.use('/', role);
app.use('/', employee);
app.use('/', incident_report);
app.use('/', departments);

app.use('/', category);
app.use('/', offense);
app.use('/', sanction);
app.use('/', violation_record);
app.use('/', uniformDefiance);
app.use('/', programRoutes);
app.use('/', UserRoutes);





/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








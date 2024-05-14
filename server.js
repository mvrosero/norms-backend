const express = require('express'); 
const bodyParser = require('body-parser'); 

/*enables cors for all routes*/
const app = express();
/*enables submitting data*/
const cors = require('cors'); 
app.use(cors());

/*port number*/
const PORT = process.env.PORT || 9000; 

/*import modules*/
const student = require('./routes/student')
const role = require('./routes/role');
const employee = require('./routes/employee');
const department = require('./routes/department');
const category = require('./routes/category');
const offense = require('./routes/offense');
const sanction = require('./routes/sanction');
const violation_record = require('./routes/violation_record');
const program = require('./routes/program');
const users = require('./routes/users');
const academic_year = require('./routes/academic_year');
const administrator = require('./routes/administrator');
const semester = require('./routes/semester');

app.use(bodyParser.json());

/*define routes*/
app.use('/', student);
app.use('/', role);
app.use('/', employee);
app.use('/', department);
app.use('/', category);
app.use('/', offense);
app.use('/', sanction);
app.use('/', violation_record);
app.use('/', program);
app.use('/', users);
app.use('/', academic_year);
app.use('/', administrator);
app.use('/', semester);


  
/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








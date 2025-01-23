const express = require('express'); 
const bodyParser = require('body-parser'); 

/*enables cors for all routes*/
const app = express();
/*enables submitting data*/
const cors = require('cors'); 
app.use(cors());

/*port number*/
const PORT = 10121 || 9000; 

/*import modules*/
const role = require('./routes/role');
const users = require('./routes/users');
const student = require('./routes/student');
const administrator = require('./routes/administrator');
const employee = require('./routes/employee');
const department = require('./routes/department');
const program = require('./routes/program');
const academic_year = require('./routes/academic_year');
const semester = require('./routes/semester');
const category = require('./routes/category');
const subcategory = require('./routes/subcategory');
const offense = require('./routes/offense');
const sanction = require('./routes/sanction');
const violation_record = require('./routes/violation_record');
const violation_nature = require('./routes/violation_nature');
const uniform_defiance = require('./routes/uniform_defiance');
const announcement = require('./routes/announcement');
const settings = require('./routes/settings');
const violation_user = require('./routes/violation_user');
const violation_sanction = require('./routes/violation_sanction');
const graphs = require('./routes/graphs');


app.use(bodyParser.json());

/*define routes*/
app.use('/', role);
app.use('/', users);
app.use('/', student);
app.use('/', employee);
app.use('/', administrator);
app.use('/', department);
app.use('/', program);
app.use('/', academic_year);
app.use('/', semester);
app.use('/', category);
app.use('/', subcategory);
app.use('/', offense);
app.use('/', sanction);
app.use('/', violation_record);
app.use('/', violation_nature);
app.use('/', uniform_defiance);
app.use('/', announcement);
app.use('/', settings);
app.use('/', violation_user);
app.use('/', violation_sanction);
app.use('/', graphs);

  
/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








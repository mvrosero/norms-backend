const express = require('express'); /*import js*/
const bodyParser = require('body-parser'); /*route*/

/*enables cors for all routes*/
const app = express();
const cors = require('cors'); /*enables submitting data*/
app.use(cors());

const PORT = process.env.PORT || 3001; /*port number*/

/*import modules*/
const permission = require('./routes/permission');
const role = require('./routes/role');
const user = require('./routes/user');
const incident_report = require('./routes/incident_report');

const category = require('./routes/category');
const offense = require('./routes/offense');
const sanction = require('./routes/sanction');
const violation_record = require('./routes/violation_record');




app.use(bodyParser.json());

/*define routes*/
app.use('/', permission);
app.use('/', role);
app.use('/', user);
app.use('/', incident_report);

app.use('/', category);
app.use('/', offense);
app.use('/', sanction);
app.use('/', violation_record);
app.use('/', user);




/*express JS framework*/
app.get('/', (req, res) => {
    res.json({message: 'Restful API Backend Using ExpressJS'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








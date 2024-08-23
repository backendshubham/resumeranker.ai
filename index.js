const express = require('express');
const connectDB = require('./src/config/database');
const apiRoutes = require('./src/routes/api');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');


require('dotenv').config();

const app = express();

connectDB();

app.use(fileUpload());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

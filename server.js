const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { createAccount, transfer } = require('./controller');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 8080;

app.get('/createAccount', createAccount);
app.get('/transfer', transfer);

app.listen(port, function() {
	console.log('Node app is running at localhost: ' + port);
})
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { createAccount, getAccount, getBalance, adminSend, userSend, test, depositAddress } = require('./controller');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 8080;

app.get('/createAccount', createAccount);
app.get('/getAccount', getAccount);
app.get('/getBalance', getBalance);
app.get('/adminSend', adminSend);
app.get('/userSend', userSend);
app.get('/depositAddress', depositAddress);
app.get('/test', test);

app.listen(port, function() {
	console.log('Node app is running at localhost: ' + port);
})
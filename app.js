require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

// const {login, refresh} = require('./controller');
const {login, refresh, verify} = require('./middleware');

const hostname = '127.0.0.1';
const port = 4000;

app.use(bodyParser.json());
app.use(cookieParser());

app.post('/login', login);
app.post('/refresh', refresh);
// app.get('/testJWT', verify, (req, res) => {
	app.get('/testJWT', verify, refresh, (req, res) => {
	res.status(200).send({
		message: "Welcome to testJWT page, your access has been granted"
	});
});

app.listen(port, hostname, () => {
  console.log(`El servidor se está ejecutando en http://${hostname}:${port}/ - El proyecto es jwt refresh token`);
});
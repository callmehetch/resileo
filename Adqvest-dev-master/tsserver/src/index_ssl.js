const express = require('express');
const path = require('path');
const cors = require('cors');
const mountRountes = require('./api');
const compression = require('compression');
const log = require('./log');
var logger = log.Logger;
const app = express();
app.use(compression());
const fs = require('fs');


//SSL CONFIG
var key = fs.readFileSync('C:\\Users\\Administrator\\Downloads\\waka-sop\\ssl\\waka.key');
var cert = fs.readFileSync('C:\\Users\\Administrator\\Downloads\\waka-sop\\ssl\\wakatech_com.crt' );
var ca = fs.readFileSync( 'C:\\Users\\Administrator\\Downloads\\waka-sop\\ssl\\wakatech_com.ca-bundle' );

var options = {
key: key,
cert: cert,
ca: ca
};

var httpsPort=443;
var https = require('https');
//https.createServer(options, app).listen(httpsPort, () => console.log('WAKA Server listening on port '+httpsPort+'!'));

//HTTP listening port can be modified by changing below.
var httpPort=8000;
var http = require('http');
/*http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
	console.log("http request, will go to >> ");
    console.log("https://" + req.headers['host'].replace(http_port,https_port) + req.url );
    res.end();
}).listen(httpPort);*/

http.createServer(app).listen(httpPort, () => console.log('WAKA Server listening on port '+httpPort+'!'));

/*
const httpServer = http.createServer(app, function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
} );
httpServer.listen(httpPort, () => {
    console.log('HTTP Server running on port : ', httpPort);
});*/

/*
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:3000']
}));*/

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Orgin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Orgin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', ['GET', 'POST']);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
})

app.use(express.json({limit: '2mb'}));
app.use(express.urlencoded({
    limit: '2mb',
    extended: true
}));
app.use(express.static(__dirname + '/waka-sop-ui/dist/waka-sop-ui/'));

mountRountes(app);

app.get('*', (req, res) => res.sendFile(path.join(__dirname + '/waka-sop-ui/dist/waka-sop-ui/index.html')));
app.use(function applyXFrame(req, res, next) {
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
});

app.use(function (req, res, next) {
	if (req.secure) {
			// request was via https, so do no special handling
			next();
	} else {
			// request was via http, so redirect to https
			res.redirect('https://' + req.headers.host + req.url);
	}
});

process.on('unhandledRejection', (err) => {
    logger.log("error", 'unhandledRejection %s in process %s', err.message, process.pid);
    console.error(err.message);
})

process.on('uncaughtException', err => {
    logger.log("error", 'uncaughtException %s in process %s', err.message, process.pid);
    console.error(`Uncaught Exception: ${err.message}`);
})

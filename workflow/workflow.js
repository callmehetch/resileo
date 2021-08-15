const compression = require('compression')
const express = require('express');
const router = express.Router();
const mountRountes = require('./routes');
global.logger = require('./log');
var http = require('http');

const app = express();
app.use(compression());
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

//const fs = require('fs');
var morgan = require('morgan')
var rfs = require('rotating-file-stream') // version 2.x

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
console.log("Number of CPUs: "+numCPUs);
logger.info("Number of CPUs: ",numCPUs)


console.log("current directory located in " + __dirname);
console.log("The current working directory is " + process.cwd());
console.log("cluster.isMaster: "+cluster.isMaster);
// if (cluster.isMaster) {
//     console.log(`Master ${process.pid} is running`);
  
//     // Fork workers.
//     for (let i = 0; i < numCPUs; i++) {
//       cluster.fork();
//     }
//     cluster.on('fork', (worker) => {
//         console.log(`worker ${worker.process.pid} running`);
//         logger.info("worker",worker.process.pid," running");
//     });
  
//     cluster.on('exit', (worker, code, signal) => {
//         console.log(`worker ${worker.process.pid} died`);
//         logger.info("worker",worker.process.pid," died");
//     });
// } else {
    app.use(cors({
        // starting point for angular 9 client project
        origin: 'http://localhost:4200'
    }));
    // parse application/x-www-form-urlencoded
    // app.use(bodyParser.urlencoded({ extended: false }));
    
    // // parse application/json
    // app.use(bodyParser.json());

    // parse application/json
    // app.use(bodyParser.json());
    app.use(bodyParser.json({limit: '10mb', extended: true}));
    app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
    app.use(express.static(__dirname + '/workflow-ui/dist/workflow-ui/'));
    
    // create a write stream (in append mode)
    var accessLogStream = rfs.createStream(
        'access.log', {
            path: path.join(__dirname, 'log', 'access'),
            interval: '1d', /* rotate daily */
			initialRotation: true,
			intervalBoundary: true,
            compress: "gzip" /* compress rotated files */
    });
    
    // setup the access log
    app.use(morgan(':remote-addr - :remote-user [:date[iso]] ":method :url HTTP/:http-version" :status :response-time ms :total-time ms :res[content-length] ":referrer" ":user-agent"', {stream: accessLogStream}))

    app.use(function(req,res,next){
        if (req.url.includes('fileUpload')){
            res.setHeader('Access-Control-Allow-Orgin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Orgin, X-Requested-With, Content-Type, Accept');
            res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
            res.setHeader("Access-Control-Allow-Credentials", true);
        }
        next();
    })
    
    mountRountes(app);
    
    app.get('*', (req, res) => res.sendFile(path.join(__dirname + '/workflow-ui/dist/workflow-ui/index.html')));
    app.use(function applyXFrame(req, res, next) {
        res.set('X-Frame-Options', 'SAMEORIGIN');
        next();
    });

    //HTTP listening port can be modified by changing below.
    var httpPort=4040;
    app.listen(httpPort, (req, res) => {
        console.log('Workflow Server listening on port '+httpPort+'!')
    });
    
//    // SSL config & HTTPS start
//    var https_options = {
//      // Disable SSL-2, SLS-3, TLS-1, and TLS-1.1 protocols.
//      // This could be tested with the OS command "openssl s_client -connect 192.168...:443 -tls1_1"
//      // secureOptions: (constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1),
//      key: fs.readFileSync("../ssl/cert1.pem", 'utf8'),
//      cert: fs.readFileSync("../ssl/privkey1.pem", 'utf8'),
//      ca: fs.readFileSync("../ssl/fullchain1.pem", 'utf8')
//    }
//    
//    var httpsPort = 443;
//    var https = require('https');
//    https.createServer(https_options, app).listen(
//      httpsPort, // port
//      "0.0.0.0", // allow all IP.
//      function() {
//        console.log('Workflow Server listening on port '+httpsPort+'!')
//      }
//    );

// }

process.on('unhandledRejection', (err) => { 
    logger.log("error",'unhandledRejection %s in process %s',err.message, process.pid);
    console.error(err.message);
})
  
process.on('uncaughtException', err => {
    logger.log("error",'uncaughtException %s in process %s',err.message, process.pid);
    console.error(`Uncaught Exception: ${err.message}`);
})
const multer = require('multer');

const rand = require('crypto').randomBytes(32).toString('hex');
// In multi-core functionality, each core generates a separate random.
// jwt.sign() done by one core with one of the above random number does not get verified in another core with different random.
// const rand = "da5f0fb0fa0c2c8c9494552bd6ec862dde7ae69f89f2e153532b3111254f4cf7"; // This is for Performance Testing

settings = {
    dbPwdPvtKey: "A%6Fgd34Xc95@3049fdKc3jFl",
    jwtKey: rand,
    pgDbConfig:{
        user: 'postgres', 
        database: 'workflow', 
        host: '35.160.246.188', 
        password: 'n0#ntry@^pp#d0', 
        // host: '18.217.67.42', 
        // password: 'n0#ntry@^pp#d7', 
        // password: 'n0#ntry@^pp#d0', 
        // host: '35.160.246.188', 
        port: 5432, 
        max: 50, // max number of clients in the pool
        idleTimeoutMillis: 300000,
    },
    tokenExpiresIn: '30m', 
    geoLocURL: 'https://nominatim.openstreetmap.org',
};
const crypto = require('crypto');

const ENCRYPTION_KEY = "5c88acf79eecbc7841@ar$tyudchtd^h";  //process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
 let iv = crypto.randomBytes(IV_LENGTH);
 let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
 let encrypted = cipher.update(text);
 encrypted = Buffer.concat([encrypted, cipher.final()]);
 return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(":"), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

//storage location and file name
var store = multer.diskStorage({
	destination: function(req,file,cb) {
        console.log('Suggession',req.headers['suggestion_id']);
		cb(null, './uploads/'+req.headers['suggestion_id']+"/");
	},
	filename:function(req, file, cb){
		cb(null, Date.now()+'.'+file.originalname);
    }
});
let fileUpload = multer({storage:store}).single('file');
// module.exports.fileUpload = fileUpload;

module.exports = { decrypt, encrypt, settings, fileUpload };

//running the service in production mode for the first time below code to be used.
/*
set NODE_ENV=production //only for the first time.
node data_mig.js
*/


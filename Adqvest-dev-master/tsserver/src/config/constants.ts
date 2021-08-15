import {randomBytes, createCipheriv,createDecipheriv, createHash} from 'crypto';
const rand = randomBytes(32).toString('hex');
let settings = {
    jwtKey: rand,
    pgDbConfig:{
        user: 'postgres', 
        database: 'adqvest',
        // host: 'localhost', 
        // password: 'smith', 
        // host: '18.217.67.42', 
        // // password: 'n0#ntry@^pp#d7', 
        password: 'n0#ntry@^pp#d0', 
        host: '35.160.246.188', 
        port: 5432, 
        max: 50, // max number of clients in the pool
        idleTimeoutMillis: 300000,
    },
    tokenExpiresIn: '30d',
    chConfig: {
        // url: 'http://35.160.246.188',
        url:'http://ec2-3-108-253-129.ap-south-1.compute.amazonaws.com',
        port: 8123,
        debug: false,
        basicAuth: {
            username: 'default',
	        // password: 'n0#ntry@^pp#d0',
            password:'@Dqu&TP@ssw0rd'
        },
        isUseGzip: false,
        format: "json", // "json" || "csv" || "tsv"
        raw: false,
        config: {
            // session_id                              : 'session_id if neeed',
            // session_timeout                         : 60,
            // output_format_json_quote_64bit_integers : 0,
            // enable_http_compression                 : 0,
            // database                                : 'ss_profiler',
            database: 'AdqvestDB'
        },
    }
};

const MAIL_SERVICE_URL = "http://test.appedo.com:8822/mailer";

const ENCRYPTION_KEY = "Ac88ac#4289cbc7841@ar$tgrdc$td^h";  //process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text:string) {
 let iv = randomBytes(IV_LENGTH);
 let cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
 let encrypted = cipher.update(text);
 encrypted = Buffer.concat([encrypted, cipher.final()]);
 return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text:string) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift()!, 'hex');
    let encryptedText = Buffer.from(textParts.join(":"), 'hex');
    let decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function MD5Hash(msgBuffer:Buffer) {
    return createHash('md5').update(msgBuffer).digest("hex");
}

module.exports = { decrypt, encrypt, settings, MD5Hash, MAIL_SERVICE_URL};


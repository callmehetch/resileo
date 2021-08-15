const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf,splat, json } = format;
require('winston-daily-rotate-file');

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    splat(),
    timestamp(),
    myFormat
  ),    
  transports: [
    new (transports.DailyRotateFile)({
        filename: './log/error/workflow-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
    }),
    new (transports.DailyRotateFile)({
        filename: './log/info/workflow-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',            
    }),
  ]
});
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new transports.Console({
//     format: format.simple()
//   }));
// }

logger.log("info",'Info logger started at %s %s', new Date().toLocaleString(), 'local time');
logger.log('error','Error logger Started at %s %s', new Date().toLocaleString(), 'local time');

module.exports = logger;
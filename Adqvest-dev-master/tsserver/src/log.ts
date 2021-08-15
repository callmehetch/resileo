const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

let accessLog = createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.splat(),
    format.simple()
  ), 
  transports: [
    new (transports.DailyRotateFile)({
        filename: './log/wakasop/info/access-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
    })
  ]
});

let logger = createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.splat(),
    format.simple()
  ), 
  transports: [
    new (transports.DailyRotateFile)({
        filename: './log/wakasop/error/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
    }),
    new (transports.DailyRotateFile)({
        filename: './log/wakasop/info/info-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
    })
  ]
});

let dbServiceLog = createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.splat(),
    format.simple()
  ), 
  transports: [
    new (transports.DailyRotateFile)({
        filename: './log/wakasop/error/errordb-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
    }),
    new (transports.DailyRotateFile)({
        filename: './log/wakasop/info/infodb-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
    })
  ]
});

function fnAccessLog (level:string, message:any):void{
  let dt = new Date();
  let date = dt.getFullYear()+"-"+(dt.getMonth()+1).toString().padStart(2,"0")+"-"+dt.getDate().toString().padStart(2,"0")+"T"+dt.getHours().toString().padStart(2,"0")+":"+dt.getMinutes().toString().padStart(2,"0")+":"+dt.getSeconds().toString().padStart(2,"0");
  accessLog.log(level, `${date}, ${message}`);
}

function wlogger (level:string, message:any):void{
  let dt = new Date();
  let date = dt.getFullYear()+"-"+(dt.getMonth()+1).toString().padStart(2,"0")+"-"+dt.getDate().toString().padStart(2,"0")+"T"+dt.getHours().toString().padStart(2,"0")+":"+dt.getMinutes().toString().padStart(2,"0")+":"+dt.getSeconds().toString().padStart(2,"0");
  logger.log(level, `${date}, ${message}`);
}

function dblogger (level:string, message:any):void{
  let dt = new Date();
  let date = dt.getFullYear()+"-"+(dt.getMonth()+1).toString().padStart(2,"0")+"-"+dt.getDate().toString().padStart(2,"0")+"T"+dt.getHours().toString().padStart(2,"0")+":"+dt.getMinutes().toString().padStart(2,"0")+":"+dt.getSeconds().toString().padStart(2,"0");
  dbServiceLog.log(level, `${date}, ${message}`);
}

export = {logger: wlogger, dblog: dblogger, accesslog: fnAccessLog};

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new transports.Console({
//     format: format.simple()
//   }));
// }

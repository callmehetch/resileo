const { Pool } = require('pg')
const config = require('../config/constants');
const pool = new Pool (config.settings.pgDbConfig);
global.logger = require('../log');

module.exports.fnDbQuery = fnDbQuery;

async function fnDbQuery(methodName,queryText, queryParam) {
  let client ;
  let start;
  let qryResult;
  try {
    start = Date.now();
    client = await pool.connect();
    try {
      const result = await client.query(queryText, queryParam);
      const duration = Date.now() - start;
      result.success = true;
      result.error = false;
      console.log(new Date().toLocaleString()+", "+methodName+" , "+duration+' ms'+' ,Pool Idle: '+pool.idleCount +' ,QueryWaiting: '+pool.waitingCount +' Pool Total Cnt: '+pool.totalCount);
      logger.info("PID: %d, DB:PSQL, MethodName: %s, Duration: %d ms, IdleCount: %d, WaitingCount: %d, TotalCount: %d",process.pid,methodName,duration,pool.idleCount,pool.waitingCount,pool.totalCount);
      qryResult =  result;
    } catch (e) {
        logger.error("PID: %d, DB:PSQL, MethodName: %s, ErrMsg: %s, Stack: %s",process.pid,methodName,e.message, e.stack);
        qryResult = {success:false, error: true, message: e.message};
    } finally {
      client.release();
    }
  } catch (e){

    logger.error("PID: %d, DB:PSQL, MethodName: %s, ErrMsg: %s, Stack: %s",process.pid,methodName,e.message, e.stack);
    qryResult = {success:false, error: true, message: e.message};
  } finally {
    return qryResult;
  }
}

pool.on('error', (err) => {
  logger.error("PID: %d, DB:PSQL, MethodName: %s, ErrMsg: %s, Stack: %s",process.pid,err.message, err.stack);
  console.error('Connection error experianced');
});


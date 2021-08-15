import { Pool, PoolClient } from "pg";
const config = require('../config/constants');
const pool = new Pool (config.settings.pgDbConfig);
const log = require('../log');
module.exports.fnDbQuery = fnDbQuery;

async function fnDbQuery(methodName:string,queryText:string, queryParam:any) {
  let client:PoolClient ;
  let start;
  let qryResult;
  try {
    start = Date.now();
    client = await pool.connect();
    try {
      const qResult = await client.query(queryText, queryParam);
      const duration = Date.now() - start;
      let result:any = qResult;
      result["success"] = true;
      result.error = false;
      log.dblog("info",`${process.pid}, PSQL, ${methodName}, ${duration} ms, ${pool.idleCount} idle, ${pool.waitingCount} queue, ${pool.totalCount} total`);
      qryResult =  result;
    } catch (e) {
        log.dblog("error",`${process.pid}, PSQLQueryError, ${methodName}, ${e.message},${e.stack}`);
        qryResult = {success:false, qry_error: true, message: e.message};
    } finally {
      client.release();
    }
  } catch (e){
    log.dblog("error",`${process.pid}, PSQL, ${methodName}, ${e.message},${e.stack}`);
    console.log("PSQLConnectionErrorStack", e.stack);
    qryResult = {success:false, connection_error: true, message: e.message};
  } finally {
    return qryResult;
  }
}

pool.on('error', (err:Error) => {
  log.dblog("error",`${process.pid}, PSQL Pool error, ${err.message},${err.stack}`);
  console.error('Connection error experianced',err);
});


const { ClickHouse } = require('clickhouse');
const config = require('../config/constants');
const ch = new ClickHouse(config.settings.chConfig);
const log = require('../log');
module.exports.fnDbQuery = fnDbQuery;
async function fnDbQuery(methodName:string,queryText:string) {
    const r = await ch.query(queryText).toPromise();
    if (r.includes('Uncaught Exception')){
        return {success:false, rowCount:0, message:r}
    }
    else {
        return {success:true, rowCount:r.length, result:r}
    }
}
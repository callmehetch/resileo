const psqlAPM = require('./psqlAPM');
export class Initialize {
    constructor(){ };
    async checkDB(){
        let queryText = "SELECT now()";
        return await psqlAPM.fnDbQuery('checkDBAtLaunch', queryText, []);
    }

   async getPlan(){
        const queryText = "SELECT plan_id, plan_name, max_users,period_days, plan_price FROM plan WHERE NOT is_default AND NOT is_custom AND NOT is_deleted";
        return await psqlAPM.fnDbQuery('getPlan', queryText, []);
    }

    async getSectors(){
        const queryText = "SELECT ln.lookup_name_id, ln.lookup_name, ln.display_name FROM lookup_name ln JOIN lookup_type lt ON ln.lookup_type_id=lt.lookup_type_id WHERE NOT ln.is_deleted AND lt.lookup_type = 'Sector'";
        return await psqlAPM.fnDbQuery('getSectors', queryText, []);
    }

}
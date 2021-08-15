const psqlAPM = require('./psqlAPM');
export class QryModel {
    constructor(){ };
    async insQuery(param:any){
        const queryText = "INSERT INTO widgets (title, short_name, description, sector_id, tags, query_param, created_by ) VALUES ($1, $2, $3, $4, $5,$6,$7)";
        const queryParam = [param.title, param.short_name, param.description, param.sector_id, param.tags, param.query_param, param.userId];
        return await psqlAPM.fnDbQuery('qryModel.insQuery', queryText, queryParam);
    }

    async getAllWidgets(){
        const queryText = "SELECT w.widget_id, w.title, w.short_name, w.description, w.tags, w.query_param, w.is_ready, w.is_approved, w.approved_on, w.approved_by, la.full_name as approver, w.is_published, w.published_by, lp.full_name as publisher, w.created_by, w.created_on, lu.full_name as author FROM widgets w LEFT JOIN login_user lu ON lu.user_id=w.created_by LEFT JOIN login_user lp ON lp.user_id = w.published_by LEFT JOIN login_user la ON la.user_id = w.approved_by  ORDER BY w.modified_on desc";
        return await psqlAPM.fnDbQuery('qryModel.getAllWidgets', queryText, []);
    }

    async getMyWidgets(userId:number){
        const queryText = "SELECT w.widget_id, w.sector_id, ln.lookup_name sector, w.title, w.short_name, w.description, w.tags, w.query_param, w.is_ready, w.is_approved, w.approved_on, w.approved_by, la.full_name as approver, w.is_published, w.published_on, w.published_by, lp.full_name as publisher, w.created_by, w.created_on, lu.full_name as author FROM widgets w JOIN lookup_name ln ON ln.lookup_name_id = w.sector_id LEFT JOIN login_user lu ON lu.user_id=w.created_by LEFT JOIN login_user lp ON lp.user_id = w.published_by LEFT JOIN login_user la ON la.user_id = w.approved_by WHERE w.created_by = $1 OR w.approved_by = $1 OR w.published_by = $1 ORDER BY w.modified_on desc";
        const queryParam = [userId];
        return await psqlAPM.fnDbQuery('qryModel.getMyWidgets', queryText,queryParam);
    }

    async updStatusQuery(param:any){
        if (!param.is_approved && !param.is_published){
            const queryText = "UPDATE widgets SET title = $1, short_name = $2, description = $3, sector_id = $4, tags = $5, query_param =$6, modified_by = $7, is_ready = $8, is_approved = $9, is_published = $10, modified_on = now() WHERE widget_id = $11";
            const queryParam = [param.title, param.short_name, param.description, param.sector_id, param.tags, param.query_param, param.userId, param.is_ready, param.is_approved, param.is_published, param.widget_id];
            return await psqlAPM.fnDbQuery('qryModel.updStatusQuery', queryText,queryParam);
        }
        else if (param.is_approved && !param.is_published){
            const queryText = "UPDATE widgets SET title = $1, short_name = $2, description = $3, sector_id = $4, tags = $5, query_param =$6, modified_by = $7, is_ready = $8, is_approved = $9, is_published = $10, modified_on = now(), approved_on = now(), approved_by = $7 WHERE widget_id = $11";
            const queryParam = [param.title, param.short_name, param.description, param.sector_id, param.tags, param.query_param, param.userId, param.is_ready, param.is_approved, param.is_published, param.widget_id];
            return await psqlAPM.fnDbQuery('qryModel.updStatusQuery', queryText,queryParam);
        }
        else if (param.is_approved && param.is_published){
            const queryText = "UPDATE widgets SET title = $1, short_name = $2, description = $3, sector_id = $4, tags = $5, query_param =$6, modified_by = $7, is_ready = $8, is_approved = $9, is_published = $10, modified_on = now(), published_on = now(), published_by = $7 WHERE widget_id = $11";
            const queryParam = [param.title, param.short_name, param.description, param.sector_id, param.tags, param.query_param, param.userId, param.is_ready, param.is_approved, param.is_published, param.widget_id];
            return await psqlAPM.fnDbQuery('qryModel.updStatusQuery', queryText,queryParam);
        }
    }

    async updQuery(param:any){
        const queryText = "UPDATE widgets SET title = $1, short_name = $2, description = $3, sector_id = $4, tags = $5, query_param =$6, modified_by = $7, is_ready = false, is_approved = false, is_published = false, modified_on = now(), approved_on = null, approved_by = null, published_on = null, published_by = null WHERE widget_id = $8";
        const queryParam = [param.title, param.short_name, param.description, param.sector_id, param.tags, param.query_param, param.userId, param.widget_id];
        return await psqlAPM.fnDbQuery('qryModel.updQuery', queryText,queryParam);
    }

    async getSearchWidgets(search:string){
        const queryText = "SELECT w.widget_id, w.title, w.short_name, w.description, w.tags, w.query_param, w.is_ready, w.is_approved, w.approved_on, w.approved_by, la.full_name as approver, w.is_published, w.published_by, lp.full_name as publisher, w.created_by, w.created_on, lu.full_name as author FROM widgets w LEFT JOIN login_user lu ON lu.user_id=w.created_by LEFT JOIN login_user lp ON lp.user_id = w.published_by LEFT JOIN login_user la ON la.user_id = w.approved_by WHERE fts @@ to_tsquery($1)";
        const queryParam = [search];
        return await psqlAPM.fnDbQuery('qryModel.getSearchWidgets', queryText, queryParam);
    }
   
    async getPublishedSearchWidgets(search:string){
        const queryText = "SELECT w.widget_id, w.sector_id, w.title, w.short_name, w.description, w.tags, w.query_param, w.is_ready, w.is_approved, w.approved_on, w.approved_by, la.full_name as approver, w.is_published, w.published_by, lp.full_name as publisher, w.created_by, w.created_on, lu.full_name as author FROM widgets w JOIN lookup_name ln ON ln.lookup_name_id = w.sector_id LEFT JOIN login_user lu ON lu.user_id=w.created_by LEFT JOIN login_user lp ON lp.user_id = w.published_by LEFT JOIN login_user la ON la.user_id = w.approved_by WHERE is_published AND fts @@ to_tsquery($1)";
        const queryParam = [search];
        return await psqlAPM.fnDbQuery('qryModel.getPublishedSearchWidgets', queryText, queryParam);
    }

    async delWidget(widget_id:number){
        const queryText = "DELETE FROM widgets WHERE widget_id=$1";
        const queryParam = [widget_id];
        return await psqlAPM.fnDbQuery('qryModel.delWidget', queryText, queryParam);
    }

}
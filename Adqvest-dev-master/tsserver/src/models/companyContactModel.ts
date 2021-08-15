const psqlAPM = require('./psqlAPM');
export class CompanyContactModel {
    constructor(){ };

    async getAddressTypeList(){
        let queryText = "SELECT ln.lookup_name_id, ln.lookup_name FROM lookup_name ln JOIN lookup_type lt ON lt.lookup_type_id = ln.lookup_type_id WHERE lt.lookup_type = 'Address Type'";
        return await psqlAPM.fnDbQuery('getAddressTypeList', queryText, []);
    }

    async getParentCompanyList(){
        let queryText = "SELECT company_id, company_name FROM company WHERE parent_company_id is null";
        return await psqlAPM.fnDbQuery('getParentCompanyList', queryText, []);
    }

    async getCountryListForCompany(){
        let queryText = "SELECT id, name, iso3, iso2 FROM country";
        return await psqlAPM.fnDbQuery('getCountryListForCompany', queryText, []);
    }

    async getStateListForCompany(country_id:number){
        let queryText = "SELECT id, name, country_id FROM state WHERE country_id = $1";
        return await psqlAPM.fnDbQuery('getStateListForCompany', queryText, [country_id]);
    }

    async getCityListForCompany(state_id:number){
        let queryText = "SELECT id, name, state_id, country_id FROM city WHERE state_id = $1";
        return await psqlAPM.fnDbQuery('getCityListForCompany', queryText, [state_id]);
    }

    async getOfficeTypeList(){
        let queryText = "SELECT ln.lookup_name_id, ln.lookup_name FROM lookup_name ln JOIN lookup_type lt ON lt.lookup_type_id = ln.lookup_type_id WHERE lt.lookup_type = 'Company Type'";
        return await psqlAPM.fnDbQuery('getOfficeTypeList', queryText, []);
    }

    async getContact() {
        let queryText = "SELECT c.company_id, c.company_name, c.company_short_name, ln.lookup_name as company_type, c.address, ci.name as city, st.name as state, co.name as country, c.zip_code FROM company c JOIN lookup_name ln ON ln.lookup_name_id = c.company_type_id JOIN country co on co.id=c.country_id JOIN state st on st.id = c.state_id LEFT JOIN city ci on ci.id=c.city_id WHERE lookup_name IN ('Carrier')";
        let queryParam:any = [];
        return await psqlAPM.fnDbQuery('getCarrier', queryText, queryParam);
    }

    async insContact(param:any) {
        let queryText = "INSERT INTO contacts(contact_name,contact_type,division,position,company_id,email,phone_country_id,phone,mobile_country_id,mobile,wechatid,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning contact_id";
        let queryParam = [param.contact_name,param.contact_type,param.division,param.position,param.company_id,param.email,param.phone_country_id,param.phone,param.mobile_country_id,param.mobile,param.wechatid,param.userId];
        return await psqlAPM.fnDbQuery('insContact', queryText, queryParam);
    }

    async updContact(param:any){
        let queryText = "UPDATE contacts SET contact_name=$1,contact_type=$2,division=$3,position=$4,company_id=$5,email=$6,phone_country_id=$7,phone=$8,mobile_country_id=$9,mobile=$10,wechatid=$11, modified_by=$12, modified_on=now() WHERE contact_id = $13";
        let queryParam = [param.contact_name,param.contact_type,param.division,param.position,param.company_id,param.email,param.phone_country_id,param.phone,param.mobile_country_id,param.mobile,param.wechatid,param.userId, param.contact_id];
        return await psqlAPM.fnDbQuery('updContact', queryText, queryParam);
    }

    async insCompany(param:any) {
        let queryText = "INSERT INTO company (company_name, company_type_id, website_address, company_logo_path, created_by, is_deleted, created_on) VALUES ($1, $2, $3, $4, $5, false, now()) returning company_id";
        let queryParam = [param.CompanyName, param.OfficeType, param.CompanyWebsite, param.relativePath, param.UserId];
        return await psqlAPM.fnDbQuery('insCompany', queryText, queryParam);
    }

    async insCompanyAddress(param:any) {
        let addList = JSON.stringify(param.addressColl);
        let queryText = "INSERT INTO company_address (company_id, created_by, created_on, address_type_id, name, mobile, email, address, country_id, state_id, city_id, city, zip_code) SELECT " + param.CompanyId + ", " + param.UserId + ", now(),  * FROM jsonb_to_recordset('" + addList + "') as x(address_type_id int, name varchar, mobile varchar, email varchar, address varchar, country_id int, state_id int, city_id int, city varchar, zipcode int);";
        return await psqlAPM.fnDbQuery('insCompanyAddress', queryText, []);
    }

    async insTaxDetails(param:any) {
        let queryText = "INSERT INTO company_registrations (created_by, company_id, created_on, reg_name, reg_number) SELECT " + param.UserId + ", " + param.CompanyId + ", now(), * FROM jsonb_to_recordset('" + JSON.stringify(param.TaxDetails) + "') as x(reg_name varchar, reg_number int) "
        return await psqlAPM.fnDbQuery('insTaxDetails', queryText, []);
    }

    async updCompany(param:any) {
        let queryText = "UPDATE company SET company_name = $1, parent_company_id = $2, office_category_id = $3,  website_address = $5, company_logo_path = $6 WHERE company_id = $7";
        let queryParam = [param.CompanyName, param.ParentCompany, param.OfficeType, param.CompanyLocalName, param.CompanyWebsite, param.relativePath, param.CompanyId];
        return await psqlAPM.fnDbQuery('updCompany', queryText, queryParam);
    }

    async delCompanyAddress(param:any){
        let queryText = "DELETE FROM company_address where company_id = $1";
        let queryParam =  [param.CompanyId];
        return await psqlAPM.fnDbQuery('updTaxId', queryText, queryParam);
    }

    async getCompanyOfType(accountTypeId:number){
        let queryText = "SELECT c.company_id, c.company_name, c.company_short_name, c.company_type_id, ln.lookup_name as company_type, c.address, ci.name as city, st.name as state, co.name as country, c.zip_code FROM company c JOIN lookup_name ln ON ln.lookup_name_id = c.company_type_id JOIN country co on co.id=c.country_id JOIN state st on st.id = c.state_id LEFT JOIN city ci on ci.id=c.city_id WHERE c.company_type_id =$1";
        let queryParam = [accountTypeId];
        return await psqlAPM.fnDbQuery('getCompanyOfType', queryText, queryParam);
    }

    async getAdminCompany(){
        let queryText = "SELECT c.company_id, c.company_name, c.website_address, s.name as state, co.name as country , ci.name as city, ca.email, ca.mobile, cl.is_approve from company c JOIN company_address ca on c.company_id = ca.company_id LEFT JOIN country co on ca.country_id = co.country_id LEFT JOIN state s on ca.state_id = s.state_id LEFT JOIN city ci ON ca.city_id = ci.city_id LEFT JOIN company_license cl on cl.company_id = c.company_id  where c.created_by = 1;";
        return await psqlAPM.fnDbQuery('getAdminCompany', queryText, []);
    }

    async getUsersCompany(param:any){
        let queryText = "SELECT c.company_id, c.company_name, c.website_address, s.name as state, co.name as country , ci.name as city, ca.email, ca.mobile from company c JOIN company_address ca on c.company_id = ca.company_id LEFT JOIN country co on ca.country_id = co.id LEFT JOIN state s on ca.state_id = s.id LEFT JOIN city ci ON ca.city_id = ci.id where c.created_by = $1;";
        let queryParam = [param.UserId]
        return await psqlAPM.fnDbQuery('getUsersCompany', queryText, queryParam);
    }

    async getCompanyForId(companyId:number){
        const queryText = "SELECT c.company_id, c.company_name, c.company_short_name as short_name, ln.lookup_name as company_type, c.address, ci.name as city, st.name as state, co.name as country, c.zip_code FROM company c JOIN lookup_name ln ON ln.lookup_name_id = c.company_type_id JOIN country co on co.id=c.country_id JOIN state st on st.id = c.state_id LEFT JOIN city ci on ci.id=c.city_id WHERE c.company_id = $1";
        const queryParam = [companyId];
        return await psqlAPM.fnDbQuery('getCompanyForId', queryText, queryParam);
    };

    async insCompanyLicense(param:any){
        const queryText = "  INSERT INTO company_license(company_id, created_by, created_on, is_approve) VALUES ($1, $2, now(), false ) returning cl_id";
        const queryParam = [param.CompanyId, param.UserId];
        return await psqlAPM.fnDbQuery('insCompanyLicense', queryText, queryParam);
    };

    async insCompanyLicenseModule(param:any){
        let queryText = "INSERT INTO company_lic_module (cl_id, created_by, created_on, module_id) SELECT " + param.cl_id + ", " + param.UserId + ", now(), * FROM UNNEST( ARRAY[" + param.m_ids + "]::int[]) ";
        return await psqlAPM.fnDbQuery('insCompanyLicenseModule', queryText, []);
    };

    async getlicenseModules(param:any){
        let queryText = "select array_agg(clm.module_id) as m_d_ids , cl.cl_id from company_lic_module clm JOIN company_license cl on cl.cl_id = clm.cl_id where cl.company_id = $1 group by cl.cl_id";
        let queryParam = [param.CompanyId];
        return await psqlAPM.fnDbQuery('getlicenseModules', queryText, queryParam);
    };

    async delCompanyLicense(param:any){
        let queryText = "DELETE FROM company_lic_module where cl_id = $1 ";
        let queryParam = [param.cl_id];
        return await psqlAPM.fnDbQuery('delCompanyLicense', queryText, queryParam);
    };

}

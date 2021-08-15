import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ControlContainer, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { LoginHeaderComponent } from '../login-header/login-header.component';
import { MatSort } from '@angular/material/sort';
import { getLocaleDateFormat } from '@angular/common';

@Component({
  selector: 'app-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.css'],
})

export class QueryBuilderComponent implements OnInit {
	isLoading = false; checkOrg = false; 
	height: number = window.innerHeight;
	width: number = window.innerWidth;
	chartWidth:number =window.innerWidth -250;
	chartHt:number =window.innerHeight -250;
	userDet:any;
	selList:string='qb';
	isOpen = true;
	tableSel: string;
	tableColl = [];
	colColl = [];
	query: string;
	qryError:string;
	dispCols = [];
	tblResult = new MatTableDataSource([]);
	columnAndType = {};
	widget = {};
	chartType="table";
	chartTypeColl = ['line','area','vbar','hbar'];
	disp_col_json = {};
	chart_types_json = {};
	col_units_json = {};
	dataTypeColl= {};
	chartColumns = [];
	stack_cols:string;
	h_display: boolean = false;
	enable_yaxis: boolean = true;
	chartToDisplay = {};
	svgData: any;
	id:number;
	isGrid = true;
	savemenu = false;
	form:FormGroup;
	widgetColl = new MatTableDataSource([]);
	dispWidget = ["delete","edit","approve","title","sector", "status","author","created_on","approver","publisher", "published_on"];
	sectorColl = [];
	chart = {};

	@ViewChild(MatSort, { static: false }) sort: MatSort;
	
	constructor(
		private router: Router,
		private authService: AuthenticationService,
		private reusable: ReusableComponent,
		private formBuilder: FormBuilder,
		public dialog: MatDialog,
		private loginHeader: LoginHeaderComponent,
	) {}

	ngOnInit() {
		this.userDet = JSON.parse(this.reusable.decrypt(sessionStorage.getItem('usr')));
		this.reusable.screenChange.subscribe(res=>{
			this.height = res.height;
			this.width = res.width;
			this.chartHt = res.height-250;
			this.chartWidth = res.width-250;
		});
		if (!this.userDet.is_admin){
			this.router.navigate(['/home']);
		}
		this.reusable.search.subscribe(qrySearch=>{
			console.log("search", qrySearch);
			if (qrySearch != undefined) {
				if (qrySearch?.length > 0)	this.getSearchResults(qrySearch);
				else this.getMyWidgets();
			}
			else {
				this.getMyWidgets();
			}
		})
		this.getSectors();
	}

	async getSearchResults(search){
		let strSearch = search.replace(/ /g,' & ');
		console.log(strSearch);
		let param = {
			search: strSearch
		}
		let result = await this.authService.getSearchWidgets({param:this.reusable.encrypt(JSON.stringify(param))});
		if (result.success){
			this.widgetColl = new MatTableDataSource(result.result);
			this.widgetColl.sort = this.sort;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async getMyWidgets(){
		let result = await this.authService.getMyWidgets();
		if (result.success){
			this.widgetColl = new MatTableDataSource(result.result);
			this.widgetColl.sort = this.sort;
			console.log(this.widgetColl.data);
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	onChange(event){
		console.log(event);
	}

	async editChart(chart){
		this.chart = chart;
		this.isLoading = true;
		this.isGrid = false;
		let param = chart.query_param;
		this.widget = param;
		this.query = param.query;
		this.widget["data"] = await this.getData(param.query);
		let row = this.widget['data'][0];
		this.dispCols = [];
		Object.keys(row).map((col,ix) => {
			this.dispCols.push(col);
		});
		this.tblResult = new MatTableDataSource(this.widget["data"]);
		this.tblResult.sort = this.sort;
		if (param.root_chart_type =='table'){
			this.chartType = 'table';
		}
		else {
			this.chartType = param.chart_types_json[Object.keys(param.chart_types_json)[0]];
			this.drawChart();
		}
		this.columnAndType = {};
		let columns = Object.keys(param.col_units_json);
		columns.map(col => {
			this.columnAndType[col] = {display_name: param["disp_col_json"][col], col_type: param["data_type_coll"][col],col_unit: param["col_units_json"][col],chart_type:param["chart_types_json"]};
		});
		// this.updConfigReturn({dispColumns: this.columnAndType, chart:this.widget})
		this.createForm();
		this.form.get("Sector").setValue(this.sectorColl.find(x=>x.lookup_name_id==this.chart["sector_id"]));
		console.log("edit",this.chart);
	}

	async getData(query){
		let param = {
			queryText: query
		}
		let result = await this.getChQuery(param);
		this.isLoading = false;
		if (result.success){
			return result.result;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async getChQuery(param){
		return await this.authService.clickhouseQuery({param:this.reusable.encrypt(JSON.stringify(param))});
	}

	async getTables(){
		let param = {
			queryText : "SHOW tables;"
		};
		let result = await this.getChQuery(param);
		if (result.success){
			console.log(result.result)
			this.tableColl = result.result;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async getColDef(){
		let param = {
			queryText: "SELECT name, type FROM system.columns WHERE table='"+this.tableSel+"'"
		}
		let result = await this.getChQuery(param);
		if (result.success){
			this.colColl = result.result;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	getList(event){
		console.log(event);
	}

	validateQuery(){
		if (this.query == undefined) return;
		let val = this.query.toLowerCase();
		if (val.startsWith('select') || val.startsWith('with') ) {
			this.qryError = undefined;
		}
		else {
			this.qryError = "Must start with select or with";
		}
	}

	async execQry(){
		let param = {
			queryText: this.query
		}
		let result = await this.getChQuery(param);
		this.isLoading = false;
		if (result.success){
			if (result.result.length > 0){
				let row = result.result[0];
				this.tblResult.data= [];
				this.dispCols = [];
				this.columnAndType = {};
				this.dataTypeColl = {};
				this.disp_col_json = {};
				this.chart_types_json = {};
				this.col_units_json = {};
				Object.keys(row).map((col,ix) => {
					this.dispCols.push(col);
					let colType;
					if (row[col] != undefined && row[col].toString().length==13){
						colType = 'datetime';
					}
					else {
						colType = typeof(row[col]);
					}
					this.columnAndType[col] = {display_name: col, col_type: colType};
					this.dataTypeColl[col] = colType;
					this.disp_col_json[col] = col.replace("_"," ");
					this.col_units_json[col] = colType;
					if (ix!=0){
						this.chart_types_json[col] = this.chartType=='table'?'table':this.chartType;
					}
				})
				this.tblResult = new MatTableDataSource(result.result);
				this.setChartParam(result.result);
			}
			else {
				this.tblResult = new MatTableDataSource([]);
				this.dispCols = [];
			}
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	setChartParam(data){
		this.id = Math.floor(Math.random()*100+10);
		Object.keys(data[0]).map((col,i)=>{
			if (i != 0){
				this.chart_types_json[col] = this.chartType;
			} else {
				if (this.columnAndType[col].col_type == 'datetime') this.widget['xaxis_time_scale'] = true;
				else this.widget['xaxis_time_scale'] = false;
			}
		});
		this.widget['stack_cols'] = undefined;
		this.widget['enable_yaxis'] = true;
		this.widget['disp_col_json'] = this.disp_col_json;
		this.widget['chart_types_json'] = this.chart_types_json;
		this.widget["col_units_json"] = this.col_units_json;
		this.widget['data_type_coll'] = this.dataTypeColl;
		this.widget["h_display"] = this.h_display;
		this.widget['enable_yaxis'] = this.enable_yaxis;
		this.widget['root_chart_type'] = this.chartType=='table'?'table':'others';
		this.widget['query'] = this.query;
		this.widget['data'] = data;
		this.widget["bar_type"] = undefined;
		if (this.chartType != 'table'){
			this.drawChart();
		}
		this.chart["query_param"] = this.widget;
		// this.chart["title"] =  undefined;
		// this.chart["short_name"] = undefined;
		// this.chart["description"] = undefined;
		// this.chart["tags"] = undefined;
		// this.chart["sector_id"] = undefined;
		this.createForm();
		this.form.get("Sector").setValue(this.sectorColl.find(x=>x.lookup_name_id==this.chart["sector_id"]));
	}

	drawChart(){
		if (this.widget['xaxis_time_scale'] == undefined){
			Object.keys(this.widget['data'][0]).map((col,i)=>{
				if (i != 0){
					this.chart_types_json[col] = this.chartType;
				} else {
					if (this.columnAndType[col].col_type == 'datetime') this.widget['xaxis_time_scale'] = true;
					else this.widget['xaxis_time_scale'] = false;
				}
			});
		}
		this.chartToDisplay = Object.assign({},this.widget);
		this.chartToDisplay["root_chart_type"]=this.widget["root_chart_type"];
		this.svgData = JSON.parse(JSON.stringify(this.widget['data']));
		console.log("drawchart",this.chartToDisplay)
	}

	openConfigColumn(){
		const dialogRef = this.dialog.open(ConfigColumnDialog, {
		  width: "80%",
		  data: {dispColumns: this.columnAndType, chart:this.widget}
		});
		dialogRef.afterClosed().subscribe(result => {
		  if (result != undefined){
			  this.updConfigReturn(result);
	 	  }
		});
	}

	updConfigReturn(result){
		this.dataTypeColl = {};
		// this.chart_types_json = {};
		this.col_units_json = {};
		this.disp_col_json = {};
		this.columnAndType = result.dispColumns;
		this.chartColumns = [];
		this.stack_cols = "";
		let columns = Object.keys(result.dispColumns);
		columns.map((column,ix) => {
		  this.dataTypeColl[column] = this.columnAndType[column]["col_type"];
		  if (this.widget['dd_param'] == undefined) this.widget['dd_param'] = {};
		  this.widget['dd_param'][column] = this.columnAndType[column].dd_param;
		  this.disp_col_json[column] = this.columnAndType[column].display_name;
		  this.col_units_json[column] = this.columnAndType[column].col_unit;
		//   this.chart_types_json[column] = this.columnAndType[column].chart_type;
		});
		if (this.stack_cols.length > 0){
		  if (this.stack_cols.split(',').length == 1){
			this.stack_cols = undefined;
		  }
		}
		this.setChartParam(this.widget["data"]);
		console.log("updConfig", this.chart_types_json);
	}

	formatData(dataSet){
		dataSet.map(row => {
		  let keys = Object.keys(row);
		  keys.map(key => {
			let type = this.dataTypeColl[key];
			if (type != undefined) {
			  if(type.includes('timestamp') || type == 'datetime' || type == 'date'){
				row[key+"_format"] = new Date(row[key]).getTime().toString() != 'NaN' ? new Date(row[key]).getTime(): row[key];
			  } else if (type.includes('msToTime')){
				row[key+"_format"] = this.reusable.convertMstoTime(row[key]);
			  } else if (type.includes('secToTime')){
				row[key+"_format"] = this.reusable.convertSecToTime(row[key]);
			  } else if (type.includes('INR')){
				row[key+"_format"] = this.reusable.convertToIndiaSystem(row[key]);
			  } else if (type == 'month'){
				let ret = this.reusable.getMonthShortName(row[key]);
				row[key+"_format"] = ret;
			  }
			}
		  })
		})
	}

	goBack(){
		this.router.navigate(['/home/admin']);
	}

	async getSectors(){
		let result = await this.authService.getSectors();
		if (result.success){
			this.sectorColl = result.result;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async save(){
		let widgetParam = JSON.parse(JSON.stringify(this.widget));
		console.log(widgetParam)
		delete widgetParam['data'];
		if (this.chart["widget_id"] == undefined){
			let param = {
				title: this.form.get("Name").value,
				short_name: this.form.get("ShortName").value,
				description: this.form.get("Description").value,
				sector_id: this.form.get("Sector").value.lookup_name_id,
				tags: this.form.get("Tags").value,
				query_param: JSON.stringify(widgetParam),
			}
			let result = await this.authService.insQuery({param: this.reusable.encrypt(JSON.stringify(param))});
			this.isLoading = false;
			if (result.success){
				this.reusable.openAlertMsg("Succesfully Widget Added","info");
				this.resetFields();
				this.getMyWidgets();
				this.isGrid = true;
			}
			else {
				this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
			}
		}
		else {
			let param = {
				widget_id: this.chart["widget_id"],
				title: this.form.get("Name").value,
				short_name: this.form.get("ShortName").value,
				description: this.form.get("Description").value,
				sector_id: this.form.get("Sector").value.lookup_name_id,
				tags: this.form.get("Tags").value,
				query_param: JSON.stringify(widgetParam),
			}
			let result = await this.authService.updQuery({param: this.reusable.encrypt(JSON.stringify(param))});
			this.isLoading = false;
			if (result.success){
				this.reusable.openAlertMsg("Succesfully Widget Updated","info");
				this.resetFields();
				this.getMyWidgets();
				this.isGrid = true;
			}
			else {
				this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
			}

		}
	}

	createForm(){
		this.form = this.formBuilder.group({
			Sector:['',Validators.compose([
				Validators.required,
			])],
			Name:[this.chart["title"],Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(150),
			])],
			ShortName:[this.chart["short_name"],Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(50),
			])],
			Description:[this.chart["description"],Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(300)
			])],
			Tags:[this.chart["tags"],Validators.compose([
				Validators.required,
			])]
		})
	}

	getErrorMessage(control, controlName) {
		let msg ='';
		msg += control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName =='Name') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 150 char length. ': ''}
		if (controlName =='ShortName') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 50 char length. ': ''}
		if (controlName =='Description') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 300 char length. ': ''}
		return msg;
	}

	resetFields(){
		this.query = undefined;
		this.qryError = undefined;
		this.dispCols = [];
		this.tblResult = new MatTableDataSource([]);
		this.columnAndType = {};
		this.widget = {};
		this.chartType="table";
		this.chartTypeColl = ['line','area','vbar','hbar'];
		this.disp_col_json = {};
		this.chart_types_json = {};
		this.col_units_json = {};
		this.dataTypeColl= {};
		this.chartColumns = [];
		this.stack_cols = undefined;
		this.h_display = false;
		this.enable_yaxis = true;
		this.chartToDisplay = {};
		this.svgData = undefined;
		this.id = undefined;
		this.form.reset();
		this.chart = undefined;
	}

	openViewChart(chart, nxtAction){
		const dialogRef = this.dialog.open(ViewChartDialog, {
		  width: "80%",
		  data: {chart:chart, action:nxtAction}
		});
		dialogRef.afterClosed().subscribe(result => {
			this.getMyWidgets();
		});
	}

	async delChart(ele){
		let conf = confirm("On deleting, Widget will be removed from all the user's Dashboard,Are you sure you want to delete this chart?")
		if (!conf) return;
		let param = {
			widget_id: ele.widget_id
		}
		let result = await this.authService.delWidget({param: this.reusable.encrypt(JSON.stringify(param))});
		if (result.success){
			this.reusable.openAlertMsg("Widget successfully deleted","info");
			this.getMyWidgets();
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}
}

/* ColumnConfigure to Custom Query */
@Component({
	selector: 'config-column',
	templateUrl: 'config-column-dialog.html',
})

export class ConfigColumnDialog implements OnInit {
	title: string;
	isLoading: boolean = false;
	colTypeColl = ['string', 'number', 'datetime', 'object', 'currency'];
	colUnitColl = {string:['text'], number:['number','%','sec','min','hour','date','month','year','count'], currency:['INR','USD'],datetime:['datetime','date','year','month','monthyear','time'], object:['text','json','img']};
	chartType = ['line', 'area', 'vbar','hidden','toolTip'];
	paramColl = ['none','param1', 'param2', 'param3', 'param4', 'param5'];
	colUnits
	form = this.fb.group({
	  ColDef: this.fb.array([]),
	});
  
	constructor(
	  public dialogRef: MatDialogRef<ConfigColumnDialog>,
	  @Inject(MAT_DIALOG_DATA) public data:any,
	  private fb: FormBuilder,
	  private reusable: ReusableComponent
	) { }
  
	ngOnInit(){
	  if (this.data.chart.root_chart_type != 'others'){
		this.chartType = [];
		this.chartType.push(this.data.chart.root_chart_type, 'hidden', 'toolTip');
	  }
	  let dCols = Object.keys(this.data.dispColumns);
	  dCols.map((column) => {
		let dt = this.data.dispColumns[column].col_type.includes("string") ? 'string' : this.data.dispColumns[column].col_type.includes("number") ? 'number' :this.data.dispColumns[column].col_type.includes("datetime")?'datetime': 'string';
		let unit = this.colUnitColl[dt][this.colUnitColl[dt].indexOf(this.data.dispColumns[column].col_unit)];
		if (unit == undefined){
			unit = this.colUnitColl[dt][0];
		}
		console.log("unit", unit, )
		let type = this.colTypeColl[this.colTypeColl.indexOf(this.data.dispColumns[column].col_type)];
		let param = this.paramColl[this.paramColl.indexOf('none')];
		let dispName = this.data.dispColumns[column].display_name;
		this.addArrColDef(column, dispName, type, unit, param)
	  })
	}
  
	onChangeParam(param, idx){
	  let colLength = this.colDef.length;
	  for (let i = 0; i<colLength; i++){
		if (i != idx && this.colDef.controls[i].get('Param').value != "none"){
		  if (param == this.colDef.controls[i].get('Param').value){
			param = this.paramColl[0];
			this.reusable.openAlertMsg(param+" is already in use", "info");
		  }
		}
	  }
	}
  
	get colDef(){
	  return this.form.get('ColDef') as FormArray;
	}
  
	addArrColDef(defaultName:string, defaultDispName:string, colType:string, colUnit:string, param:string){
	  if (this.colDef.length ==0){
		this.colDef.push(this.fb.group({
		  ColName:[{value:defaultName,disabled:true}, Validators.required],
		  DispName:[defaultDispName, Validators.required],
		  ColType: [colType, Validators.required],
		  ColUnit: [colUnit, Validators.required],
		  Param:[param]
		}));
	  } else {
		this.colDef.push(this.fb.group({
		  ColName:[{value:defaultName,disabled:true}, Validators.required],
		  DispName:[defaultDispName, Validators.required],
		  ColType: [colType, Validators.required],
		  ColUnit: [colUnit, Validators.required],
		  Param:[param]
		}));
	  }
	}
  
	removeColDefElement(idx){
	  this.colDef.removeAt(idx);
	}
  
	saveColUnits(){
	  let colLength = this.colDef.length;
	  this.data.dispColumns = {};
	  for (let i = 0; i < colLength; i++){
		this.data.dispColumns[this.colDef.controls[i].get('ColName').value] = {display_name:this.colDef.controls[i].get('DispName').value, col_type: this.colDef.controls[i].get('ColType').value, col_unit: this.colDef.controls[i].get('ColUnit').value, dd_param:this.colDef.controls[i].get('Param').value};
	  }
	  this.dialogRef.close(this.data);
	  console.log(this.data.dispColumns);
	}
  
	onClose(){
	  this.dialogRef.close();
	}

}

/* View of Chart for approval or publishing */
@Component({
	selector: 'view-chart',
	templateUrl: 'view-chart-dialog.html',
})

export class ViewChartDialog implements OnInit {
	nxtAction:string;
	width: number;
	height:number =  400;
	theme = "light";
	isLoading = false;
	chartToDisplay = {};
	svgData: any;
	dispCols = [];
	tblResult = new MatTableDataSource([]);
	chartType:string;
	form: FormGroup;
	isSaveMode = false;
	sectorColl = [];

	@ViewChild(MatSort, { static: false }) sort: MatSort;

	constructor(
		public dialogRef: MatDialogRef<ViewChartDialog>,
		@Inject(MAT_DIALOG_DATA) public data:any,
		private reusable: ReusableComponent,
		private authService: AuthenticationService,
		private formBuilder: FormBuilder,
	) { }

	ngOnInit(){
		this.isLoading = true;
		this.nxtAction = this.data.action;
		this.getDialogWidth();
		this.getData(this.data.chart.query_param.query);
	}

	async getData(query){
		let param = {
			queryText: query
		}
		this.data.chart.query_param["data"] = await this.getChQuery(param);
		console.log(this.data.chart.query_param);
		this.tblResult = new MatTableDataSource(this.data.chart.query_param["data"]);
		this.tblResult.sort = this.sort;
		let row = this.data.chart.query_param['data'][0];
		this.dispCols = [];
		Object.keys(row).map((col,ix) => {
			this.dispCols.push(col);
		});
		this.chartToDisplay = Object.assign({},this.data.chart.query_param)
		this.svgData = JSON.parse(JSON.stringify(this.data.chart.query_param['data']));
	}

	drawChart(){
		Object.keys(this.data.chart.query_param['data'][0]).map((col,i)=>{
			if (i != 0){
				this.data.chart.query_param["chart_types_json"][col] = this.chartType;
			}
		});
		this.chartToDisplay = Object.assign({},this.data.chart.query_param)
		this.svgData = JSON.parse(JSON.stringify(this.data.chart.query_param['data']));

	}

	async getChQuery(param){
		let result =  await this.authService.clickhouseQuery({param:this.reusable.encrypt(JSON.stringify(param))});
		this.isLoading = false;
		if (result.success){
			return result.result;
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
			return null;
		}
	}
  
	getDialogWidth(){
		let element = document.querySelector("#viewchartdialog");
		this.width = element["offsetWidth"];
		console.log(element, element["offsetWidth"], element["clientWidth"], element["innerWidth"], element["offsetHeight"] );
	}
	onClose(){
		this.dialogRef.close();
	}

  	changeStatus(nxtAction){
		  this.isSaveMode = true;
		  this.createForm();
		  this.getSectors();
	}

	fromD3chart(event){
		console.log(event)

	}

	createForm(){
		this.form = this.formBuilder.group({
			Sector:['',Validators.compose([
				Validators.required,
			])],
			Name:[this.data.chart["title"],Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(150),
			])],
			ShortName:[this.data.chart["short_name"],Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(50),
			])],
			Description:[this.data.chart["description"],Validators.compose([
				Validators.required,
				Validators.minLength(3),
				Validators.maxLength(300)
			])],
			Tags:[this.data.chart["tags"]]
		})
	}

	getErrorMessage(control, controlName) {
		let msg ='';
		msg += control.hasError('required') ? 'Field Cannot be empty. ' :'';
		if (controlName =='Name') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 150 char length. ': ''}
		if (controlName =='ShortName') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 50 char length. ': ''}
		if (controlName =='Description') {msg += (control.errors.minlength || control.errors.maxlength) ? 'Must be between 3 & 300 char length. ': ''}
		return msg;
	}

	async getSectors(){
		let result = await this.authService.getSectors();
		if (result.success){
			this.sectorColl = result.result;
			this.form.get("Sector").setValue(this.sectorColl.find(x=>x.lookup_name_id==this.data.chart["sector_id"]));
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}

	async save(){
		let widgetParam = JSON.parse(JSON.stringify(this.data.chart.query_param));
		delete widgetParam['data'];
		let param = {
			widget_id: this.data.chart.widget_id,
			title: this.form.get("Name").value,
			short_name: this.form.get("ShortName").value,
			description: this.form.get("Description").value,
			sector_id: this.form.get("Sector").value.lookup_name_id,
			tags: this.form.get("Tags").value,
			query_param: JSON.stringify(widgetParam),
			is_ready: true,
			is_approved: this.nxtAction == "ready" ? false : true,
			is_published: this.nxtAction == "approve" || this.nxtAction == "ready"  ? false : true
		}
		console.log(param);
		let result = await this.authService.updStatusQuery({param: this.reusable.encrypt(JSON.stringify(param))});
		this.isLoading = false;
		if (result.success){
			this.reusable.openAlertMsg("Succesfully Widget Updated","info");
			this.onClose();
		}
		else {
			this.reusable.openAlertMsg(this.authService.invalidSession(result),"error");
		}
	}
}
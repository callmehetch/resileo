import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ControlContainer, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { LoginHeaderComponent } from '../login-header/login-header.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})

export class AdminComponent implements OnInit {
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
		this.getTables();
	}

	qryBuilder(){
		this.router.navigate(['/home/admin/qrybuilder']);
	}
	async getChQuery(param){
		return await this.authService.clickhouseQuery({param:this.reusable.encrypt(JSON.stringify(param))});
	}

	async getTables(){
		let param = {
			queryText : "show Tables;"
		};
		let result = await this.getChQuery(param);
		console.log(result);
		if (result.success){
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
		console.log(result);
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
		// let id = document.getElementById("idQuery");
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
		console.log(this.query);
		let param = {
			queryText: this.query
		}
		let result = await this.getChQuery(param);
		console.log(result);
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
					this.chart_types_json[col] = 'line';
					if (ix!=0){
					}
				})
				this.tblResult = new MatTableDataSource(result.result);
				this.widget["data"] = result.result;
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

	drawChart(data){
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
		this.widget['root_chart_type'] = 'others';
		this.widget['query'] = this.query;
		this.widget['data'] = data;
		this.widget["bar_type"] = undefined;
		this.chartToDisplay = Object.assign({},this.widget)
		this.svgData = data;
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
		this.chart_types_json = {};
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
		  this.chart_types_json[column] = this.columnAndType[column].chart_type;
		if(ix != 0){
			// if (column.chart_type == "hbar" || column.chart_type == "vbar") {
			//   if (this.stack_cols.length != 0) this.stack_cols += ","
			//   this.stack_cols += column.column_name;
			// }
		  } else {
			// if (result.chart.root_chart_type == "stamp"){
			//   this.chart_types_json[column.column_name] = column.chart_type;
			//   this.col_units_json[column.column_name] = column.col_unit;
			// }
		  }
		});
		if (this.stack_cols.length > 0){
		  if (this.stack_cols.split(',').length == 1){
			this.stack_cols = undefined;
		  }
		}
		this.widget["data_type_coll"] = this.dataTypeColl;
		if (this.widget["root_chart_type"] == "table") this.formatData(this.widget["data"]);
		this.widget['chart_types_json'] = this.chart_types_json;
		this.widget['col_units_json'] = this.col_units_json;
		this.widget['disp_col_json'] = this.disp_col_json;
		// this.chartParamForSave = JSON.parse(JSON.stringify(this.widget));
		this.chartToDisplay = this.widget;
		this.drawChart(this.widget["data"]);
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
		let unit = this.colUnitColl[dt][0];
		console.log("unit", unit, )
		let type = this.colTypeColl[this.colTypeColl.indexOf(this.data.dispColumns[column].col_type)];
		let param = this.paramColl[this.paramColl.indexOf('none')];
		let dispName = this.data.dispColumns[column].display_name;
		this.addArrColDef(column, dispName, type, unit, param)
	  })
	}
  
	getColUnitColl(){

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

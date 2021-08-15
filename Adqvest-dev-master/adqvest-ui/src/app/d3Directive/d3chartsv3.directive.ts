import { Directive, ElementRef, Input, OnChanges, HostListener, OnDestroy, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
// import * as _ from 'lodash';
import { keys as _keys,flatten as _flatten, invertBy as _invertBy, toPairs as _toPairs, indexOf as _indexOf  } from 'lodash';
import { AuthenticationService } from '../_services/index';
import { ReusableComponent } from '../reusable/reusable.component';
import { environment } from '../../environments/environment';

@Directive({
  selector: '[appD3chartsv3]',
  outputs: ['onChartOutput']
})
export class D3chartsv3Directive {
  @Input('chartdata') chartDataIp:any;
  @Input('width') parentWidth:number;
  @Input('height') parentHt:number;
  @Input('id') idx:number;
  @Input('chartType') rootChartType:String;
  @Input('editMode') editMode:boolean;
  @Input('changeData') changeData:any;
  @Input('theme') theme:string;
  
  onChartOutput = new EventEmitter();
  aryColors = d3[environment.d3ColorScheme];
  constants = {Currency: 'inr', NumberFormat: 'crore'}; //supported values are Crore, Million, thosands if not given will take thousands as default
  chartData:any;
  margin; width:number; height:number;
  //Data related settings parentWidth:number; parentHt:number;
  totalRows; data=[]; allColCollection; dispColJson; chartTypeCollection; chartUnitJson; chartTypeKeys; colCollection = [];
  chartColCollection;
  //chart variables & for legend placement calculation
  conValue=1; outUnit; dispUnit ; chartUnit; dataMinMax=[]; 
  charPixWidthConValue = 6.5; //for font 10
  charPixHtConValue = 14; //for font 12
  legendWidthTotal = 5; lineWidth = 25; legendLine =1; nameMaxLength; valMaxLength; hDisplayLabel;
  //Axis and time scale settings
  timeFormat; tickFormat; axisLabel; xAxisScale; yAxisScale; xAxisRotate=0; axisLabelxPos; enableYaxis
  xAxisLabel; yAxisLabel; xaxisLabelWidth; x; y; xAxis; yAxis;  timeDiff;
  // fnt = "Open Sans";
  fnt = "Lato";
  svg; svg1;
  barColor;
  unitGrp = {bytes:"bytes",bps:"bytes",kbps:"bytes",mbps:"bytes",gbps:"bytes",kb:"bytes",mb:"bytes",gb:"bytes",ms:"time",sec:"time",min:"time",hour:"time",count:"number",number:"number",numeric:"number",inr:"inr",usd:"usd",lakh:"number",crore:"number",million:"number",billion:"number"};
  nonBaseUnitConverter = {kbps:1024, mbps:1024*1024,kb:1024, mb:1024*1024,gb:1024*1024*1024,sec:1000,min:1000*60,hour:1000*60*60, lakh:100000,crore:10000000,million:1000000,billion:100000000};
  baseUnitMapping = {kbps:"bytes", mbps:"bytes",kb:"bytes", mb:"bytes",gb:"bytes",sec:"ms",min:"ms",hour:"ms", lakh:"number",crore:"number",million:"number",billion:"number"};

  constructor(
    private element: ElementRef,
    private authService: AuthenticationService,
    private reusable: ReusableComponent
  ){
  } 

  ngOnInit(){
  }

  ngOnDestroy(){
    this.chartData=null; this.parentWidth = null; this.parentHt = null; this.idx = null; this.rootChartType = null;
    this.totalRows=null; this.data=null; this.allColCollection=null; this.chartTypeCollection=null; 
    this.chartUnitJson=null; this.chartTypeKeys=null; this.colCollection=null; this.chartColCollection =null;
    this.timeFormat =null; this.tickFormat=null; this.axisLabel=null; this.xAxisScale=null; this.yAxisScale=null; 
    this.xAxisRotate=null; this.axisLabelxPos=null; this.enableYaxis=null;this.xAxisLabel=null; this.yAxisLabel=null; 
    this.xaxisLabelWidth=null; this.x=null; this.y=null; this.xAxis=null; this.yAxis=null; 
  }

  ngOnChanges(){
    this.chartData = JSON.parse(JSON.stringify(this.chartDataIp));
    // console.log(this.chartData);
    if(this.parentWidth == 9999 ){
     this.parentWidth = this.element.nativeElement.offsetParent.clientWidth - Math.floor(this.element.nativeElement.offsetParent.clientWidth*5/100);
      // this.parentWidth = this.element.nativeElement.parentElement.clientWidth - Math.floor(this.element.nativeElement.parentElement.clientWidth*5/100);
      this.parentHt = this.parentHt == 9999 ? 500 : this.parentHt ;
      this.dataMinMax=[];
      this.drawCharts(); 
    } else {
      this.dataMinMax=[];
      this.drawCharts(); 
    }
    if (this.chartData["stack_cols"] == undefined){
      this.chartData["stack_cols"] = [];
    }
    if (this.chartData['stackData'] == undefined){
      this.chartData['stackData'] = [];
    }
    d3.select(this.element.nativeElement).select('svg').remove();
    d3.select(this.element.nativeElement).select('.noDataText').remove();
    d3.select('body').selectAll('#tooltip'+this.idx).remove();
  }

  async drawCharts(){
    this.chartColCollection =[]; 
    if ("error" in this.chartData){
      console.log("error found in data retrieval, please check the server log");
      return false;
    }
    if (this.chartData.data.length == 0) {
      return false;
    }
    if (this.chartData.xaxis_time_scale){
      //sorting by asscending order using Type script itself
      this.chartData.data = this.chartData.data.sort((a,b)=> {
        return (a[Object.keys(a)[0]]>b[Object.keys(b)[0]] ? 1 : -1);
      });
    }
    await this.varSetting();
    let chartTypeArr = [... new Set(Object.values(this.chartData["chart_types_json"]))];
    //Data preparation which converts the value to human readable. adding legend and its position.
    await this.groupSameUnitCharts();
    // await this.dataPreparation();
  
    if (this.chartData.stack_cols.length > 0 && (this.chartData.root_chart_type == 'hbar' || chartTypeArr.indexOf('vbar') > -1)){
      if (this.chartData.bar_type == "stack") await this.processDataStackChart();
    }
    //Getting the first column label name and making it as axis label.
    //setting datetime format if x axis is time scale. 
    await this.settingDateFormat();
    if (this.dataMinMax[0]==0 && this.dataMinMax[1]==0){
      this.noChartText();
      return;
    }
    if (this.rootChartType == 'others'){
      //setting ordinal or linear scale for x and y axis according to chart type
      await this.initializeAxis();
      await this.plotChart(this.x, this.y);  
    } else if (this.rootChartType != 'hbar') {
      if (this.rootChartType == 'pie' ||  this.rootChartType =='donut')
        this.pie(this.data, this.chartColCollection[0]);
      else
        this.pie3d(this.data, this.chartColCollection[0]);
    } else {
      await this.initializeAxis();
      if (this.chartData.stack_cols.length == 0){
        //hbar without stack
        await this.plotChart(this.x, this.y);
      } else {
        if (this.chartData.bar_type == "stack"){
          this.plotHbarStack(this.x, this.y)
        } else {
          this.plotHbarGroup(this.x, this.y);
        }
        this.chartColCollection.map((colElement, i) => {
          let Data = this.chartData;
          let legendText = Data[colElement + "_legend_text"];
          let legendLineData = Data[colElement + "_legend_line"];
          let legendX = Data[colElement + "_legend_start_pos_x"];
          let cnt = i.toString();
          this.callLegend(this.barColor(colElement+"_hunit"),cnt,legendLineData,legendX,legendText);
        })
      }
    }
  }

  async plotChart(xScale,yScale) {
    let stackBarPlotted = false;
    this.chartColCollection.map((colElement, i) => {
      let Data = this.chartData;
      let chartType = Data.chart_types_json[colElement];
      let legendText = Data[colElement + "_legend_text"];
      let legendLineData = Data[colElement + "_legend_line"];
      let legendX = Data[colElement + "_legend_start_pos_x"];
      let cnt = i.toString();
      let circleRadius = Data.data.length > 5 ? 1 : 3;
      let dataMaximum = 1;
      if (chartType != 'pie' && chartType != 'donut' && chartType != 'pie3d' && chartType !='donut3d')
        dataMaximum = this.dataMinMax[1];
      if (Data.data.length > 0 && dataMaximum > 0) {
        if (chartType == 'area') {
            let iid = +this.idx+i;
            let randNum = iid%(this.aryColors.length);
            this.area(Data.data, colElement + "_hunit", randNum, chartType, cnt, circleRadius,xScale,yScale);
            this.line(Data.data, colElement + "_hunit", randNum,0,50,50,false,chartType,cnt,circleRadius,xScale,yScale);
            this.callLegend(randNum,cnt,legendLineData,legendX,legendText);
        }
        else if (chartType == 'line'){
          if (colElement == Data["col_critical"]){
            this.line(Data.data, colElement + "_hunit", 2, 3, 100, 50, true, chartType, cnt, circleRadius,xScale,yScale);
            this.callLegend(11,cnt,legendLineData,legendX,legendText);
          } else if (colElement == Data["col_warning"]){
            this.line(Data.data, colElement + "_hunit", 3, 3, 100, 25, true, chartType, cnt, circleRadius,xScale,yScale);
            this.callLegend(10,cnt,legendLineData,legendX,legendText);
          } else {
            let iid = +this.idx+i;
            let randNum = iid%(this.aryColors.length);
            this.line(Data.data,colElement+"_hunit",randNum,0,50,50,true,chartType, cnt, circleRadius,xScale,yScale); 
            this.callLegend(randNum,cnt,legendLineData,legendX,legendText);
          }
        } else if (chartType == 'vbar'){
          if (this.chartData.stack_cols.length > 0 && !stackBarPlotted){
            if (this.chartData.bar_type == "stack"){
              this.plotVbarStack(xScale,yScale);
            } else {
              this.plotVbarGroup(xScale,yScale);
            }
            stackBarPlotted = true
          } else if (this.chartData.stack_cols.length == 0) {
            this.vbar(Data.data,cnt,colElement+"_hunit", xScale,yScale);
            this.callLegend("#ffffff",cnt,legendLineData,legendX,legendText);
          } 
          if (this.chartData.stack_cols.length > 0) {
            this.callLegend(this.barColor(colElement+"_hunit"),cnt,legendLineData,legendX,legendText);
          }
          if (colElement == 'warning') {this.callLegend(10,cnt,legendLineData,legendX,legendText);}
          else if (colElement == 'critical') this.callLegend(11,cnt,legendLineData,legendX,legendText);
        } else if (chartType =='hbar') {
            this.hbar(Data.data,cnt,colElement, chartType, xScale,yScale);
            if (!this.hDisplayLabel){
            // if (colElement == 'warning') {this.callLegend(10,cnt,legendLineData,legendX,legendText);}
            // else if (colElement == 'critical') this.callLegend(11,cnt,legendLineData,legendX,legendText);
            // else {this.callLegend(0,cnt,legendLineData,legendX,legendText);}
          }
        }
      }
      else {
        if (!this.hDisplayLabel) {
          //          noChartText();
        }
      }
      if (this.rootChartType != 'pie' && this.rootChartType != 'donut' && this.rootChartType != 'pie3d' && this.rootChartType !='donut3d' && !this.editMode && !stackBarPlotted){
        this.tooltip(this.chartData.data, chartType, xScale,yScale)
      }
    });
  }
  
  private noChartText(){
    let txt = "No Data to display this Chart";
    d3.select(this.element.nativeElement).append("p")
    .attr("width", this.parentWidth)
    .attr("height", this.parentHt)
    .attr("class", "noDataText vertical-center")
    .style("font-size","16px")
    .style("color","var(--orange)")
    .attr("opacity",1)
    .text(txt);
  }

  async varSetting() {
    this.data = []; this.allColCollection =[];this.chartUnitJson={}; this.dispColJson = {};this.chartTypeCollection=[];this.chartTypeKeys=[];
    this.margin = { top: 10, right: 35, bottom: 25, left: 35 };
    this.width = this.parentWidth - this.margin.left - this.margin.right;
    this.height = this.parentHt - this.margin.top - this.margin.bottom-10;
    //for legend and graph axis adjustment based on width of the data- Settings
    this.legendWidthTotal = 15;
    this.lineWidth = 25;
    this.legendLine = 1;
    this.nameMaxLength = 0, this.valMaxLength = 0;
    this.data = this.chartData.data;
    this.totalRows = this.data.length;
    this.hDisplayLabel = this.chartData.h_display; //This is used to display the label and height of the chart. height is based on total rows. label is display just above the chart
    this.enableYaxis = this.chartData.enable_yaxis;
    //arranging data chart type wise. 
    //this.allColCollection = _keys(this.chartData.chart_types_json);
    this.chartUnitJson = this.chartData.col_units_json;
    this.dispColJson = this.chartData.disp_col_json;
    //transform values to keys and group keys into set of array for each of the chart type (chart type are values in original array
    this.chartTypeCollection = _invertBy(this.chartData.chart_types_json);
    this.chartTypeKeys = _keys(this.chartTypeCollection);
    // getting all the coloumn for which chart has to be drawn
    this.colCollection=[]; this.allColCollection=[];
    for (let k = 0; k < this.chartTypeKeys.length; k++) {
      if (this.chartTypeKeys[k].toLowerCase() != "tooltip" && this.chartTypeKeys[k].toLowerCase() != 'hidden') {
        this.colCollection.push(this.chartTypeCollection[this.chartTypeKeys[k]]);
        this.allColCollection.push(this.chartTypeCollection[this.chartTypeKeys[k]]);
      }
      else if (this.chartTypeKeys[k].toLowerCase() != 'hidden')
        this.allColCollection.push(this.chartTypeCollection[this.chartTypeKeys[k]]);
    }
    // _flatten will bring one simple array list from multiple array in collection
    this.chartColCollection = _flatten(this.colCollection);
    this.allColCollection = _flatten(this.allColCollection);
    return true;
  }

  async settingDateFormat() {
    let al = d3.keys(this.data[0])[0];
    let dType = this.chartData.data_type_coll;
    this.axisLabel = this.dispColJson[al] == undefined ? al==undefined ? al : al.replace(/_/gi, ' ').replace(/-/gi, ' ') : this.dispColJson[al];
    if (this.chartData.xaxis_time_scale) {
      // console.log(this.chartData.col_units_json[al]);
      let timeMinMax = d3.extent(this.data, function (d, i) {return Number(new Date(d[al]).getTime()); });
      let stDate = (new Date(new Date().toDateString())).getTime();
      if (this.chartData.col_units_json[al] == "datetime") this.timeFormat = timeMinMax[0] > stDate ? "%H:%M" : "%d-%b-%y %H:%M";
      else if (this.chartData.col_units_json[al] == "date") this.timeFormat = "%d-%b-%y";
      else if (this.chartData.col_units_json[al] == "monthyear") this.timeFormat = "%b-%Y";
      else if (this.chartData.col_units_json[al] == "year") this.timeFormat = "%Y";
      this.tickFormat = d3.timeFormat(this.timeFormat);
      let nameMax = '';
      this.data.map((dataElm, idx) => {
        dataElm.label = this.tickFormat(new Date(dataElm[al]));
        nameMax = nameMax.length < dataElm.label.length ? dataElm.label : nameMax;
        dataElm.firstColName = dataElm.label;
      });
      this.nameMaxLength = this.getLegendWidth(nameMax,10)+5;
      //getting the time difference between first and second point. This is used for drill down charts having timescale.
      this.timeDiff = 0;
      if(this.data.length > 1) {
        let col1 = this.data[0];
        let col2 = this.data[1];
        this.timeDiff = Number(Object.values(col2)[0]) - Number(Object.values(col1)[0]);
      }
    } else {
      //Keeping the width of the value less than 15 characters for non date value column.
      let nameMax = '';
      this.data.map((dataElm, idx) => {
        if (dataElm[al] == null) dataElm[al] ="Null";
        dataElm.firstColName = dataElm[al];
        if (dType[al] == "month") {
          dataElm.label = this.reusable.getMonthShortName(dataElm[al]);
        } else {
          let type = typeof(dataElm[al]);
          let leng = type === 'number' ? dataElm[al].toString().length : dataElm[al].length;
          if ( leng > 15 ) {
            dataElm.label = (dataElm[al].substring(0, 10) + '..' + idx.toString());
            nameMax = nameMax.length < dataElm.label.length ? dataElm.label : nameMax;
          }
          else if (leng != 0) {
            dataElm.label = type === 'number' ? dataElm[al] : (dataElm[al]);
            nameMax = nameMax.length < dataElm.label.length ? dataElm.label : nameMax;
          }
        }
      });
      this.nameMaxLength = this.getLegendWidth(nameMax,10)+5;
    }
    return true;
  }

  private initializeAxis() {
    if (this.rootChartType.toLowerCase() == 'hbar') {
      this.yAxisScale = 'ordinal';
      this.xAxisScale = 'linear';
    } else {
      this.yAxisScale = 'linear';
      this.xAxisScale = 'ordinal';
    }
    if (this.rootChartType.toLowerCase() != 'hbar') {
      let totalWidth = this.totalRows > 15 ? this.nameMaxLength * 15 : this.nameMaxLength * this.totalRows;
      //when the legend width is more than size of the width then legends are rotated by 30 degree. and realigned the margin 
      if (totalWidth > this.width) {
        this.xAxisRotate = -30;
        this.margin.left = this.margin.left + 5 + Math.ceil(this.nameMaxLength * 0.25);
      }
    }
    //setting revised height, width and margins based on the formated data.
    if (this.xAxisScale == 'linear') {
      if (this.rootChartType.toLowerCase() == 'hbar'){
        if (this.chartData["stack_cols"].length == 0) this.xAxisLabel = this.chartData[Object.values(this.dispColJson)[1]+'_legend_text'] ;
        else this.xAxisLabel = "";
      } else {
        this.xAxisLabel = ' ';
      }
      this.xaxisLabelWidth = this.xAxisLabel.length <7 ? 7 : this.xAxisLabel.length;
      if (Math.abs(this.xAxisRotate) > 0) {
        this.margin.bottom = this.margin.bottom + Math.ceil(this.valMaxLength*0.5);
      } else {
        this.margin.bottom = this.margin.bottom + this.charPixHtConValue;
      }
      
    }
    else {
      this.xAxisLabel = this.axisLabel;
      this.xaxisLabelWidth = this.xAxisLabel.length <7 ? 7 : this.xAxisLabel.length;
      if (Math.abs(this.xAxisRotate) > 0) {
        this.margin.bottom = this.margin.bottom + Math.ceil(this.nameMaxLength * 0.5);
      } else {
        this.margin.bottom = this.margin.bottom + this.charPixHtConValue;
      }
    }
    if (this.yAxisScale == 'linear') {
      this.yAxisLabel = " "; //old value hardcoded
      this.axisLabelxPos = 5;
      this.margin.left = this.enableYaxis ? this.margin.left > this.valMaxLength + 15 ? this.margin.left : this.valMaxLength + 15 : this.margin.left;
      this.width = this.parentWidth - this.margin.right - this.margin.left;
    }
    else {
      this.yAxisLabel = this.hDisplayLabel ? '' : this.axisLabel;
      this.axisLabelxPos = this.yAxisLabel.length * 4;
      this.margin.left = this.enableYaxis ? this.margin.left > this.nameMaxLength + 15 ? this.margin.left : this.nameMaxLength + 15 : this.margin.left;
      this.width = this.parentWidth - this.margin.right - this.margin.left;
    }
    //implemented to allocate height for legends and adjust graph height accordingly
    if (this.rootChartType.toLowerCase() == 'hbar'){
      this.margin.bottom = this.margin.bottom + (this.legendLine * this.charPixHtConValue);
    } else {
      this.margin.top = this.margin.top + (this.legendLine * this.charPixHtConValue);
    }
    this.height= this.parentHt-this.margin.top - this.margin.bottom -5;
    //setting domain, ticks for axis
    if (this.xAxisScale == 'ordinal') {
      this.x = d3.scaleBand().range([0, this.width]);
      this.x.domain(this.data.map(d => d["label"]));
    }
    else {
      this.x = d3.scaleLinear().range([0, this.width]);
      this.x.domain([0, this.dataMinMax[1]]); // corrected on 31-May-2018 as when all values are same falls to y axis itself
    }
    if (this.yAxisScale == 'linear') {
      this.y = d3.scaleLinear().range([this.height, 0]);
      //this.y.domain([Number(this.dataMinMax[0]), Number(this.dataMinMax[1])]);
      this.y.domain([0, Number(this.dataMinMax[1])]); // corrected on 31-May-2018 as when all values are same falls to y axis itself
    }
    else {
      this.y = d3.scaleBand().rangeRound([0,this.height]);
      this.y.domain(this.data.map(d => d["label"]));
    }
    if (this.xAxisScale == 'ordinal') {
      let trows = this.totalRows;
      this.xAxis = d3.axisBottom(this.x)
        .tickValues(this.x.domain().filter(function (d, i) { return !(i % (Math.ceil(trows / 15))); }));
    }
    else {
      this.xAxis = d3.axisBottom(this.x);
    }
    this.yAxis = d3.axisLeft(this.y).ticks(5);
    //setting base svg common for all graphs
    this.svg1 = d3.select(this.element.nativeElement).append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);
    this.svg = this.svg1
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
      //creating xaxis and y axis
    this.svg.append("g")
      .attr("class", "x axis")
      .attr("id", "xaxis")
      .attr("transform", "translate(0," + this.height + ")")
      // .attr("class","capitalize")
      .style("font-family",this.fnt)
      .style("font-size","10px")
      .style("font-weight","600")
      .call(this.xAxis)

    if (this.xAxisRotate == -30) {
      this.svg.select("g").selectAll("text")
        .attr("transform", "rotate(" + this.xAxisRotate + ")")
        .attr("y", "0")
        .attr("x", "-5")
        .attr("dy", ".55em")
        .style("text-anchor", "end");
    }
    let xPosLegendWidth = this.getLegendWidth(this.xAxisLabel,16);
    let yPosLegendWidth = this.getLegendWidth(this.yAxisLabel,16);
    let xPosLegend = (this.width - xPosLegendWidth + this.margin.right)/2;

    this.svg.selectAll("#xaxis").append("text")
      .attr("transform", "rotate(0)")
      .attr("x", xPosLegend)
      .attr("y", this.xAxisRotate == -30 ? this.margin.bottom-8 : "35")
      // .style("text-transform", "capitalize")
      .style("fill", "currentColor")
      .style("font-family",this.fnt)
      .style("font-size","16px")
      .style("font-weight","600")
      .style("text-align","center")
      .style("opacity", "1")
      .text(this.xAxisLabel.replace(/_/g," ").replace(/-/," "));

    if (this.enableYaxis) {
      this.svg.append("g")
        .attr("class", "y axis")
        .style("font-family",this.fnt)
        .style("font-size","10px")
        .style("font-weight","600")
        .attr("id", "yaxis")
        .call(this.yAxis);

      this.svg.selectAll("#yaxis").append("text")
        .attr("transform", "rotate(0)")
        .attr("y", -10)
        .attr("x", yPosLegendWidth)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .style("fill", "currentColor")
        .style("font-family",this.fnt)
        .style("font-size","12px")
        .style("font-weight","600")
        .text(this.yAxisLabel);
    }
    else {
      this.svg.append("g")
        .attr("class", "y axis")
        .append("text")
        .attr("transform", "rotate(0)")
        .attr("y", -10)
        .attr("x", this.axisLabelxPos)
        .attr("dy", ".71em")
        .style("font-family",this.fnt)
        .style("font-size","12px")
        .style("text-anchor", "end")
        .text(this.yAxisLabel);
    }
  }

  //the below code will get the actual width in html of the legend for given font and weight.
  private getLegendWidth(legendName, fontSize){
    let legendTxt = document.createElement("span");
    document.body.appendChild(legendTxt);
    legendTxt.style.font = this.fnt;
    legendTxt.style.fontSize = fontSize + "px";
    legendTxt.style.fontWeight = '500';
    legendTxt.style.height = 'auto';
    legendTxt.style.width = 'auto';
    legendTxt.style.position = 'absolute';
    legendTxt.style.whiteSpace = 'no-wrap';
    legendTxt.innerHTML = legendName;
    let txtWidth = Math.ceil(legendTxt.clientWidth);
    document.body.removeChild(legendTxt);
    return txtWidth;
  }

  async groupSameUnitCharts(){
    let colBasedOnUnits = {}
    let colNames = Object.keys(this.chartData["col_units_json"]);
    let al = d3.keys(this.data[0])[0];
    colNames.map((column,ix) => {
      if (al != column) {
        let unit = (this.chartData["col_units_json"][column]).toLowerCase();
        if (this.unitGrp[unit] != undefined){
          if (colBasedOnUnits[this.unitGrp[unit]] == undefined) colBasedOnUnits[this.unitGrp[unit]] = {};
          colBasedOnUnits[this.unitGrp[unit]][column] = {};
          colBasedOnUnits[this.unitGrp[unit]][column]["unit"] = unit;
          if (this.baseUnitMapping[unit] == undefined) colBasedOnUnits[this.unitGrp[unit]][column]["baseunit"] = unit
          else colBasedOnUnits[this.unitGrp[unit]][column]["baseunit"] = this.baseUnitMapping[unit];
        } else {
          if (colBasedOnUnits["text"] == undefined) colBasedOnUnits["text"] = {};
          colBasedOnUnits["text"][column] = {}
          colBasedOnUnits["text"][column]["unit"] = unit;
          colBasedOnUnits["text"][column]["baseunit"] = unit;
        }
      }
    });
    let units = Object.keys(colBasedOnUnits);
    let unitwiseMinMax = {};
    units.map((unit,i) => {
      let sameGrpColumn = Object.keys(colBasedOnUnits[unit]);
      let minMax = []
      sameGrpColumn.map((column,ix) => {
        minMax[ix] = d3.extent(this.data, function (d) { return Number(d[column]); });
        if (this.nonBaseUnitConverter[colBasedOnUnits[unit][column]["unit"]] != undefined){
          minMax[ix][0] = minMax[ix][0]*this.nonBaseUnitConverter[colBasedOnUnits[unit][column]["unit"]];
          minMax[ix][1] = minMax[ix][1]*this.nonBaseUnitConverter[colBasedOnUnits[unit][column]["unit"]];
          colBasedOnUnits[unit][column]["minmax"] = minMax[ix];
        } else {
          colBasedOnUnits[unit][column]["minmax"] = minMax[ix];
        }
        if (ix==0) {
          unitwiseMinMax[unit] = minMax[ix];
        }
        else {
          if (unitwiseMinMax[unit][0] > minMax[ix][0]) unitwiseMinMax[unit][0] = minMax[ix][0];
          if (unitwiseMinMax[unit][1] < minMax[ix][1]) unitwiseMinMax[unit][1] = minMax[ix][1];
        }
      });
      colBasedOnUnits[unit]["minmax"] = unitwiseMinMax[unit];
      let valToConvert = unitwiseMinMax[unit][0] > 0 ? unitwiseMinMax[unit][0] :unitwiseMinMax[unit][1];
      let chartUnit = unit;
      if (unit == "number" || unit == "inr" || unit == "usd"){
        this.numberConv(chartUnit, valToConvert).then(result => {
          sameGrpColumn.map((column,ix) =>{

            let colUnit = result.conValue == 1 ? colBasedOnUnits["number"][column]["unit"] : result.outUnit
            this.chartData[column + "_out_unit"] = colUnit;
            this.chartData[column + "_legend_text"] = this.dispColJson[column]+ " ("+colUnit+")";
            this.chartData[column + "_conv_value"] = result.conValue;
            let baseUnitConv = this.nonBaseUnitConverter[this.chartData["col_units_json"][column].toLowerCase()];
            let baseConvValue = baseUnitConv==undefined ? 1 : baseUnitConv;
            this.dataHumanReadable(column, baseConvValue);
          })
          unitwiseMinMax[unit][0] = unitwiseMinMax[unit][0] * result.conValue;
          unitwiseMinMax[unit][1] = unitwiseMinMax[unit][1] * result.conValue;
      });
      }
      else if (unit == "bytes"){
        this.sizeConv(chartUnit, valToConvert).then(result => {
          sameGrpColumn.map((column,ix) =>{
            let suffix = "";
            if (colBasedOnUnits["text"][column]["unit"].endsWith("ps")){
              suffix = "ps";
            }
            let colUnit = result.conValue == 1 ? colBasedOnUnits["bytes"][column]["baseunit"] +suffix : result.outUnit+suffix
            this.chartData[column + "_out_unit"] = colUnit;
            this.chartData[column + "_legend_text"] = this.dispColJson[column]+ " ("+colUnit+")";
            this.chartData[column + "_conv_value"] = result.conValue;
            let baseUnitConv = this.nonBaseUnitConverter[this.chartData["col_units_json"][column].toLowerCase()];
            let baseConvValue = baseUnitConv==undefined ? 1 : baseUnitConv;
            this.dataHumanReadable(column, baseConvValue);
          })
          unitwiseMinMax[unit][0] = unitwiseMinMax[unit][0] * result.conValue;
          unitwiseMinMax[unit][1] = unitwiseMinMax[unit][1] * result.conValue;
        });
      }
      else if (unit == "time"){
        this.timeConv(chartUnit, valToConvert).then(result => {
          sameGrpColumn.map((column,ix) =>{
            this.chartData[column + "_out_unit"] = result.outUnit;
            this.chartData[column + "_legend_text"] = this.dispColJson[column]+ " ("+result.outUnit+")";
            this.chartData[column + "_conv_value"] = result.conValue;
            let baseUnitConv = this.nonBaseUnitConverter[this.chartData["col_units_json"][column].toLowerCase()];
            let baseConvValue = baseUnitConv==undefined ? 1 : baseUnitConv;
            this.dataHumanReadable(column, baseConvValue);
          })
          unitwiseMinMax[unit][0] = unitwiseMinMax[unit][0] * result.conValue;
          unitwiseMinMax[unit][1] = unitwiseMinMax[unit][1] * result.conValue;
        });
      } 
      else {
        sameGrpColumn.map((column,ix) =>{
          let colUnit = colBasedOnUnits["text"][column]["unit"];
          this.chartData[column + "_out_unit"] = colUnit
          this.chartData[column + "_legend_text"] = this.dispColJson[column]+ " ("+colUnit+")";
          this.chartData[column + "_conv_value"] = 1;
          this.dataHumanReadable(column, 1);
        })
      }
    })
    if (this.chartData.stack_cols.length == 0 || this.chartData.bar_type == "group") {
      Object.keys(unitwiseMinMax).map((unit,ix) => {
          if (ix == 0) this.dataMinMax = unitwiseMinMax[unit];
          else {
            if (this.dataMinMax[0] > unitwiseMinMax[unit][0]) this.dataMinMax[0] = unitwiseMinMax[unit][0];
            if (this.dataMinMax[1] < unitwiseMinMax[unit][1]) this.dataMinMax[1] = unitwiseMinMax[unit][1];
          }
      })
    }
  }

  async processDataStackChart(){
    let stackArr = (this.chartData.stack_cols.length == 0) ? [] : this.chartData.stack_cols.split(',');
    if (stackArr.length>1){
      let stackArrMod = await this.convertArr(stackArr);
      let data = this.chartData.data;
      this.chartData['stackData'] = d3.stack().keys(stackArrMod)(data);
      this.dataMinMax[1] = d3.max(this.chartData['stackData'], this.stackMax);
      this.dataMinMax[0] = d3.min(this.chartData['stackData'], this.stackMin);
      let subGrp = []
      let subGrpArr = this.chartData.stack_cols.split(",");
      subGrpArr.map(col => {
        subGrp.push(col+"_hunit");
      });
      this.barColor = d3.scaleOrdinal().domain(subGrp).range(this.aryColors);
    } else {
      this.chartData['stackData'] = [];
    }
  }
  
  stackMin(dat) {
    return d3.min(dat, function(d) {
        return d[0];
    });
  }
  
  stackMax(dat) {
    return d3.max(dat, function(d) {
        return d[1];
    });
  }

  async convertArr(arr){
    let newArr = [];
    arr.map(ele =>{newArr.push(ele+'_hunit');});
    return newArr;
  }

  private dataHumanReadable(dispEle: any, baseConvValue:any) {
    /* Based on width of legend text, line number is assigned to the legend */
    /* calculation for legend space and width */
    //1px spacing is given for each letter and hence added that for the width calculation
    /* tooltip column type are not considered for legend width calculation */
    /* calculation modified as of 23-12-2020 actual html length is taken into consideration */
    // console.log(dispEle,this.chartData.chart_types_json )
    // if (this.chartData.chart_types_json[dispEle] == undefined) return;
    if (this.chartData.chart_types_json[dispEle].toLowerCase() != "tooltip")
    {
      let dispEleLegendLength = this.getLegendWidth(this.chartData[dispEle+"_legend_text"],16);
      if ((dispEleLegendLength + 5 + this.lineWidth) > this.parentWidth) {
        this.lineWidth = 25;
        this.legendLine++;
        this.chartData[dispEle + "_legend_start_pos_x"] = this.lineWidth;
        this.chartData[dispEle + "_legend_line"] = this.legendLine;
        this.lineWidth += dispEleLegendLength + 25;
      }
      else {
        this.chartData[dispEle + "_legend_start_pos_x"] = this.lineWidth;
        this.lineWidth += dispEleLegendLength + 25;
        this.chartData[dispEle + "_legend_line"] = this.legendLine;
      }
    }
    //converting all the value into human readable unit only for elements that are mapped in unit_cols and getting max length of the value 
    let valMax = ''
    this.data.map((dataElm, idx) => {
      dataElm[dispEle + '_hunit'] = parseFloat((+dataElm[dispEle] * baseConvValue * this.chartData[dispEle + "_conv_value"]).toFixed(2));
      valMax = valMax.length < Math.round(dataElm[dispEle + '_hunit']).toString().length ? Math.round(dataElm[dispEle + '_hunit']).toString() : valMax;
    });
    this.valMaxLength = this.getLegendWidth(valMax,10)+3;
  }
  
  private pie(data,chCol){
    let idx = this.idx
    let arrClr = this.aryColors;
    let clickOutput = this.onChartOutput;
    let chData = this.chartData;
    let win = window;
    let tooltip = d3.select("body").append("div").attr("id","tooltip"+this.idx).attr("class", "apd-chart-tooltip").style("display",'none');
    this.svg = d3.select(this.element.nativeElement).append("svg")
                .attr("width", this.width + this.margin.left + this.margin.right)
                .attr("height", this.height + this.margin.top + this.margin.bottom);
    let radius = Math.min(this.width,this.height)/2;
    
    let g = this.svg.append("g").attr("transform", "translate(" + (+radius+10) + "," + this.height / 2 + ")");
    let innerRadius;
    // Generate the pie
    let pie = d3.pie().value(function(d){return d[chCol]});
    if (this.rootChartType=='pie') innerRadius = 0;
    else innerRadius = Math.round(radius*30/100);

    // Generate the arcs/path
    let path = d3.arc()
                 .innerRadius(innerRadius)
                 .outerRadius(radius-5);

    //Generate groups
    let arc = g.selectAll("arc")
               .data(pie(data))
               .enter()
               .append("g")
               .attr("class", "arc");

    var labelArc = d3.arc()
                    .outerRadius(radius - 35)
                    .innerRadius(radius - 35);
    //Draw arc paths
    arc.append("path")
        .attr("fill", function(d, i) {
            return arrClr[i% (arrClr.length)];
        })
        .attr("d", path);
    
    arc.append("text").attr("class", "percent")
          .attr('font-size','12px')
          .attr("transform", function(d) { return "translate(" + (labelArc.centroid(d)[0]-14)+","+labelArc.centroid(d)[1] + ")"; })
          .text(function getPercent(d){
                  return (d.endAngle-d.startAngle > 0.4 ? 
              Math.round(1000*(d.endAngle-d.startAngle)/(Math.PI*2))/10+'%' : '');
      }	).each(function(d){this._current=d;});

    /* legend printing */
    let svgLegend = this.svg.append("g").attr("class", "legend");
    let legendRectSize = 10;
    let legendSpacing = 10;
    svgLegend.attr("transform","translate(" + (+radius*2+20) + "," + (+this.margin.top+20)+ ")");
    
    let legend = svgLegend.selectAll('.legend')
			                    .data(data)
			                    .enter()
			                    .append('g')
                          .attr('class', 'legend');
    
    legend.append('rect')
          .attr('width', legendRectSize)
          .attr('height', legendRectSize)
          .attr('x', '0')
          .attr('y', function(d,i){var j=i%20;return (j*15-legendRectSize);})
          .style('fill', function(d,i){return arrClr[i%(arrClr.length)];})
          .style('stroke', function(d,i){return arrClr[i%(arrClr.length)];});
      
    legend.append('text')
          .attr('x', (+legendRectSize+legendSpacing))
          .attr('y',function(d,i){var j =i%20; return j*15;} )
          .attr('class','font_12')
          .text(function(d){return d.label+' ('+d[chCol+'_hunit']+' '+chData[chCol+'_out_unit']+')'} )
          .style('fill', this.theme=='dark'?'#fff':'#000');

    if (!this.editMode) {
      arc.on("mousemove",function(data){
        let d = data.data;
        tooltip.style("top", (d3.event.pageY-win.pageYOffset+10)+"px")
               .style("display",null)
               .style("left", (d3.event.pageX+10)+"px")
               .style("z-index",1999)
               .style("color",'black')
               .transition()
               .duration(200)
               .style("opacity", 0.9)
               .text(d.label +' ('+d[chCol]+')');
      });
      arc.on("mouseout",function(data){
        tooltip.style("display", "none");
      });
      arc.on("click",(data) => {
        tooltip.style("display",'none');
        let d = data.data;
        let arr ={};
        arr['label'] = d.label;
        arr['ddMetricId'] = chData.dd_chart_id;
        arr['idx'] = idx;
        arr['xAxisTimeScale'] = chData.xaxis_time_scale;
        arr['chartData'] = chData;
        arr['selRowData'] = d;
        clickOutput.emit(arr);
      })
    }
  }

  private pie3d(data,chCol){
    let arrClr = this.aryColors;
    let chData = this.chartData;

    this.svg = d3.select(this.element.nativeElement).append("svg")
                .attr("width", this.width + this.margin.left + this.margin.right)
                .attr("height", this.height + this.margin.top + this.margin.bottom);

    let radius = Math.min(this.width,this.height)/2;
    let x = +radius+10;
    let y = this.height/2;
    let innerRadius;
    if (this.rootChartType=='pie3d') innerRadius = 0;
    else innerRadius = 0.4;
    this.draw3dPie("pie3d",data,x,y,x-20,y-20,30,innerRadius, this.svg,arrClr,chCol);
    /* legend printing */
    let svgLegend = this.svg.append("g").attr("class", "legend");
    let legendRectSize = 10;
    let legendSpacing = 10;
    svgLegend.attr("transform","translate(" + (+radius*2+20) + "," + (+this.margin.top+20)+ ")");
    
    let legend = svgLegend.selectAll('.legend')
			                    .data(data)
			                    .enter()
			                    .append('g')
                          .attr('class', 'legend');
    
    legend.append('rect')
          .attr('width', legendRectSize)
          .attr('height', legendRectSize)
          .attr('x', '0')
          .attr('y', function(d,i){var j=i%20;return (j*15-legendRectSize);})
          .style('fill', function(d,i){return arrClr[i%(arrClr.length)];})
          .style('stroke', function(d,i){return arrClr[i%(arrClr.length)];});

    legend.append('text')
          .attr('x', (+legendRectSize+legendSpacing))
          .attr('y',function(d,i){var j =i%20; return j*15;} )
          .attr('class','font_12')
          .text(function(d){return d.label+' ('+d[chCol+'_hunit']+' '+chData[chCol+'_out_unit']+')'} )
          .style('fill', this.theme=='dark'?'#fff':'#000');
  }

  private plotVbarGroup(xScale, yScale){
    let ht = this.height;
    let tooltipHtml = d3.select("body").append("div").attr("id","tooltip"+this.idx).attr("class", "apd-chart-tooltip ").style("display","none");
    let chData = this.chartData;
    let subGrp = []
    let subGrpArr = this.chartData.stack_cols.split(",");
    subGrpArr.map(col => {
      subGrp.push(col+"_hunit");
    });
    let barColor = this.barColor = this.barColor = d3.scaleOrdinal().domain(subGrp).range(this.aryColors);
    let x1 = d3.scaleBand().padding(0.05);
    x1.domain(subGrp).rangeRound([0, xScale.bandwidth()*3/4]);
    this.svg.selectAll(".vbar")
    .data(chData.data)
    .attr("id",this.idx)
    .enter().append('g')
    .attr("transform", function(d) { return "translate(" + xScale(Object.values(d)[0]) + ",0)"; })
    .selectAll("rect")
    .data(function(d) { return subGrp.map(function(key) {return {label:d.label,key: key, value: d[key], unit:chData[key.replace("hunit","out_unit")]};});})
    .enter().append("rect")
    .attr("width",x1.bandwidth()) 
    .attr("x",function(d) { return x1(d.key)+x1.bandwidth();})
    .attr("y", function(d) { return yScale(d.value); }) 
    .attr("height", function(d) {return ht-yScale(d.value); })
    .attr("fill", function(d) { return barColor(d.key)})
    .on('mouseout', function() {tooltipHtml.style("display","none");})
    .on("mouseover", function(d){
        let tooltip = "";
        let ky = d.key.replace("_hunit","");
        let currency = chData["col_units_json"][ky];
        tooltip = "<span style ='color:darkblue'><strong>"+d.label+"</strong></span><br/>"
        tooltip += "<span class='clrprimary'><em>"+chData['disp_col_json'][ky]+" : </em></span>";
        tooltip += currency == "INR" ? "<span style='color:green'>&#8377;</span>" : currency == "USD" ? "<span style='color:green'>&#36;</span>" : '';
        tooltip += "<span style='color:green'>&nbsp"+d.value+"&nbsp"+d.unit+"</span>";
        tooltipHtml.style("display",null);
        tooltipHtml.html( tooltip )
              .style("top", (d3.event.pageY-window.pageYOffset+10)+"px")
              .style("left", (d3.event.pageX>window.innerWidth - 150 ? window.innerWidth-150 : d3.event.pageX+10)+"px")
              .style("z-index",1999)
              .transition()
              .duration(200)
              .style("opacity", 0.9);
      })
  } 

  private plotVbarStack(xScale, yScale){
    let ht = this.height;
    let tooltipHtml = d3.select("body").append("div").attr("id","tooltip"+this.idx).attr("class", "apd-chart-tooltip ").style("display","none");
    let chData = this.chartData;
    let subGrp = []
    let barColor = this.barColor;
    let subGrpArr = this.chartData.stack_cols.split(",");
    subGrpArr.map(col => {
      subGrp.push(col+"_hunit");
    });
    let stackData = d3.stack().keys(subGrp)(this.chartData.data);
    stackData.map(label => {
      label.map(pos => {
        let lbl = label.key.replace("_hunit","");
        pos["label"] = lbl;
        pos["value"] = pos["data"][label.key];
        pos["unit"] = this.chartData[lbl+"_out_unit"];
      })
    })
    this.svg.selectAll(".vbar")
    .data(stackData)
    .attr("id",this.idx)
    .enter().append('g')
    .attr("fill", function(d) { return barColor(d.key); })
    .selectAll("rect")
    // enter a second time = loop subgroup per subgroup to add all rectangles
    .data(function(d) { return d; })
    .enter().append("rect")
      .attr("transform", function(d) { return "translate(" + (xScale.bandwidth()/4) + ",0)"; })
      .attr("width",xScale.bandwidth()*0.5) 
      .attr("x",function(d) {return xScale(d.data.label);})
      .attr("y", function(d) { return yScale(d[1]); }) 
      .attr("height", function(d) {return ht-yScale(d[1]-d[0]); })
      .on('mouseout', function() {tooltipHtml.style("display","none");})
      .on("mouseover", function(d){
        let tooltip = "";
        let currency = chData["col_units_json"][d.label];
        tooltip = "<span style ='color:darkblue'><strong>"+d.data.label+"</strong></span><br/>"
        tooltip += "<span class='clrprimary'><em>"+chData['disp_col_json'][d.label]+" : </em></span>";
        tooltip += currency == "INR" ? "<span style='color:green'>&#8377;</span>" : currency == "USD" ? "<span style='color:green'>&#36;</span>" : '';
        tooltip += "<span style='color:green'>&nbsp"+d.value+"&nbsp"+d.unit+"</span>";
        tooltipHtml.style("display",null);
        tooltipHtml.html( tooltip )
              .style("top", (d3.event.pageY-window.pageYOffset+10)+"px")
              .style("left", (d3.event.pageX>window.innerWidth - 150 ? window.innerWidth-150 : d3.event.pageX+10)+"px")
              .style("z-index",1999)
              .transition()
              .duration(200)
              .style("opacity", 0.9);
      })
  } 

  private plotHbarGroup(xScale, yScale){
    let tooltipHtml = d3.select("body").append("div").attr("id","tooltip"+this.idx).attr("class", "apd-chart-tooltip ").style("display","none");
    let chData = this.chartData;
    let subGrp = []
    let subGrpArr = this.chartData.stack_cols.split(",");
    subGrpArr.map(col => {
      subGrp.push(col+"_hunit");
    });
    let barColor = this.barColor = this.barColor = d3.scaleOrdinal().domain(subGrp).range(this.aryColors);
    let y1 = d3.scaleBand().padding(0.05);
    y1.domain(subGrp).rangeRound([0, yScale.bandwidth()*3/4]);
    this.svg.selectAll(".hbar")
    .data(chData.data)
    .attr("id",this.idx)
    .enter().append('g')
    .attr("transform", function(d) { return "translate( 0," + yScale(Object.values(d)[0]) + ")"; })
    .selectAll("rect")
    // enter a second time = loop subgroup per subgroup to add all rectangles
    .data(function(d) { return subGrp.map(function(key) {return {label:d.label,key: key, value: d[key], unit:chData[key.replace("hunit","out_unit")]};});})
    .enter().append("rect")
    .attr("width",function(d) { return  xScale(d.value) ; }) 
    .attr("x",2)
    .attr("y", function(d) { return ( y1(d.key))+y1.bandwidth(); }) 
    .attr("height", y1.bandwidth())
    .attr("fill", function(d) { return barColor(d.key)})
    .on('mouseout', function() {tooltipHtml.style("display","none");})
    .on("mouseover", function(d){
        let tooltip = "";
        let ky = d.key.replace("_hunit","");
        let currency = chData["col_units_json"][ky];
        tooltip = "<span style ='color:darkblue'><strong>"+d.label+"</strong></span><br/>"
        tooltip += "<span class='clrprimary'><em>"+chData['disp_col_json'][ky]+" : </em></span>";
        tooltip += currency == "INR" ? "<span style='color:green'>&#8377;</span>" : currency == "USD" ? "<span style='color:green'>&#36;</span>" : '';
        tooltip += "<span style='color:green'>&nbsp"+d.value+"&nbsp"+d.unit+"</span>";
        tooltipHtml.style("display",null);
        tooltipHtml.html( tooltip )
              .style("top", (d3.event.pageY-window.pageYOffset+10)+"px")
              .style("left", (d3.event.pageX>window.innerWidth - 150 ? window.innerWidth-150 : d3.event.pageX+10)+"px")
              .style("z-index",1999)
              .transition()
              .duration(200)
              .style("opacity", 0.9);
      })
  } 

  private plotHbarStack(xScale, yScale){
    let tooltipHtml = d3.select("body").append("div").attr("id","tooltip"+this.idx).attr("class", "apd-chart-tooltip ").style("display","none");
    let chData = this.chartData;
    let subGrp = []
    let barColor = this.barColor;
    let subGrpArr = this.chartData.stack_cols.split(",");
    subGrpArr.map(col => {
      subGrp.push(col+"_hunit");
    });
    let stackData = d3.stack().keys(subGrp)(this.chartData.data);
    stackData.map(label => {
      label.map(pos => {
        let lbl = label.key.replace("_hunit","");
        pos["label"] = lbl;
        pos["value"] = pos["data"][label.key];
        pos["unit"] = this.chartData[lbl+"_out_unit"];
      })
    })
    this.svg.selectAll(".hbar")
    .data(stackData)
    .attr("id",this.idx)
    .enter().append('g')
    .attr("fill", function(d) { return barColor(d.key); })
    .selectAll("rect")
    // enter a second time = loop subgroup per subgroup to add all rectangles
    .data(function(d) { return d; })
    .enter().append("rect")
      .attr("transform", function(d) { return "translate( 0," + (yScale.bandwidth()/4) + ")"; })
      .attr("width",function(d) { return  xScale(d[1]-d[0]) ; }) 
      .attr("x",function(d) {return  xScale(d[0]);})
      .attr("y", function(d) { return ( yScale(d.data.label)); }) 
      .attr("height", yScale.bandwidth()*0.5)
      .on('mouseout', function() {tooltipHtml.style("display","none");})
      .on("mouseover", function(d){
        let tooltip = "";
        let currency = chData["col_units_json"][d.label];
        tooltip = "<span style ='color:darkblue'><strong>"+d.data.label+"</strong></span><br/>"
        tooltip += "<span class='clrprimary'><em>"+chData['disp_col_json'][d.label]+" : </em></span>";
        tooltip += currency == "INR" ? "<span style='color:green'>&#8377;</span>" : currency == "USD" ? "<span style='color:green'>&#36;</span>" : '';
        tooltip += "<span style='color:green'>&nbsp"+d.value+"&nbsp"+d.unit+"</span>";
        tooltipHtml.style("display",null);
        tooltipHtml.html( tooltip )
              .style("top", (d3.event.pageY-window.pageYOffset+10)+"px")
              .style("left", (d3.event.pageX>window.innerWidth - 150 ? window.innerWidth-150 : d3.event.pageX+10)+"px")
              .style("z-index",1999)
              .transition()
              .duration(200)
              .style("opacity", 0.9);
      })
  } 

  private hbar(data,cnt,chCol,chartType, xScale,yScale){
    let localUnit = this.chartData[chCol+'_out_unit'];
    let avgUnit = this.chartData['avg_out_unit'];
    this.yAxisLabel = '';
    let arrClr = this.aryColors;
    this.svg.selectAll(".hbar")
      .data(data)
      .enter().append("rect")
      .attr("transform", function(d) { return "translate( 0," + (yScale.bandwidth()/4) + ")"; })
      .attr("id",this.idx)
      .attr("width",function(d) { return  Math.abs(xScale(d[chCol+"_hunit"]) ); }) 
      .attr("x", 0 )
      .attr("y", function(d) { return ( yScale(d.label)); }) 
      .attr("height", yScale.bandwidth()*0.3 )
      .style("fill", function(d,i){ return arrClr[i % (arrClr.length)]});

      //placing legend for each bar above bar itself 
      if (this.hDisplayLabel){
        this.svg.selectAll(".bartext")
          .data(data)
          .enter()
          .append("text")
          .attr("id",chartType+"hbar"+cnt)
          .attr("class", "bartext")
          .attr("font-size","12px")
          .attr("y", function(d){return yScale(d.label)+yScale.bandwidth()*0.1;})
          .attr("x", 5)
          .text(function(d){return d.firstColName + ' ('+d[chCol+"_hunit"]+ ' '+localUnit+':Avg '+d['avg_hunit']+' '+avgUnit+')';});
      }
  }
  
  private vbar(data,cnt,chCol, xScale,yScale){
    let ht = this.height;
    let arrClr = this.aryColors;
    this.svg.selectAll(".vbar")
      .data(data)
      .enter().append("rect")
      .attr("transform", function(d) { return "translate(" + (xScale.bandwidth()/4) + ",0)"; })
      .attr("id",this.idx)
      .attr("width",xScale.bandwidth()*0.5) 
      .attr("x", function(d) { return xScale(d.label); })
      .attr("y", function(d) {return Math.abs(yScale(d[chCol]));}) 
      .attr("height", function(d) { return ht - yScale(d[chCol]); })
      .style("fill", function(d,i){ return arrClr[i % (arrClr.length)]});
  }
  
  private area(data,legend,randNum,chartType,cnt,circleRadius,xScale,yScale){
    let chartColor = this.aryColors[randNum];
    let svgArea = d3.area().x(function(d){return xScale(d.label)+xScale.bandwidth()/2;}).y0(this.height-1).y1(function (d){return yScale(d[legend]);});
    this.svg.append("path")
      .attr("class", "area")
      .attr("id",this.idx+""+cnt)
      .style("fill",chartColor)
      .attr("d", svgArea(data))
      .attr("opacity","0.8");
  }

  private line(data, legend, randNum,dash,saturation,lightness,writeLegend,chartType,cnt,circleRadius,xScale,yScale){
    var drawLegend = writeLegend;
    // if (legend!=this.chartData["col_critical"]+"_hunit" && legend != this.chartData["col_warning"]+"_hunit") randNum = randNum%(this.aryColors.length-2);
    // else if (legend==this.chartData["col_critical"]+"_hunit")  randNum = 11;
    // else if (legend==this.chartData["col_warning"]+"_hunit") randNum = 10;
    var chartColor = this.aryColors[randNum];
    let svgline = d3.line()
      .x(function(d) { return xScale(d.label)+xScale.bandwidth()/2;})
      .y(function(d){ return yScale(d[legend]);});
    
    this.svg.append("path")
      .attr("class", "line")
      .attr("id",this.idx+""+cnt)
      .attr("stroke", chartColor)
      .attr("stroke-width", "2px")
      .style("stroke-dasharray", "5,"+dash)
      .attr("fill","none")
      .attr("d", svgline(data));
    
    //    for non critical and warning line draw the dots
    if (dash==0){
      this.svg.selectAll("dot")	
        .data(data)			
        .enter().append("circle")								
        .attr("r", circleRadius)		
        .attr("id",this.idx+""+cnt)
        .style("fill", chartColor)
        .attr("cx", function(d) { return xScale(d.label)+xScale.bandwidth()/2; })		 
        .attr("cy", function(d) { return yScale(d[legend]); })
        .attr("opacity","1");
    }
  }
  
  //Legend Call
  private callLegend(randNum,cnt,legendLineData,legendX,legendText){
    let y = 0;
    //this.chartData["stackData"].length >0  && 
    if (this.rootChartType == "hbar"){
        y = this.legendLine >1 ? this.height+legendLineData*18+15 : this.height+this.margin.bottom/2+10;
    } else {
        y = (this.legendLine > 1 ? (legendLineData-1)*18  : 0)
    }
    let chartColor = "";
    if (Number(randNum).toString() == "NaN"){
      chartColor = randNum;
    } else {
      chartColor = this.aryColors[randNum];
    }
    this.svg1.append("rect")
    .attr("x", legendX-12)
    .attr("y", y)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", chartColor)
    .attr("border","1px solid "+chartColor);

    this.svg1
      .append("text")
      .attr("class", this.theme=='dark'?'text':'')
      .attr("id","legendText"+this.idx+cnt)
      .style("font-size","14px")
      .style("font-family",this.fnt)
      .style("font-weight","600")
      // .style("text-transform", "capitalize")
      .style("padding-bottom","5px")
      .attr("y", y+13)
      .attr("x", legendX+10)
      .attr("opacity",1)
      .text(legendText);
  }
          
  async setMinMaxVal(dispEle: any, chartColCollection: any, dataMinMaxSel: any) {
    if (_indexOf(chartColCollection, dispEle) != -1) {
      if (this.dataMinMax.length == 0) {
        this.dataMinMax[0] = dataMinMaxSel[0] * this.chartData[dispEle + "_conv_value"];
        this.dataMinMax[1] = dataMinMaxSel[1] * this.chartData[dispEle + "_conv_value"];
      } else {
        if (this.dataMinMax[0] > dataMinMaxSel[0] * this.chartData[dispEle + "_conv_value"])
          this.dataMinMax[0] = dataMinMaxSel[0] * this.chartData[dispEle + "_conv_value"];
        if (this.dataMinMax[1] < dataMinMaxSel[1] * this.chartData[dispEle + "_conv_value"])
          this.dataMinMax[1] = dataMinMaxSel[1] * this.chartData[dispEle + "_conv_value"];
      }
    }
  }

  async precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }

  //Size conversion function					
  async sizeConv(inUnit,inVal){
    let inUn = inUnit.toLowerCase();
    let unit = inUn.substring(0,1);
    let outSize={outUnit:"",dispUnit:"",conValue:1};
    if (inVal<1024*10){
      outSize.outUnit= "Bytes" ; outSize.dispUnit="Bytes";
      outSize.conValue = 1;
    } else if (inVal>=1024*10 && inVal<1048576*10){
      outSize.outUnit="KB" ; outSize.dispUnit="KB";
      outSize.conValue= 1/1024;
    } else if (inVal>=1048576*10 && inVal<1073741824*10){
      outSize.outUnit="MB" ; outSize.dispUnit="MB"
      outSize.conValue= 1/(1024*1024) ;
    } else if (inVal>=1073741824*10){
      outSize.outUnit="GB" ; outSize.dispUnit="GB";
      outSize.conValue= 1/(1024*1024*1024);
    }
    return outSize;
  }
  
  //Time conversion					
  async timeConv(inUnit,inVal){
    let inUn = inUnit.toLowerCase();
    let outTime={outUnit:"",dispUnit:"",conValue:1};
    if (inVal<10000){
      outTime.outUnit ='ms'; outTime.dispUnit = "ms";
      outTime.conValue = 1;
    } else if (inVal >= 10000 && inVal < 60000){
      outTime.outUnit = 'Seconds'; outTime.dispUnit = "sec";
      outTime.conValue = 1/1000;
    } else if (inVal >= 60000 && inVal < 3600000){
      outTime.outUnit = 'Minutes'; outTime.dispUnit = "min";
      outTime.conValue = 1/(60*1000);
    } else if (inVal >= 3600000 && inVal < 24*60*60*1000){
      outTime.outUnit = 'Hours'; outTime.dispUnit = "hrs";
      outTime.conValue = 1/(60*60*1000);
    } else if (inVal >= 24*60*60*1000){
      outTime.outUnit = 'Days'; outTime.dispUnit = "days";
      outTime.conValue = 1/(24*60*60*1000);
    }
    return outTime;
  }
  
  async numberConv(inUnit,inVal){
    let inUn = inUnit;
    let outNumCov = {outUnit:"",dispUnit:"",conValue:1};
    let numberFormat = inUn == "usd" ? 'million' : inUn == "inr" ? 'crore' : this.constants.NumberFormat.toLowerCase();

    if(inUn == "count" || inUn == "counts") inUn = 'count';
    if(inUn == "number" || inUn == "numeric"|| inUn == "numbers" || inUn == "") inUn = 'number';
    if(inUn == "inr"|| inUn == "rupees" || inUn == 'rs') inUn = "rs";
    if(inUn == "usd"|| inUn == "$") inUn = "usd";

    if (inVal < 10000){
      outNumCov.outUnit = inUn; 
      outNumCov.dispUnit = inUn;
      outNumCov.conValue =  1 ;
    } else if (inVal >= 10000 && inVal < 100000 ){
        outNumCov.outUnit = 'x000'; outNumCov.dispUnit = 'x000';
        outNumCov.conValue = 1/1000;
    } else if (inVal >= 100000 && inVal < 10000000 && numberFormat == 'crore'){
      outNumCov.outUnit = "Lakhs"; outNumCov.dispUnit = "Lakhs";
      outNumCov.conValue = 1/100000;
    } else if (inVal >= 10000000 && numberFormat == 'crore'){
      outNumCov.outUnit = "Crores"; outNumCov.dispUnit = "Crores";
      outNumCov.conValue = 1/10000000;
    } else if (inVal >= 100000 && inVal < 1000000 && numberFormat == 'million' ){
      outNumCov.outUnit = 'x000'; outNumCov.dispUnit = 'x000';
      outNumCov.conValue = 1/1000;
    } else if (inVal >= 1000000 && inVal < 1000000000 && numberFormat == 'million'){
      outNumCov.outUnit = "Million"; outNumCov.dispUnit = "Million";
      outNumCov.conValue = 1/1000000;
    } else if (inVal >= 1000000000 && numberFormat =='million'){
      outNumCov.outUnit = "Billion"; outNumCov.dispUnit = "Billion";
      outNumCov.conValue = 1/1000000000;
    }
    return outNumCov;
  }
  
  draw3dPie (id, data, x /*center x*/, y/*center y*/, 
    rx/*radius x*/, ry/*radius y*/, h/*height*/, ir/*inner radius*/,svg,arrClr, chCol){
      let pieData = data;
      let idx = this.idx
      let clickOutput = this.onChartOutput;
      let chData = this.chartData;
      let win = window;
      let tooltip = d3.select("body").append("div").attr("id","tooltip"+this.idx).attr("class", "apd-chart-tooltip ").style("display",'none');
    var _data = d3.pie().sort(null).value(function(d) {return d[chCol];})(data);
    var slices = svg.append("g").attr("transform", "translate(" + x + "," + y + ")")
                                .attr("class", "slices");

    slices.selectAll(".innerSlice").data(_data).enter().append("path").attr("class", "innerSlice")
      .style("fill", function(d,i) { return d3.hsl(arrClr[i%(arrClr.length)]).darker(0.5); })
      .attr("d", function pieInner(d ){
        var startAngle = (d.startAngle < Math.PI ? Math.PI : d.startAngle);
        var endAngle = (d.endAngle < Math.PI ? Math.PI : d.endAngle);
        let sx = ir*rx*Math.cos(startAngle);
        let sy = ir*ry*Math.sin(startAngle);
        let ex = ir*rx*Math.cos(endAngle);
        let ey = ir*ry*Math.sin(endAngle);
    
        var ret =[];
        ret.push("M",sx, sy,"A",ir*rx,ir*ry,"0 0 1",ex,ey, "L",ex,h+ey,"A",ir*rx, ir*ry,"0 0 0",sx,h+sy,"z");
        return ret.join(" ");
      })
      .each(function(d){this._current=d;})
      .on("mousemove",function(data){
        let d = data.data;
        tooltip.style("top", (d3.event.pageY-win.pageYOffset+10)+"px")
               .style("display",null)
               .style("left", (d3.event.pageX+10)+"px")
               .style("z-index",1999)
               .style("color",'black')
               .transition()
               .duration(200)
               .style("opacity", 0.9)
               .text(d.label +' ('+d[chCol]+')');
      })
      .on("mouseout",function(data){
        tooltip.style("display", "none");
      }).on("click",(data) => {
        tooltip.style("display",'none');
        let d = data.data;
        let arr ={};
        arr['label'] = d[Object.keys(d)[0]];
        arr['ddMetricId'] = chData.dd_chart_id;
        arr['idx'] = idx;
        arr['xAxisTimeScale'] = chData.xaxis_time_scale;
        arr['chartData'] = chData;
        arr['selRowData'] = d;
        clickOutput.emit(arr);
      });

    
    slices.selectAll(".topSlice").data(_data).enter().append("path").attr("class", "topSlice")
      .style("fill", function(d,i) { return arrClr[i%(arrClr.length)] })
      .style("stroke", function(d,i) { return arrClr[i%(arrClr.length)] })
      .attr("d", function pieTop(d){
        if(d.endAngle - d.startAngle == 0 ) return "M 0 0";
        let sx = rx*Math.cos(d.startAngle);
        let  sy = ry*Math.sin(d.startAngle);
        let  ex = rx*Math.cos(d.endAngle);
        let  ey = ry*Math.sin(d.endAngle);
          
        var ret =[];
        ret.push("M",sx,sy,"A",rx,ry,"0",(d.endAngle-d.startAngle > Math.PI? 1: 0),"1",ex,ey,"L",ir*ex,ir*ey);
        ret.push("A",ir*rx,ir*ry,"0",(d.endAngle-d.startAngle > Math.PI? 1: 0), "0",ir*sx,ir*sy,"z");
        return ret.join(" ");
      })
      .each(function(d){this._current=d;})
      .on("mousemove",function(data){
        let d = data.data;
        tooltip.style("top", (d3.event.pageY-win.pageYOffset+10)+"px")
               .style("display",null)
               .style("left", (d3.event.pageX+10)+"px")
               .style("z-index",1999)
               .style("color",'black')
               .transition()
               .duration(200)
               .style("opacity", 0.9)
               .text(d.label +' ('+d[chCol]+')');
      })
      .on("mouseout",function(data){
        tooltip.style("display", "none");
      }).on("click",(data) => {
        tooltip.style("display",'none');
        let d = data.data;
        let arr ={};
        arr['label'] = d[Object.keys(d)[0]];
        arr['ddMetricId'] = chData.dd_chart_id;
        arr['idx'] = idx;
        arr['xAxisTimeScale'] = chData.xaxis_time_scale;
        arr['chartData'] = chData;
        arr['selRowData'] = d;
        clickOutput.emit(arr);
      });
    
    slices.selectAll(".outerSlice").data(_data).enter().append("path").attr("class", "outerSlice")
      .style("fill", function(d,i) { return d3.hsl(arrClr[i%(arrClr.length)]).darker(0.5); })
      .attr("d", function pieOuter(d){
        var startAngle = (d.startAngle > Math.PI ? Math.PI : d.startAngle);
        var endAngle = (d.endAngle > Math.PI ? Math.PI : d.endAngle);
        
        var sx = rx*Math.cos(startAngle);
        let sy = ry*Math.sin(startAngle);
        let ex = rx*Math.cos(endAngle);
        let ey = ry*Math.sin(endAngle);
          
        var ret =[];
        ret.push("M",sx,h+sy,"A",rx,ry,"0 0 1",ex,h+ey,"L",ex,ey,"A",rx,ry,"0 0 0",sx,sy,"z");
        return ret.join(" ");
      })
      .each(function(d){this._current=d;})
      .on("mousemove",function(data){
        let d = data.data;
        tooltip.style("top", (d3.event.pageY-win.pageYOffset+10)+"px")
               .style("display",null)
               .style("left", (d3.event.pageX+10)+"px")
               .style("z-index",1999)
               .style("color",'black')
               .transition()
               .duration(200)
               .style("opacity", 0.9)
               .text(d.label +' ('+d[chCol]+')');
      })
      .on("mouseout",function(data){
        tooltip.style("display", "none");
      }).on("click",(data) => {
        tooltip.style("display",'none');
        let d = data.data;
        let arr ={};
        arr['label'] = d[Object.keys(d)[0]];
        arr['ddMetricId'] = chData.dd_chart_id;
        arr['idx'] = idx;
        arr['xAxisTimeScale'] = chData.xaxis_time_scale;
        arr['chartData'] = chData;
        arr['selRowData'] = d;
        clickOutput.emit(arr);
      })

    slices.selectAll(".percent").data(_data).enter().append("text").attr("class", "percent")
      .attr("x",function(d){ return 0.75*rx*Math.cos(0.5*(d.startAngle+d.endAngle));})
      .attr("y",function(d){ return 0.7*ry*Math.sin(0.5*(d.startAngle+d.endAngle));})
      .text(function getPercent(d){
        return (d.endAngle-d.startAngle > 0.3 ? 
            Math.round(1000*(d.endAngle-d.startAngle)/(Math.PI*2))/10+'%' : '');
      }	).each(function(d){this._current=d;});
  }

  //Tool tip function	for line, area, horizontal & vertical bar charts				
  tooltip(data, ct, xScale,yScale) {
    let dispColJSON = this.dispColJson;
    let wid = this.width;
    let ht = this.height;
    let pvtChartColCollection = this.chartColCollection ;//this.allColCollection;
    let pvtAllColCollection = this.allColCollection;
    let chData = this.chartData;
    let dMM = this.dataMinMax[0];
    let toolTipData =[];
    let focus = this.svg.append('g').style('display', 'none');
    let idx = this.idx;
    let clickOutput = this.onChartOutput;
    let td = this.timeDiff;
    let win = window;
    focus.append('line')
      .attr('id', 'focusLineX')
      .attr('class', 'focusLine');
    focus.append('line')
      .attr('id', 'focusLineY')
      .attr('class', 'focusLine');
    focus.append('circle')
      .attr('id', 'focusCircle')
      .attr('r', 5)
      .attr('class', 'circle focusCircle')
      .attr('opacity',"0.9");
    let tooltipHtml=[];
    tooltipHtml[idx] = d3.select("body")
            .append("div")
            .attr("class", "apd-chart-tooltip ")
            .attr("id", "tooltip"+idx)
            .style("opacity", "0")
            .style("display","none");
    this.svg.append('rect')
    .attr('class', 'overlay')
    .attr('width', wid)
    .attr('height', ht)
    .on('mouseover',function() { focus.style('display', null); tooltipHtml[idx].style("display",null);})
    .on('mouseout', function() { focus.style('display', 'none');tooltipHtml[idx].style("display","none");  })
    .on('mousemove',function() {
      var xyCord = ct !="hbar" ? 0 : 1; // to get the x or y movement 0 -x-movement, 1- y movement from mouse
      var mouse = d3.mouse(this)[xyCord];
      let leftEdges = [];
      data.map((ele,i) =>{
        if (ct != 'hbar')
          leftEdges[i] = xScale(ele.label);
        else
          leftEdges[i] = yScale(ele.label);
      });
      var width1 = ct != "hbar" ? xScale.bandwidth() : yScale.bandwidth();
      var j;
      for(j=0; mouse > (leftEdges[j] + width1); j++) {
      }; //replaces the bisect command
        //do nothing, just increment j until case fails
      var ttd = toolTipData = data[j]; //tooltip data
      let vcol;
      if (ttd !=undefined){
        var x3,y3, x1a,x2a;
        var aggCnt, tooltip = "", disTip="", vunit="";

        let dispCol1Tip = pvtChartColCollection;
        tooltip = "<span style ='color:darkblue'><strong>"+ttd.label+"</strong></span><br/>"
        
        if(pvtAllColCollection.length>0){
          pvtAllColCollection.forEach(function(dispEle, i){
            let currency = chData["col_units_json"][dispEle];
            vcol = dispEle == chData["col_critical"] ? "red" : dispEle==chData["col_warning"] ? "#B5A642":"green";
            disTip += "<span class='clrprimary'><em>"+dispColJSON[dispEle]+" : </em></span>";
            disTip += currency == "INR" ? "<span style='color:"+vcol+"'>&#8377;</span>" : currency == "USD" ? "<span style='color:"+vcol+"'>&#36;</span>" : '';
            disTip += "<span style='color:"+vcol+"'>&nbsp"+ttd[dispEle+"_hunit"]+"&nbsp"+chData[dispEle+"_out_unit"]+"</span>";
            disTip +="<br/>";
            // if (i%3 == 1) disTip +="<br/>";
          });
        }
        tooltip += disTip ;
        var maxVal=0;
        var keyName = '';
        if(ct != "hbar") x3= xScale(ttd.label)+width1/2;
        else y3 = yScale(ttd.label)+width1/2
        d3.keys(ttd).forEach(function(key){
          dispCol1Tip.forEach(function(dispEle, i){
            if (key == dispEle) {
              if (ttd[key] > maxVal){
                maxVal = ttd[key];
                keyName = key ;
              }
            }
          })
        })

        if (ct !='hbar') {y3 = isNaN(yScale(ttd[keyName+"_hunit"])) ? ht: yScale(ttd[keyName+"_hunit"]);  x1a=yScale(dMM); x2a=0;}
        else {x3 = isNaN(xScale(ttd[keyName+"_hunit"]))? 0 : xScale(ttd[keyName+"_hunit"]) ; x1a=0; x2a=ht;}
        focus.select('#focusCircle').attr('cx', x3).attr('cy', y3);
        focus.select('#focusLineX').attr('x1', x3).attr('y1', x1a).attr('x2', x3).attr('y2', x2a);
        focus.select('#focusLineY').attr('x1', 0).attr('y1', y3).attr('x2', wid).attr('y2', y3);
        tooltipHtml[idx].html( tooltip )
              .style("top", (d3.event.pageY-win.pageYOffset+10)+"px")
              .style("left", (d3.event.pageX>window.innerWidth - 150 ? window.innerWidth-150 : d3.event.pageX+10)+"px")
              .style("z-index",1999)
              .transition()
              .duration(200)
              .style("opacity", 0.9);

        d3.select(this).on("dblclick",() => {
          tooltipHtml[idx].style("display",'none');
          let colOne = _toPairs(toolTipData)[0];
          let arr ={};
          arr[colOne[0]] = colOne[1];
          arr['ddMetricId'] = chData.dd_chart_id;
          arr['idx'] = idx;
          arr['xAxisTimeScale'] = chData.xaxis_time_scale;
          arr['chartData'] = chData;
          arr['timeDiff'] = td;
          arr['selRowData'] = ttd;
          clickOutput.emit(arr);
        });
      }
    });
  }	
}



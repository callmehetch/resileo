import { Directive, ElementRef, Input, OnChanges, HostListener, OnDestroy, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import * as _ from 'lodash';
import { AuthServiceService } from '../auth-service.service';

@Directive({
  selector: '[D3chartsv5]',
  outputs: ['onChartOutput']
})
export class D3chartsv3Directive {
  @Input('chart') chart:any;
  @Input('width') parentWidth:number;
  @Input('height') parentHt:number;
  @Input('id') idx:number;
  @Input('chartType') chartType:String;
  @Input('dataChange') dataChange:any;
  
  onChartOutput = new EventEmitter();
  aryColors = [
    {"dark":"#9b61a7", "light":"#e2aded"}, {"dark":"#98cb65", "light":"#b8e888"},
    {"dark":"#f06c53", "light":"#ed9989"}, {"dark":"#f0ca4d", "light":"#f2d77d"}, 
    {"dark":"#00b9d9", "light":"#65e1f7"}, {"dark":"#a57d43", "light":"#dda85d"},
    {"dark": "#bca731", "light":"#f4d942"},{"dark":"#e88422", "light":"#f7bb80"},
    {"dark": "#bcb309", "light":"#e8de22"},{"dark":"#789932", "light":"#b4e549"},
    {"dark":"#d6b300", "light":"#ffd500"}, {"dark":"#cc0000", "light":"#ff0000"}
  ];
  data = [];
  timeFormat: string;
  tickFormat: any;
  width:number;
  height:number;
  x:any;
  dateMinMax: any;
  dataMinMax: any;
  y: any;
  xAxis: any;
  yAxis: any;
  margin: any;
  svg:any; svg1:any;
  xAxisLabel: any;
  enableYaxis: any;
  axisLabelxPos: any;
  yAxisLabel: any;
  tooltipDiv:any;
  chartAttributes:any;

  constructor (
    private element: ElementRef,
  ){ } 

  ngOnChanges(){
    d3.select(this.element.nativeElement).select('svg').remove();
    d3.select('body').selectAll('#tooltip'+this.idx).remove();
    this.drawChart();
  }

  ngOnInit(){
    console.log("inside d3 directive");
    console.log(this.chart, this.parentWidth, this.parentHt, this.idx, this.chartType);
  }

  drawChart(){
    this.margin = {top: 20, right: 50, bottom: 50, left: 40};
    this.width = this.parentWidth - this.margin.left - this.margin.right  
    this.height = this.parentHt - this.margin.top - this.margin.bottom;
    this.chartAttributes = this.chart[0].chart_attributes;  
    this.data = this.chart[0].chart_data;
    console.log(this.data.length);
    this.initializeAxis();
    this.fixLegendPosition();
    this.plotChart();
    this.tooltip(this.data, 'line', this.x,this.y);
  }

  private fixLegendPosition(){
    let chartArr = Object.keys(this.chartAttributes.charts);
    let legendLength = 0;
    for (let i =0; i<chartArr.length; i++) {
      let ch = this.chartAttributes.charts[chartArr[i]];
      if (i == 0){
        ch.startPositionOfLegend = 20;
        legendLength = ch.legend.length*7 + 15;
      } else {
        ch.startPositionOfLegend = legendLength;
        legendLength += ch.legend.length*7 + 15;
      }
    }
  }

  private plotChart(){
    let chartArr = Object.keys(this.chartAttributes.charts);
    chartArr.map((chart,i)=>{
      let ch = this.chartAttributes.charts[chart];
      let legend = ch.legend;
      let chartType = ch.chartType;
      let randNum = Math.floor(Math.random()*100)%(this.aryColors.length-2);
      if (chartType != undefined && chartType.toLowerCase() == 'line'){
        this.line(this.data,chart,randNum,0,i,2,this.x,this.y);
        this.callLegend(randNum,1,ch.startPositionOfLegend,legend);
      } else if (chartType != undefined && chartType.toLowerCase() == 'vbar'){
        this.vbar(this.data,i,chart,randNum,this.x, this.y);
        this.callLegend(randNum,1,ch.startPositionOfLegend,legend);
      }
    });
  }

  private initializeAxis() {
    let firstColName = Object.keys(this.data[0])[0]
    if(this.chartAttributes.firstColumnDate){
      this.dateMinMax = d3.extent(this.data, function (d, i) { return new Date(d[firstColName]); });
      this.timeFormat = "%d-%b";
      this.tickFormat = d3.timeFormat(this.timeFormat);
      this.data.map((dataElm, idx) => {
        dataElm.label = this.tickFormat(new Date(dataElm[firstColName]));
      });
    } else {
      this.data.map((dataElm,i)=>{
        dataElm.label = dataElm[firstColName];
      })
    }
    this.xAxisLabel = this.chartAttributes.xAxisLabel;
    this.enableYaxis = true;
    this.axisLabelxPos = 5;
    this.yAxisLabel = this.chartAttributes.yAxisLabel;
    let chartsArr = Object.keys(this.chartAttributes.charts);

    chartsArr.map((chart,i) => {
      let dataMinMax1 = d3.extent(this.data, function (d, i) { return Number(d[chart]); });
      if (i ==0){
        this.dataMinMax = dataMinMax1;
      } else {
        let minVal = this.dataMinMax[0] > dataMinMax1[0] ? dataMinMax1[0] : this.dataMinMax[0];
        let maxVal = this.dataMinMax[1] > dataMinMax1[1] ? this.dataMinMax[1] : dataMinMax1[1];
        this.dataMinMax = [minVal, maxVal];
      }
    })
    console.log("Data Min Max Values", this.dataMinMax);

    this.x = d3.scaleBand().range([0, this.width]);
    this.x.domain(this.data.map(d => d["label"]));
    this.y = d3.scaleLinear().range([this.height, 0]);
    this.y.domain([0, this.dataMinMax[1]]);

    let trows = this.data.length;
    this.xAxis = d3.axisBottom(this.x)
      .tickValues(this.x.domain().filter(function (d, i) { return !(i % (Math.ceil(trows / 15))); }));
    this.yAxis = d3.axisLeft(this.y).ticks(5);
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
      .call(this.xAxis);

    let xAxisRotate = -30
    this.svg.select("g").selectAll("text")
      .attr("transform", "rotate(" + xAxisRotate + ")")
      .attr("y", "0")
      .attr("x", "-5")
      .attr("dy", ".55em")
      .attr("class","capitalize")
      .style("text-anchor", "end");

    this.svg.selectAll("#xaxis").append("text")
      .attr("transform", "rotate(0)")
      .attr("x", this.parentWidth - this.margin.right- this.margin.left)
      .attr("y", 30)
      .style("text-transform", "capitalize")
      .style("text-anchor", "end")
      .style("fill", "currentColor")
      .style("opacity", "1")
      .text(this.xAxisLabel);
    if (this.enableYaxis) {
      this.svg.append("g")
        .attr("class", "y axis capitalize")
        .attr("id", "yaxis")
        .call(this.yAxis);
      this.svg.selectAll("#yaxis").append("text")
        .attr("transform", "rotate(0)")
        .attr("y", -10)
        .attr("x", this.axisLabelxPos)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .style("fill", "currentColor")
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
        .style("text-anchor", "end")
        .text(this.yAxisLabel);
    }
  }

  private vbar(data,index,chCol, colorNum, xScale,yScale){
    let ht = this.height;
    let chartColor = this.aryColors[colorNum];
    this.svg.selectAll(".vbar")
      .data(data)
      .enter().append("rect")
      .attr("transform", function(d) { return "translate(" + (xScale.bandwidth()/4) + ",0)"; })
      .attr("id",index)
      .attr("width",xScale.bandwidth()*0.5) 
      .attr("x", function(d) { return xScale(d.label); })
      .attr("y", function(d) {return Math.abs(yScale(d[chCol]));}) 
      .attr("height", function(d) { return ht - yScale(d[chCol]); })
      .style("fill", chartColor.light);
  }


  private line(data, chartCol, colorNum, dash,index,circleRadius,xScale,yScale){
    let chartColor = this.aryColors[colorNum];
    let svgline = d3.line()
      .x(function(d) { return xScale(d.label)+xScale.bandwidth()/2;})
      .y(function(d){ return yScale(d[chartCol]);});
    
    this.svg.append("path")
      .attr("class", "line")
      .attr("id",this.idx+""+index)
      .attr("stroke", chartColor.dark)
      .style("stroke-dasharray", "5,"+dash)
      .attr("fill","none")
      .attr("d", svgline(data));
    // for drawing the dots when line is not dotted
    if (dash==0){
      this.svg.selectAll("dot")	
        .data(data)			
        .enter().append("circle")								
        .attr("r", circleRadius)		
        .attr("id",this.idx+""+index)
        .style("fill", chartColor.dark)
        .attr("cx", function(d) { return xScale(d.label)+xScale.bandwidth()/2; })		 
        .attr("cy", function(d) { return yScale(d[chartCol]); })
        .attr("opacity","1");
    }
  }
    
  //Legend Call
  private callLegend(colorNum,cnt,legendX,legendText){
    let chartColor = this.aryColors[colorNum];
    this.svg1.append("rect")
    .attr("x", legendX-12)
    .attr("y", this.parentHt-15)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", chartColor.dark)
    .attr("border","1px solid "+chartColor.dark);

    this.svg1
      .append("text")
      .attr("id","legendText"+this.idx+cnt)
      .attr("font-size","12px")
      .attr("font-family","Helvetica Neue")
      .style("text-transform", "capitalize")
      .attr("y", this.parentHt-5)
      .attr("x", legendX)
      .attr("opacity",1)
      .text(legendText);
  }

  tooltip(data, ct, xScale,yScale) {
    let wid = this.width;
    let ht = this.height;
    let pvtAllColCollection = Object.keys(this.chart[0].chart_attributes.charts);
    let chartAttrib = this.chart[0].chart_attributes.charts;
    let chData = this.data;
    let dMM = this.dataMinMax[0];
    let toolTipData =[];
    let focus = this.svg.append('g').style('display', 'none');
    let idx = this.idx;
    let clickOutput = this.onChartOutput;
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
                        .attr("class", "apd-chart-tooltip capitalize")
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
        let dispCol1Tip = pvtAllColCollection;
        tooltip = "<span style ='color:darkblue'><strong>"+ttd.label+"</strong></span><br/>"
        if(pvtAllColCollection.length>0){
          pvtAllColCollection.forEach(function(dispEle, i){
            vcol = dispEle == chData["col_critical"] ? "red" : dispEle==chData["col_warning"] ? "#B5A642":"green";
            disTip += "<span class='clrprimary'><em>"+dispEle+" : </em></span><span style='color:"+vcol+"'>&nbsp"+ttd[dispEle]+"</span>";
            disTip +="<br/>";
            if (ttd.tower_ids != undefined){
              let arrTowers = [...new Set(ttd.tower_ids)];
              disTip += "<span style='color:green'><em>"+arrTowers.length+" Tower(s):</em>&nbsp</span><span>" + arrTowers.join(', ')+"</span>";
            }
            if (ttd.place_name != undefined){
              disTip += "<span style='color:green'> Place Name:</em>&nbsp</span><span class='capitalize'>" +ttd.place_name+"</span>";
            }
            if (ttd.mobile_cnt != undefined){
              disTip += "<br/><span style='color:green'> Mobile Count:</em>&nbsp</span><span class='capitalize'>" +ttd.mobile_cnt+"</span>";
            }
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

        if (ct !='hbar') {y3 = isNaN(yScale(ttd[keyName])) ? ht: yScale(ttd[keyName]);  x1a=yScale(dMM); x2a=0;}
        else {x3 = isNaN(xScale(ttd[keyName]))? 0 : xScale(ttd[keyName]) ; x1a=0; x2a=ht;}
        focus.select('#focusCircle').attr('cx', x3).attr('cy', y3);
        focus.select('#focusLineX').attr('x1', x3).attr('y1', x1a).attr('x2', x3).attr('y2', x2a);
        focus.select('#focusLineY').attr('x1', 0).attr('y1', y3).attr('x2', wid).attr('y2', y3);
        tooltipHtml[idx].html( tooltip )
              .style("top", (d3.event.pageY-window.pageYOffset+10)+"px")
              .style("left", (d3.event.pageX>930 ? 930+10 : d3.event.pageX+10)+"px")
              .style("z-index",1999)
              .transition()
              .duration(200)
              .style("opacity", 0.9);

        d3.select(this).on("click",() => {
          tooltipHtml[idx].style("display",'none');
          let colOne = _.toPairs(toolTipData)[0];
          let arr ={};
          arr[colOne[0]] = colOne[1];
          arr['idx'] = idx;
          // arr['chartData'] = chData;
          arr['selRowData'] = ttd;
          clickOutput.emit(arr);
        });
      }
    });
  }	
}



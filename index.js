var refreshRate = 5000; // in milliseconds
var numPrinters = 0;
var printers = new Object();
var connected = true;

// TODO
// switch to sockJS
// possibly include port field in the Add Printer modal
// edit existing saved printers
// reorder printers
// checkbox for minimizing and not updating a printer

window.onload = function(){
  // get saved printers
  reloadPrinters();
  // update printer info
  setInterval(function () {updatePrinters();}, refreshRate);
};

function seconds2time(seconds) {
    var hours   = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    var seconds = seconds - (hours * 3600) - (minutes * 60);
    var time = "";

    if (hours != 0) {
      time = hours+":";
    }
    if (minutes != 0 || time !== "") {
      minutes = (minutes < 10 && time !== "") ? "0"+minutes : String(minutes);
      time += minutes+":";
    }
    if (time === "") {
      time = seconds+"s";
    }
    else {
      time += (seconds < 10) ? "0"+seconds : String(seconds);
    }
    return time;
}

function reloadPrinters(){
  if(localStorage.getItem("savedPrinters") === null){
      printers ={
          "ip":[],
          "apikey":[],
          "camPort":[]
      };
      $("#noPrintersModal").modal("show");
  }else {
      printers = JSON.parse(localStorage.getItem("savedPrinters"));
      for(var i=0;i<printers.ip.length;i++){
          addPrinter(printers.ip[i], printers.apikey[i], printers.camPort[i]);
      }
  }
}

function initialInfo(ip, apikey, index){
  // add apikey header to GET request
  $.ajaxSetup({headers:{"X-Api-Key" : apikey}});
  // get name of the printer
  $.getJSON("http://"+ip+"/api/printerprofiles", function(json){
    var printerName = null;
    $.each(json.profiles, function(i, v) {
      if (v.current == true) {
        printerName = v.name;
      }
    });
    document.getElementById("printerName"+index).innerHTML=printerName;
  });
  // set the panel footer as the printer's ip
  if(ip.indexOf(":80")===-1){
    document.getElementById("printerIP"+index).innerHTML ="<a href=" + 'http://'+ ip + '/ ' + 'target="_blank"' + '>'+ip+"</a>";
  } else {
    document.getElementById("printerIP"+index).innerHTML ="<a href=" + 'http://'+ ip.replace(":80", "") + '/ ' + 'target="_blank"' + '>'+ip.replace(":80", "")+"</a>";
  }

  updateStatus(ip, apikey, index);
}

function updateStatus(ip, apikey, index){
  // add apikey header to GET request
  $.ajaxSetup({headers:{"X-Api-Key" : apikey}});

  // check for connection to printer
  $.getJSON("http://"+ip+"/api/version", function(json){
    if(json.api === null){
      makeBlank(index);
    }else {
      document.getElementById("panel"+index).className = "panel panel-primary";
      initialInfo(ip, apikey, index);
    }
  })
  .error(function() {
    //document.getElementById("panel"+index).className = "panel panel-danger";
    makeBlank(index);
  });

  // get info on current print job
  $.getJSON("http://"+ip+"/api/job", function(json){
      // get printer state
      document.getElementById("printerStatus"+index).innerHTML="State: "+json.state;
      //get filename of print
      if(json.job.file.name === null || json.state == "Operational"){
          // set current file to no file selected
          document.getElementById("currentFile"+index).innerHTML="No file selected";
          // set time left field to no active print
          document.getElementById("timeLeft"+index).innerHTML="No active print";
          // set print progress bar perecent to 0
          $("div#progressBar"+index ).css("width", "0%");
          // document.getElementById("progressBar"+index).innerHTML="No active print";
          $("div#printerIP"+index).css("background-color", "#05750a");
      }else if (json.state == "Paused") {
        $("div#printerIP"+index).css("background-color", "#ffe404");
      }else {
          // set filename of current print
          document.getElementById("currentFile"+index).innerHTML="File: "+json.job.file.name.split(".").slice(0, -1).join(".");
          // set estimation of print time left
          document.getElementById("timeLeft"+index).innerHTML="Time left: "+ seconds2time(json.progress.printTimeLeft) + "";
          // set percentage of print completion
          $("div#progressBar"+index).css("width", json.progress.completion + "%");
          // $("div#progressBar"+index).html(json.progress.completion).to;
          $("div#printerIP"+index).css("background-color", "#f00");
      }
  })
  .error(function() {
    document.getElementById("panel"+index).className = "panel panel-danger";
    makeBlank(index);
  });


  // get info on temps
  $.getJSON("http://"+ip+"/api/printer", function(json){
      // get temp of extruder 0 and its target temp
      document.getElementById("e0Temp"+index).innerHTML="Extruder: "+json.temperature.tool0.actual+"°/"+json.temperature.tool0.target+"°";
      // get temp of the bed and its target temp
      if(typeof json.temperature.bed !== "undefined" && json.temperature.bed.actual !== null){
        document.getElementById("bedTemp"+index).innerHTML="Bed: "+json.temperature.bed.actual+"°/"+json.temperature.bed.target+"°";
      }else {
        document.getElementById("bedTemp"+index).innerHTML="0°";
      }
  })
  .error(function() {
    document.getElementById("panel"+index).className = "panel panel-danger";
    makeBlank(index);
  });

}

function updatePrinters(){
  for(var i=0;i<numPrinters;i++){
      updateStatus(printers.ip[i],printers.apikey[i], i);
  }
}

function addPrinter(ip, apikey, camPort){
  var printerNum = numPrinters;
  var removeButton = '<li><button type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" onclick="removePrinter('+printerNum+')">Remove Printer <span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button></li>';
  var octoPrintPageButton = '<li><a type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" href="http://'+ip+'/" target="_blank">OctoPrint <span class="glyphicon glyphicon-home" aria-hidden="true"></span></a></li>';

  // add HTML
  $("#printerGrid").append('<div class="col-xs-6 col-md-4" id="printer'+printerNum+'"></div>');
  $("#printer"+printerNum).append('<div class="panel panel-primary" id="panel'+printerNum+'"></div>');

  $("#panel"+printerNum).append('<div class="panel-heading clearfix" id="panelHeading'+printerNum+'"></div>');
  $("#panelHeading"+printerNum).append('<h4 class="panel-title pull-left" style="padding-top: 7.5px;" id="printerName'+printerNum+'">Printer Name</h4></h4>');
  $("#panelHeading"+printerNum).append('<div class="btn-group pull-right" id="btnGroup'+printerNum+'"></div>');
  $("#btnGroup"+printerNum).append('<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false"><span class="glyphicon glyphicon-menu-hamburger" aria-hidden="true" id="menuBtn'+printerNum+'"></span></button>');
  $("#btnGroup"+printerNum).append('<ul class="dropdown-menu" role="menu" id="dropdown'+printerNum+'"></ul>');
  $("#dropdown"+printerNum).append(removeButton);
  $("#dropdown"+printerNum).append(octoPrintPageButton);

  $("#panel"+printerNum).append('<div class="panel-body" id="body'+printerNum+'"></div>');

  webcam = "http://" +ip+"/";
  webcamstream = webcam.split('/')[2].split(':')[0];
  $("#body"+printerNum).append('<image src="http://'+webcamstream+':'+ camPort +'/?action=stream" style="border:none;" width="100%" height="100%"></image>');

  $("#body"+printerNum).append('<p id="printerStatus'+printerNum+'">status</p>');
  $("#body"+printerNum).append('<p id="e0Temp'+printerNum+'">0</p>');
  $("#body"+printerNum).append('<p id="bedTemp'+printerNum+'">0</p>');
  $("#body"+printerNum).append('<p id="currentFile'+printerNum+'">No active print</p>');
  $("#body"+printerNum).append('<p id="timeLeft'+printerNum+'">Print Time Left</p>');

  $("#body"+printerNum).append('<div class="progress" id="progress'+printerNum+'"></div>');
  $("#progress"+printerNum).append('<div class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"  id="progressBar'+printerNum+'"></div>');

  $("#panel"+printerNum).append('<div class="panel-footer" id="printerIP'+printerNum+'">ip</div>');

  // store ip and apikey info
  printers.ip[printerNum]=ip;
  printers.apikey[printerNum]=apikey;
  printers.camPort[printerNum]=camPort;

  // save new printer to local storage
  localStorage.setItem("savedPrinters", JSON.stringify(printers));

  // get initial info on printer
  initialInfo(ip, apikey, printerNum);

  numPrinters++;
}

function addFromModal(){
  var newIP = $("#newIP").val();
  var newPort = $("#newPort").val();
  var newApikey = $("#newApikey").val();
  var camPort = $("#newCamPort").val();

  if(newIP === ""|| newApikey === "" || newPort == ""){
    $("#missingInfoModal").modal("show");
  }else {
    var ipAddress = newIP + ":" + newPort;
    testConnection(ipAddress, newApikey, camPort);
    $("#newIP").val("");
    $("#newPort").val("80");
    $("#newApikey").val("");
    $("#newCamPort").val("");
  }
}

function deletePrinters(){
	// remove the printers from localStorage
	localStorage.removeItem("savedPrinters");
	// remove the printers from the printers object
  printers ={
    "ip":[],
    "apikey":[],
    "camPort":[]
};
	// reset the number of printers
	numPrinters = 0;
	// remove all elements within the grid
	$("#printerGrid").empty();
}

function removePrinter(index){
	var printerNum = index+1;
  bootbox.confirm("Remove printer #"+(printerNum)+"?", function(result) {
  	if(result){
			// remove the printer from the page
			document.getElementById("printer"+index).remove();

			// remove the printer from the printers object
      printers.ip.splice(index, 1);
      printers.apikey.splice(index, 1);
      printers.camPort.splice(index, 1);

			// save new object to localStorage
			if(numPrinters <= 1){
				localStorage.removeItem("savedPrinters");
			}else {
				localStorage.setItem("savedPrinters", JSON.stringify(printers));
			}
			numPrinters = 0;
			$("#printerGrid").empty();
			reloadPrinters();

  	}
	});
}

function makeBlank(index){
  // make panel border color red
  document.getElementById("panel"+index).className = "panel panel-danger";
  // make the status fields blank
  document.getElementById("printerStatus"+index).innerHTML="";
  document.getElementById("e0Temp"+index).innerHTML="";
  document.getElementById("bedTemp"+index).innerHTML="";
  document.getElementById("currentFile"+index).innerHTML="";
  document.getElementById("timeLeft"+index).innerHTML="";
  // set progress bar to 100%
  $("div#progressBar"+index).css("width", "100%");
  // set panel footer to printer ip with not connected messgae
  document.getElementById("printerIP"+index).innerHTML = printers.ip[index]+" (not connected)";
}

function connectionError(ip, apikey){
	var errorMessage = "PrinterView was unable to connect to the OctoPrint instance at <b>"+ip+"</b> using the following API key: "+apikey+". Do you still want to add this printer?";

	bootbox.confirm(errorMessage, function(result){
		if(result){
			addPrinter(ip, apikey, camPort);
		}else {
			return 0;
		}
	});
}

function testConnection(ip, apikey, camPort){
  	$.ajaxSetup({headers:{"X-Api-Key" : apikey}});
  	$.getJSON("http://"+ip+"/api/version", function(json){
  		if(json.api !== null){
        addPrinter(ip, apikey, camPort);
  		}else {
        connectionError(ip, apikey, camPort);
  		}
  	})
  	.error(function(){
      connectionError(ip, apikey, camPort);
  	});
}

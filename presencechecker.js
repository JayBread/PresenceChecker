/**
 * http://usejsdoc.org/
 */

//Imports
var http = require('http'); 


/**
 * Build SoapOptions
 */
function buildSOAPOptions (fritzboxHost,xmlBody) {
	
	var soapOptions =  {
	    hostname: fritzboxHost,
	    port: 49000,
		path: '/upnp/control/hosts',
		method: 'POST',
	    headers: {
	    	'Host': fritzboxHost + ':49000',
	    	'Content-Type': 'text/xml; charset=utf-8',
	        'Content-Length': xmlBody.length.toString(),
	        'SOAPAction': 'urn:dslforum-org:service:Hosts:1#GetSpecificHostEntry',
	    }
	};
	
	return soapOptions;
}

/**
 * BuildUp XMLBody
 * 
 */
function buildXMLBody (macAddress) {
	
	var xmlBody =   "<?xml version='1.0' encoding='UTF-8'?><SOAP-ENV:Envelope SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'" +
	"	  xmlns:xsi='http://www.w3.org/1999/XMLSchema-instance'" +
	"	  xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'" +
	"	  xmlns:xsd='http://www.w3.org/1999/XMLSchema'>" +
	"	<SOAP-ENV:Body>" +
	"		<ns1:GetSpecificHostEntry xmlns:ns1='urn:dslforum-org:service:Hosts:1'>" +
	"			<NewMACAddress xsi:type='xsd:string'>" + macAddress + "</NewMACAddress>" +
	"		</ns1:GetSpecificHostEntry>" +
	"	</SOAP-ENV:Body>" +
	"	</SOAP-ENV:Envelope>";
	
	return xmlBody;
}

/**
 * Starts Node-Red Code here
 */
module.exports = function(RED) {
	
	function CheckPresence(config) {
	
		// Do some init stuff
		RED.nodes.createNode(this,config);
		var node = this;

		// Get config information
		this.macAddress = config.macAddress;
		this.fritzboxhost = config.fritzboxhost;
		this.deviceName = config.deviceName;

		var xmlBody = buildXMLBody(this.macAddress);
		var soapOptions = buildSOAPOptions(this.fritzboxhost,xmlBody);
		node.status({fill:"green",shape:"ring",text:"Device: " + this.deviceName});
		
		/* ON INPUT EVENT */
		this.on('input', function (msg) {
			
			var httpRequest = http.request(soapOptions, function (result) {

				result.setEncoding('utf8');
			    
			    /* ### Set callback functions ### */
			    result.on('data', function (data) {
			        
			        // Find onlinestatus Data 
			        var found = data.match("<NewActive>([0-1])</NewActive>");
			        var foundHostName = data.match("<NewHostName>(.*)</NewHostName>");

			        // Check if something is found
			        if (found != null && found.length > 0) {
				        
				        // Build Message
				        msg.payload = found[1];
				        if (foundHostName != null && foundHostName.length > 0){
				        	msg.deviceName = foundHostName[1];
				        } else {
				        	msg.deviceName = node.deviceName;
				        }

				        if (found[1] == 1) {
				        	msg.onlineStatus = "online"
				        } else {
				        	msg.onlineStatus = "offline"
				        }
			        } else {
			        	
			        	msg.payload = ""; // Error occured!
			        
			        }
	
			        // Send Output Message
			        node.send(msg);
			        
			        // Update Status
			        if (msg.payload != "") {
			        	node.status({fill:"green",shape:"dot",text:msg.deviceName + ":" + msg.onlineStatus});
			        } else {
			        	node.status({fill:"red",shape:"dot",text: msg.deviceName + ":ERROR!"});
			        }
			        	
			    });
			    
			    /* ### Define ON ERROR callback ### */
			    result.on('error', function  (error) {
			    	node.warn('problem with SOAPRequest occured: ' + error.message);
			    	
			    });
			});

			// Send XMLSOAPAction
			httpRequest.write(xmlBody);
			httpRequest.end();
			
		});
	}
	
	RED.nodes.registerType('Device-Presence-FritzBox',CheckPresence)
}


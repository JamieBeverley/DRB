////////////////////////////////////////////////////////////////////////////
// Setup the http server
var http = require('http');
var express = require('express');
var server = http.createServer();
var expressServer = express();

expressServer.use(express.static(__dirname));
server.on('request', expressServer)

server.listen(8000, function(){console.log("server running")})

var WebSocket = require('ws')
var wsServer = new WebSocket.Server({server: server});
var client;


/////////////////////////////////////////////////////////////////////////////
// Set up serial communication with the arduino
var SerialPort = require('serialport');
var Readline = SerialPort.parsers.Readline;
var port = new SerialPort('/dev/tty.usbmodem1411', {
  baudRate: 9600
});

var parser = new Readline();

port.pipe(parser);


wsServer.on('connection', function(r){

	client = r 
	console.log('client connected')
	
	client.on('message',function(message){
		var msg = JSON.parse(message)

		if (msg.type =="vib"){
			console.log("vibrate received with value of: "+msg.value)
			port.write(Buffer.from([msg.value]))
		} else {
			console.log("####### Warning unmatched message received from client:  " +msg)
		}
	});
	client.on('close',function(reasonCode,description){
		console.log("this should not have happened, you might need to reboot it...")
	})
})

var message = Buffer.from([150]);
setTimeout(function(){port.write(message)},3000)
setTimeout(function(){port.write(message)},3000)


parser.on('data',function(data){

	console.log(data);
	if (client!=undefined){	
		var type;
		var value;
		
		// Brutally hacky string parsing...
		if (data[0] == 'l'){   //load
			type = "load"
			value = data.slice(1);

		} else if (data[0]=="v"){  // volume
			type = "vol";
			try{
				value = parseFloat(data.slice(1))	
			} catch (e) {console.log("err parsing");return;}

		} else if (data[0] == "s"){  //scrub
			type = "scrub"
			try{
				value = parseFloat(data.slice(1))	
			} catch (e) {console.log("err parsing"); return;}

		} 

		if(type!=undefined){
			try{
				var msg = {type:type, value:value}
				client.send(JSON.stringify(msg))
			} catch (e){console.log("couldn't parse or send message...")}
		}
		
	}
})


// Read data that is available but keep the stream from entering "flowing mode"
port.on('open', function () {
  console.log("serial port open");
});

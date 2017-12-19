var ac = new (window.AudioContext || window.webkitAudioContext)();
var buffers ={}
var currentBuffer = undefined
var audioElement = document.getElementById("audio")
var audioNode = ac.createMediaElementSource(audioElement);
var analyser = ac.createAnalyser();

audioNode.connect(analyser).connect(ac.destination);

analyser.fftSize = 2048;
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);


var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Create an empty three-second stereo buffer at the sample rate of the AudioContext
var noiseBuffer = ac.createBuffer(2, ac.sampleRate * 3, ac.sampleRate);

// Fill the buffer with white noise;
//just random values between -1.0 and 1.0
for (var channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
  // This gives us the actual ArrayBuffer that contains the data
  var nowBuffering = noiseBuffer.getChannelData(channel);
  for (var i = 0; i < noiseBuffer.length; i++) {
    // Math.random() is in [0; 1.0]
    // audio needs to be in [-1.0; 1.0]
    nowBuffering[i] = Math.random() * 2 - 1;
  }
}

var source = ac.createBufferSource();
source.loop=true;
source.buffer = noiseBuffer;
var noiseGain = ac.createGain();
noiseGain.gain.value = 0;
source.connect(noiseGain).connect(ac.destination);
// start the source playing
source.start();



setInterval(function(){
	analyser.getByteTimeDomainData(dataArray);
	var max =0;
	var v
	for(i in dataArray){
		v = (dataArray[i]/128)-1
		if (v >max){
			max = v
		}
	}

	if(max>0.45){
		try{
			ws.send(JSON.stringify({type:"vib",value:(max-0.35)*254/0.35}))
		} catch (e) {console.log("error sending vibration message")}
	}
},50);
// var gain = ac.createGain();
// gain.gain.value = 0.5;
// audioNode.connect(gain).connect(ac.destination());

try{
var	ws = new WebSocket("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
	console.log("no WebSocket connection")
}


var scrubCounter = 0;
setInterval(function(){scrubCounter=0;},500)
// Message parsing from server
ws.addEventListener('message', function(message){
	var msg = JSON.parse(message.data)
	console.log(msg)

	if (msg.type == "load"){
		loadFile(msg.value)
	} else if (msg.type == "vol"){
		audioElement.volume = Math.max(Math.min(1,msg.value),0);
	} else if (msg.type == "scrub"){
		scrubCounter=scrubCounter+1;
		console.log("scrubbed: "+scrubCounter)
		if(scrubCounter>25 && (currentBuffer!=undefined)){
			buffers[currentBuffer].gain+=0.0001;
			noiseGain.gain.value+=0.0001
			scrubCounter=0;
		}
		audioElement.currentTime = audioElement.currentTime+(msg.value*2) // msg.value is either 1 or -1 (direction)
	}else {
		// console.log("##### Warning - unidentified message from server: "+msg.type)
	}

})


function loadFile(s){
	if (buffers[s]==undefined){
		buffers[s]={gain:0}
	} 
	currentBuffer=s;
	noiseGain.gain.value=buffers[s].gain;
	audioElement.src = s
	audioElement.loop = true;
	audioElement.play()
}
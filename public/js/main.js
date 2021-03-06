var gApp;
var gSock;
var gPeers;
var gLocalMediaStream;
var gSelection;
var gContextMenu;
var gSettingsBar;
var gSidebar;
var gUser;
var gAudioContext = new window.AudioContext();
var gChat;
var gSelf;

// todo
// 
// enable fallback for
// Enable screen capture support in getUserMedia()

function AppController(){
	gApp = this;

	gSock = this.sock = new Sock();
	gUser = this.user = new User();

	this.sock.addEventListener('message', this.onSockMsg.bind(this)); 
	this.sock.addEventListener('open', this.onSockOpen.bind(this));


	gSettingsBar = this.settingsBar = new SettingsBar();
	this.createMainTable();

	gSidebar = this.sideBar = new Sidebar();

	gLocalMediaStream = this.localMediaStream = new LMS();

	gPeers = this.peers = new Peers();

	gChat = this.chat = new Chat();

	gSelection = this.selection = new Selection();

	

	gContextMenu = this.contextMenu = new ContextMenu();
}

AppController.prototype.createMainTable = function(){
	this.$mainTable = document.createElement("div");
	this.$mainTable.className = 'maintbl';
	document.body.appendChild(this.$mainTable);
}

AppController.prototype.onSockOpen = function(){
	this.sock.sendServer("setname", gUser.name);
};

AppController.prototype.onSockMsg = function(e){
	var msg = JSON.parse(e.data);

	// todo 
	// combined message packing
	// 
	// if (msg instanceof Array){
	// 	msg.forEach((function(m){
	// 		this.peers.processMsg(uid, m);
	// 	}).bind(this));
	// }
	// else
	// 
	
	switch (msg[0]){
		case cmdt.server:
		this.peers.processServerMsg(msg[1], msg.slice(2));
		break;

		default:
		this.peers.processUserMsg(msg[0], msg[1], msg.slice(2));
	}	
};

AppController.prototype.kick = function(sel){
	this.sock.sendServerArr('kick', sel.map(function(p){
		return p.uid;
	}));
};

AppController.prototype.ban = function(sel){
	this.sock.sendServerArr('ban', sel.map(function(p){
		return p.uid;
	}));
};
function Chat(){
	this.pubMsgs = [];

	this.createDOM();
}

Chat.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'chat';

	this.$msgs = this.$root.appendChild(
		document.createElement("div")
	);
	this.$msgs.className = 'msgs';


	this.$form = this.$root.appendChild(
		document.createElement('form')
	);
	this.$form.action = 'about:blank';
	this.$form.target = 't';

	this.$input = this.$form.appendChild(
		document.createElement("textarea")
	);
	this.$input.name = 't';

	this.$input.wrap = 'hard';



	this.$iframe = document.createElement('iframe');
	this.$iframe.name = 't';
	this.$iframe.addEventListener('load', this.onIframeLoad.bind(this));
	document.body.appendChild(this.$iframe);



	this.curVal = "";
	this.onInpKeyDown = this.onInpKeyDown.bind(this);
	this.$input.addEventListener('keydown', this.onInpKeyDown);
	this.$input.addEventListener('propertychange', this.onInpKeyDown);
	this.$input.addEventListener('change', this.onInpKeyDown);
	this.$input.addEventListener('input', this.onInpKeyDown);

	gSidebar.$root.appendChild(this.$root);

	this.formSubmit = this.formSubmit.bind(this);
};

Chat.prototype.onIframeLoad = function(){
	var lines = 1;
	var regex = /(?:%0[DA])+/gi;

	var inpval = this.$iframe.contentWindow.location.search;

	while (regex.exec(inpval))
		++lines;

	this.$input.style.height = 1.25 * Math.min(lines, 3) + 'em';
};


Chat.prototype.formSubmit = function(){
	this.$form.submit();
};

Chat.prototype.onInpKeyDown = function(e){
	var val = this.$input.value;

	if ((e.keyCode == 13 || e.keyCode == 14) && !e.shiftKey && !e.altKey && val){
		e.preventDefault();
		gPeers.sendPubChatMsg(val);
		this.$input.value = val = '';	
	}

	if (this.curVal != val){
		this.curVal = val;
		requestAnimationFrame(this.formSubmit);
	}
};


function binaryIndexOfDates(arr, searchElement) {
  var minIndex = 0;
  var maxIndex = arr.length - 1;
  var currentIndex;
  var currentElement;

  while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentElement = +(arr[currentIndex].dataset.d);

      if (currentElement < searchElement) {
          minIndex = currentIndex + 1;
      }
      else if (currentElement > searchElement) {
          maxIndex = currentIndex - 1;
      }
      else {
          return currentIndex;
      }
  }

  return currentIndex;
};

Chat.prototype.gotPubHistory = function(msgs){

	var $dates = Array.prototype.slice.call(
		this.$msgs.querySelectorAll('.msgs > div > div:nth-child(2n + 3)')
	);
	
	for (var i = 0; i < msgs.length; i += 3){
		var name = msgs[i];
		var date = msgs[i + 1];
		var msg = msgs[i + 2];

		var insertionIdx = binaryIndexOfDates($dates, date);
		var $insertionNode = $dates[insertionIdx];
		if ($insertionNode){
			var $ns = $insertionNode.nextSibling;
			if ($insertionNode.parentNode.childNodes[1].textContent == name){
				// dupe message
				if ($insertionNode.dataset.d == date && $ns.textContent == msg)
					continue;

				$dates.splice(insertionIdx + 1, 0, 
					this.insertPubMsg(null, date, msg, $ns)
				);
			}else{
				if ($ns == $ns.parentNode.lastChild)
					$dates.splice(insertionIdx + 1, 0, 
						this.insertPubMsg(name, date, msg, $insertionNode.parentNode)
					);
				else{
					// todo
					// we need to split the message up, and insert between it
				}
			}
		}else{
			$dates.push(
				this.insertPubMsg(name, date, msg, null)
			);
		}

		this.pubMsgs.push(name);
		this.pubMsgs.push(date);
		this.pubMsgs.push(msg);
	}
};

Chat.prototype.onPubMsg = function(name, date, msg){
	this.pubMsgs.push(name);
	this.pubMsgs.push(date);
	this.pubMsgs.push(msg);

	var $msg = this.$msgs.lastChild;

	if ($msg && $msg.childNodes[1].textContent == name){
		this.insertPubMsg(null, date, msg, $msg.lastChild);
	}else{
		this.insertPubMsg(name, date, msg, $msg);
	}
};

Chat.prototype.insertPubMsg = function(name, date, msg, $node){
	var $date;

	if (name){
		var $msg = document.createElement("div");

		var $icon = $msg.appendChild(document.createElement("div"));

		var $peer = $msg.appendChild(document.createElement("div"));
		$peer.textContent = name;

		$date = $msg.appendChild(document.createElement("div"));

		this.$msgs.insertBefore($msg, $node && $node.nextSibling);
	}else{
		$date = $node.parentNode.insertBefore(document.createElement("div"), $node.nextSibling);
	}

	$date.dataset.d = date;
	$date.textContent = (new Date(+date)).toLocaleTimeString().replace(/:\d\d /, ' ');

	var $txt = $date.parentNode.insertBefore(document.createElement("div"), $date.nextSibling);
	$txt.innerHTML = msg.replace(/[&<>]/g, function(chr){
		return ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;'
		})[chr];
	}).replace(/(?:ftp|https?|magnet):\S+/ig, function(url){
		return '<a href="' + url.replace(/"/g, '&quot;') + '">' + url + '</a>';
	});

	var $par = $date.parentNode;
	if ($par.childNodes.length == 4)
		$par.scrollIntoView(true);
	else
		$date.scrollIntoView(true);

	return $date;
}
function ContextMenu(){
	this.createDOM();
	this.addCommand("Kick", "kick");
	this.addCommand("Ban", "ban");
}

ContextMenu.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'ctx';
	this.$root.dataset.visible = false;
	this.$root.style.left = 0;
	this.$root.style.top = 0;

	this.$root.addEventListener('click', this.onContextClick.bind(this));

	document.body.appendChild(this.$root);


	this.onWindowClick = this.onWindowClick.bind(this);

	window.addEventListener('contextmenu', this.onContextMenu.bind(this));
};

ContextMenu.prototype.onContextMenu = function(e){
	e.preventDefault();

	this.visible = true;

	this.$root.style.left = e.pageX + "px";
	this.$root.style.top = e.pageY + "px";
	this.$root.dataset.visible = true;

	window.addEventListener('click', this.onWindowClick);
};

ContextMenu.prototype.onContextClick = function(e){
	var cmd = e.target.dataset.cmd;
	if (!cmd) return;

	// add prompt

	gApp[cmd](gSelection.selection);
};

ContextMenu.prototype.onWindowClick = function(e){
	this.visible = false;
	this.$root.dataset.visible = false;

	window.removeEventListener('click', this.onWindowClick);
};

ContextMenu.prototype.addCommand = function(label, cmd){
	var $li = document.createElement("div");
	$li.dataset.cmd = cmd;
	$li.textContent = label;

	this.$root.appendChild($li);
};
var mediaConstraints = {
	mic: {
		audio: true,
		video: false
	},
	cam: {
		audio: false,
		video: true
	},
	screen: {
		audio: false,
		video: {
		    mandatory: {
		        chromeMediaSource: 'screen'
		    }
		}
	}
};


function LMS(){
	this.analyser = gAudioContext.createAnalyser();
	this.analyserArray = new Uint8Array(this.analyser.frequencyBinCount);

	// todo
	// tried but didn't work
	// blank audio track can be gotten from getUserMedia audio: true, fake:true ??
	
	this.stream = new window.MediaStream([
		this.blankAudioTrack = 
			gAudioContext.createMediaStreamDestination()
				.stream.getAudioTracks()[0]
	]);


	// todo firefox
	// navigator.GetUserMedia({ audio: true, fake: true }, (function(stream){
	// 	this.stream = stream;
	// }).bind(this), function(){});

	requestAnimationFrame(
		this.processAudio = this.processAudio.bind(this)
	);

	this.createDOM();

	this.tracks = {
		mic: this.blankAudioTrack,
		cam: null,
		screen: null
	};
};

LMS.prototype.processAudio = function(e){
	this.analyser.getByteFrequencyData(this.analyserArray);
	var avg = 0;
	for (var i = this.analyserArray.length; i--;)
		avg += this.analyserArray[i];

	this.$micDB.style.width =
		(100 * avg / this.analyserArray.length / (this.analyser.maxDecibels - this.analyser.minDecibels)) + '%';

	requestAnimationFrame(this.processAudio);
};

LMS.prototype.createDOM = function(){
	this.$camVid = document.createElement('video');
	this.$camVid.autoplay = true;
	gSettingsBar.$camToggle.appendChild(this.$camVid);

	this.$screenVid = document.createElement('video');
	this.$screenVid.autoplay = true;
	gSettingsBar.$screenToggle.appendChild(this.$screenVid);

	this.$micDB = document.createElement('div');
	this.$micDB.className = 'db';
	gSettingsBar.$micToggle.appendChild(this.$micDB);
};

LMS.prototype.renderStreams = function(){
	if (this.tracks.cam){
		this.$camVid.src = URL.createObjectURL(new window.MediaStream(
			[this.tracks.cam]
		));
	}else{
		this.$camVid.removeAttribute('src');
	}

	if (this.tracks.screen){
		this.$screenVid.src = URL.createObjectURL(new window.MediaStream(
			[this.tracks.screen]
		));
	}else{
		this.$screenVid.removeAttribute('src');
	}
}

LMS.prototype.setTrackEnabled = function(type, enabled){
	if (enabled){
		this.getUserMedia(type);
	}else{
		var track = this.tracks[type];
		if (track && track != this.blankAudioTrack){
			if (type == 'mic')
				this.stream.addTrack(this.tracks.mic = this.blankAudioTrack);
			else
				delete this.tracks[type];

			this.stream.removeTrack(track);
			track.stop();
			this.onLocalStreamChanged();
		}
	}
}

LMS.prototype.getUserMedia = function(type){

	navigator.GetUserMedia(mediaConstraints[type], (function(stream){
		if (!gSettingsBar.toggles[type]) return;

		var audioTrack = stream.getAudioTracks()[0];
		if (audioTrack){
			var oldTrack = this.tracks.mic;
			this.stream.addTrack(audioTrack);
			if (oldTrack){
				this.stream.removeTrack(oldTrack);
				if (oldTrack != this.blankAudioTrack)
					oldTrack.stop();
			}
			this.tracks.mic = audioTrack;

			this.analyser.disconnect();
			gAudioContext.createMediaStreamSource(this.stream).connect(this.analyser);
		}

		var videoTrack = stream.getVideoTracks()[0];
		if (videoTrack){
			var oldTrack = this.tracks[type];
			if (oldTrack){
				this.stream.removeTrack(oldTrack);
				oldTrack.stop();
			}
			this.stream.addTrack(this.tracks[type] = videoTrack);
		}

		this.onLocalStreamChanged();
	}).bind(this), function(err){
		console.log(err);
		alert("Could not get media stream. Please enable camera or microphone access!");
	});
}

LMS.prototype.onLocalStreamChanged = function(first_argument) {
	this.renderStreams();
	gPeers.onLocalStreamChanged();
};
var rtcConfig = { 
	iceServers: [{ 
		url: "stun:stun.l.google.com:19302" 
	}]
};

var rtcConstraints = {
	optional: [
	// {
	// 	RtpDataChannels: true
	// },
	{
		DtlsSrtpKeyAgreement: true
	}],
	mandatory: {
		OfferToReceiveAudio: true,
		OfferToReceiveVideo: true,
		VoiceActivityDetection: true,
    	IceRestart: true
	}
};

function Peer(uid){

	this.uid = uid;
	this.name = "";

	this.createDOM();
	this.onStreamChanged = this.onStreamChanged.bind(this);


	// todo
	// we might be able to do this with getStats
	this.analyser = gAudioContext.createAnalyser();
	this.analyserArray = new Uint8Array(this.analyser.frequencyBinCount);


	this.onResizerMouseMove = this.onResizerMouseMove.bind(this);
	this.onResizerMouseUp = this.onResizerMouseUp.bind(this);


	this.onIceCandidate = this.onIceCandidate.bind(this);
	this.onAddStream = this.onAddStream.bind(this);
	this.onRemoveStream = this.onRemoveStream.bind(this);
	this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
	this.onSignalingStateChange = this.onSignalingStateChange.bind(this);
	this.onDataChannel = this.onDataChannel.bind(this);
	this.onDataChannelMessage = this.onDataChannelMessage.bind(this);
	this.onDataChannelOpen = this.onDataChannelOpen.bind(this);
	this.onDataChannelError = this.onDataChannelError.bind(this);
	this.onDataChannelClose = this.onDataChannelClose.bind(this);

	if (this.uid == gUser.uid){
		gSelf = this;
		this.send = this.selfSend;
		this.onAddStream({
			stream: gLocalMediaStream.stream
		});
		this.onLocalStreamChanged = this.onStreamChanged;
	}else{
		this.sendOffer();
		if (gChat.pubMsgs.length)
			this.sendArr('pubchathistory', gChat.pubMsgs);
	}

	requestAnimationFrame(
		this.processAudio = this.processAudio.bind(this)
	);
	
};

// Peer.prototype.onStreamsResized = function(){
// 	this.$streamElts.forEach(function($stream, i){
// 		var computedStyle = window.getComputedStyle($stream);
// 		var width = 100 * parseInt(computedStyle.getPropertyValue("width")) / window.innerWidth;
// 		var height = 100 * parseInt(computedStyle.getPropertyValue("height")) / window.innerHeight;
		
// 		$stream.style.width = width + 'vw';
// 		$stream.style.height = height + 'vh';
// 	});
// };

Peer.prototype.selfSend = function(type){
	type = ucmd[type];

	this.processMsg(type, Array.prototype.slice.call(arguments, 1));
};

Peer.prototype.processAudio = function(e){
	this.analyser.getByteFrequencyData(this.analyserArray);
	var avg = 0;
	for (var i = this.analyserArray.length; i--;)
		avg += this.analyserArray[i];

	var pct = (100 * avg / this.analyserArray.length / (this.analyser.maxDecibels - this.analyser.minDecibels));

	this.$lMicDB.style.height = this.$micDB.style.width = pct + '%';
	this.$lMicToggle.dataset.db = pct;

	requestAnimationFrame(this.processAudio);
};


Peer.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "peer";

	this.$micDB = this.$root.appendChild(document.createElement("div"));
	this.$micDB.className = "db";

	this.$root.dataset.vids = 0;

	this.$name = this.$root.appendChild(document.createElement("div"));
	this.$name.className = "name";
	this.$name.textContent = this.name;

	this.$ava = this.$root.appendChild(document.createElement("div"));
	this.$ava.className = 'ava';

	this.$streams = this.$root.appendChild(document.createElement("div"));
	this.$streams.className = "streams";

	this.$streams.addEventListener('mousedown', this.onStreamsMouseDown.bind(this));

	this.$streamElts = [];

	for (var i = 0; i < 3; ++i){
		var $stream = document.createElement('div');
		$stream.className = 'stream';
		$stream.style.width = '10vw';
		$stream.style.height = '10vw';
		this.$streamElts.push($stream);
		this.$streams.appendChild($stream);
	}

	// this.$streams.addEventListener('mouseup', this.onStreamsResized.bind(this));

	this.$audio = this.$root.appendChild(document.createElement("audio"));
	this.$audio.autoplay = true;

	gPeers.$root.appendChild(this.$root);


	this.$lroot = document.createElement("div");
	this.$lroot.className = "peer";

	this.$licon = this.$lroot.appendChild(document.createElement("div"));
	this.$licon.className = "icon";

	this.$lname = this.$lroot.appendChild(document.createElement("div"));
	this.$lname.className = "name";
	this.$lname.textContent = this.name;

	this.$linfo = this.$lroot.appendChild(document.createElement("div"));
	this.$linfo.className = "info";

	this.$lMicDB = this.$linfo.appendChild(document.createElement("div"));
	this.$lMicDB.className = "db";

	this.$lMicToggle = this.$linfo.appendChild(document.createElement("div"));
	this.$lMicToggle.className = "mic";

	this.$lMicToggle.dataset.db = 0;

	this.$lCamToggle = this.$linfo.appendChild(document.createElement("div"));
	this.$lCamToggle.className = "cam";

	this.$lCamToggle.dataset.vids = 0;


	


	gPeers.$lroot.appendChild(this.$lroot);
};

Peer.prototype.onStreamsMouseDown = function(e){
	var $target = e.target;
	if ($target.className != 'stream') return;
	
	var rect = $target.getBoundingClientRect();

	// if (e.clientX - rect.right > 16 || e.clientY - rect.bottom > 16) return;

	this.resizeTarget = $target;
	this.resizeRect = rect;
	window.addEventListener('mousemove', this.onResizerMouseMove);
	window.addEventListener('mouseup', this.onResizerMouseUp);
}

Peer.prototype.onResizerMouseMove = function(e){
	this.resizeTarget.style.width = (100 * (e.clientX - this.resizeRect.left) / window.innerWidth) + 'vw';
	this.resizeTarget.style.height = (100 * (e.clientY - this.resizeRect.top) / window.innerHeight) + 'vh';
};

Peer.prototype.onResizerMouseUp = function(){
	window.removeEventListener('mousemove', this.onResizerMouseMove);
	window.removeEventListener('mouseup', this.onResizerMouseUp);
};

Peer.prototype.onNameChanged = function(){
	this.$name.textContent = this.name;
	this.$lname.textContent = this.name;
}

Peer.destroyRTCConnection = function(pc){
	if (!pc) return;

	pc.onicecandidate =
	pc.oniceconnectionstatechange =
	pc.onsignalingstatechange =
	pc.onaddstream = 
	pc.onremovestream =
		null;

	pc.getLocalStreams().forEach(function(s){
		pc.removeStream(s);
	});

	pc.close();
}

Peer.prototype.createOfferedPeerConnection = function(){
	Peer.destroyRTCConnection(this.offeredConnection);

	this.offeredConnection = this.createPeerConnection();
	this.offeredConnection.addStream(gLocalMediaStream.stream);

	Peer.destroyDataChannel(this.offeredDC);

	this.offeredDC = this.createDataChannel(this.offeredConnection);
};

Peer.prototype.createAnsweredPeerConnection = function(){
	Peer.destroyRTCConnection(this.answeredConnection);

	this.answeredConnection = this.createPeerConnection();
	this.answeredConnection.onaddstream = this.onAddStream;
	this.answeredConnection.onremovestream = this.onRemoveStream;

	Peer.destroyDataChannel(this.answeredDC);

	this.answeredDC = this.createDataChannel(this.answeredConnection);
}

Peer.prototype.createPeerConnection = function(){
	var pc = new window.RTCPeerConnection(rtcConfig, rtcConstraints);
	pc.onicecandidate = this.onIceCandidate;
	pc.oniceconnectionstatechange = this.onIceConnectionStateChange;
	pc.onsignalingstatechange = this.onSignalingStateChange;
	pc.ondatachannel = this.onDataChannel;

	return pc;
};

Peer.prototype.onDataChannel = function(e){
	if (e.target == this.answeredConnection){
		// Peer.destroyDataChannel(this.answeredDC);
		this.answeredDC = e.channel;
	}else{
		// Peer.destroyDataChannel(this.offeredDC);
		this.offeredDC = e.channel;
	}
};

Peer.prototype.createDataChannel = function(pc){
	var dc = pc.createDataChannel('', {
		// ordered: true,
		// reliable: true,
		// negotiated: true
	});

	dc.onmessage = this.onDataChannelMessage;
	dc.onopen = this.onDataChannelOpen;
	dc.onerror = this.onDataChannelError;
	dc.onclose = this.onDataChannelClose;

	return dc;
}

Peer.prototype.onDataChannelOpen = function(e){
	// console.log(e);
};

Peer.prototype.onDataChannelError = function(e){
	console.log(e);
};

Peer.prototype.onDataChannelClose = function(e){
	// console.log(e);
};

Peer.prototype.onDataChannelMessage = function(msg){
	// console.log(msg);
	msg = JSON.parse(msg.data);


	this.processMsg(msg[0], msg.slice(1));
};

Peer.prototype.send = function(type){
	this.sendArr(
		type, Array.prototype.slice.call(arguments, 1)
	);
};

Peer.prototype.sendArr = function(type, arr){
	type = ucmd[type];

	var dc = this.getOpenDataChannel();

	if (dc)
		try {
			dc.send(JSON.stringify(
				[type].concat(arr)
			));
		}catch(e){
			this.sockSendArr(type, arr);
		}
	else
		this.sockSendArr(type, arr);
};

Peer.prototype.sockSend = function(type){
	this.sockSendX(ucmd[type], Array.prototype.slice.call(arguments, 1));
}

Peer.prototype.sockSendArr = function(type, arr){
	gSock.send(JSON.stringify(
		[this.uid, type].concat(arr)
	));
};

Peer.prototype.getOpenDataChannel = function(){
	if (this.offeredDC && this.offeredDC.readyState == "open")
		return this.offeredDC;
	if (this.answeredDC && this.answeredDC.readyState == "open")
		return this.answeredDC;
}

Peer.prototype.onIceCandidate = function(e){

	var candidate = e.candidate;

	if (candidate)
		this.send('icecandidate', +(e.target == this.offeredConnection), candidate);
};

Peer.prototype.onAddStream = function(e){
	this.stream = e.stream;
	this.stream.onaddtrack = this.stream.onremovetrack = this.onStreamChanged;
	this.onStreamChanged();
};

Peer.prototype.onRemoveStream = function(e){
	if (this.stream != e.stream) return;

	this.stream = null;
	this.analyser.disconnect();

	this.onStreamChanged();
};

Peer.prototype.onStreamChanged = function(){
	var $elt;
	this.$streamElts.forEach(function($stream){
		var $child = $stream.firstChild;
		if ($child)
			$stream.removeChild($child);
	});


	var vidTracks = this.stream.getVideoTracks();
	this.$lCamToggle.dataset.vids = this.$root.dataset.vids = vidTracks.length + +!!this.$dispimg;

	var streamIdx = 0;

	vidTracks.forEach((function(track){
		var $wrapper = this.$streamElts[streamIdx++];
		var $stream = $wrapper.appendChild(document.createElement('video'));
		$stream.autoplay = true;
		$stream.src = URL.createObjectURL(new window.MediaStream(
			[track]
		));
		$stream.controls = "controls";
	}).bind(this));


	if (this.$dispimg){
		this.$streamElts[streamIdx++].appendChild(this.$dispimg);
	}

	this.analyser.disconnect();
	gAudioContext.createMediaStreamSource(this.stream).connect(this.analyser);

	// we don't need no echo!
	if (this.uid == gUser.uid) return;

	var audioTrack = this.stream.getAudioTracks()[0];
	if (audioTrack){
		this.$audio.src = URL.createObjectURL(this.stream);
	}else{
		this.$audio.removeAttribute('src');
	}
};

Peer.prototype.setName = function(name){
	this.name = name;
	this.onNameChanged();
};

Peer.prototype.updateDispImg = function(src){
	this.$dispimg = document.createElement('img');
	this.$dispimg.src = src;
	this.onStreamChanged();
}

Peer.prototype.processMsg = function(type, msg){

	switch(type){

		case ucmd.dispimg:
			this.updateDispImg(msg[0]);
		break;

		case ucmd.pubchathistory:
			gChat.gotPubHistory(msg);
		break;

		case ucmd.pubchat:
			gChat.onPubMsg(this.name, msg[0], msg[1]);
		break;

		case ucmd.answer:
			this.offeredConnection.setRemoteDescription(new RTCSessionDescription(msg[0]), function(){}, (function(e){
				console.log(e);
			}).bind(this));
		break;

		case ucmd.icecandidate:
			var candidate = new RTCIceCandidate(msg[1]);
			try {
				(msg[0] ? this.answeredConnection : this.offeredConnection).addIceCandidate(candidate);
			} catch(e) {
				console.log(e);
			}
		break;

		case ucmd.offer:
			this.createAnsweredPeerConnection();
			this.answeredConnection.setRemoteDescription(new RTCSessionDescription(msg[0]), (function() {
				this.answeredConnection.createAnswer((function(answer) {
					this.answeredConnection.setLocalDescription(answer, (function() {
						this.send('answer', answer);
					}).bind(this), (function(e){
						console.log(e);
					}).bind(this));
				}).bind(this), null, rtcConstraints);
			}).bind(this), function(e){
				console.log(e);
			});
		break;
	}
};

Peer.prototype.withConnections = function(f){
	f(this.offeredConnection);
	f(this.answeredConnection);
};

Peer.prototype.withChannels = function(f){
	f(this.offeredDC);
	f(this.answeredDC);
};

Peer.destroyDataChannel = function(dc){
	if (!dc) return;

	dc.close();
};

Peer.prototype.queryConnections = function(f){
	return f(this.offeredConnection) && f(this.answeredConnection);
}

Peer.prototype.sendOffer = function(){
	this.createOfferedPeerConnection();
	this.offeredConnection.createOffer((function(offer) {
		this.offeredConnection.setLocalDescription(offer, (function(){
			this.send('offer', offer);
		}).bind(this));
	}).bind(this), null, rtcConstraints);
};

Peer.prototype.onLocalStreamChanged = function(){
	this.sendOffer();
};

Peer.prototype.setSelected = function(selected){
	this.$root.dataset.selected = selected;
};

Peer.prototype.onIceConnectionStateChange = function(e){
	// console.log("ice",e.target.iceConnectionState);
	if (this.queryConnections(function(pc){
		return pc.iceConnectionState == "closed" || pc.iceConnectionState == "disconnected";
	}))
		this.destroy();
};

Peer.prototype.onSignalingStateChange = function(e){
	// console.log("sig", e.target.signalingState);
	if (this.queryConnections(function(pc){
		return pc.signalingState == "closed" || pc.signalingState == "closing";
	}))
		this.destroy();
}

Peer.prototype.destroy = function(){
	gPeers.$root.removeChild(this.$root);
	gPeers.$lroot.removeChild(this.$lroot);

	this.withConnections(Peer.destroyRTCConnection);
	this.withChannels(Peer.destroyDataChannel);

	delete gPeers.peers[this.uid];
};
function Peers(){
	this.peers = {};

	this.fileReaderOnload = this.fileReaderOnload.bind(this);


	this.onResizerMouseMove = this.onResizerMouseMove.bind(this);
	this.onResizerMouseUp = this.onResizerMouseUp.bind(this);

	this.createDOM();
}

Peers.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'peers';

	this.$root.addEventListener('dragover', this.onDragOver.bind(this));
	this.$root.addEventListener('drop', this.onDrop.bind(this));

	this.$lroot = this.$root.appendChild(
		document.createElement("div")
	);

	this.$lroot.className = 'peerlist';
	this.$lroot.style.height = (localStorage.lrh || 50) + 'vh';
	this.$lroot.addEventListener("mousedown", this.onLRootMouseDown.bind(this));

	
	gSidebar.$root.appendChild(this.$lroot);
	gApp.$mainTable.appendChild(this.$root);
};

Peers.prototype.onLRootMouseDown = function(e){
	if (e.target.className != 'peerlist') return;
	
	this.resizeRect = this.$lroot.getBoundingClientRect();

	// if (e.clientX - rect.right > 16 || e.clientY - rect.bottom > 16) return;

	window.addEventListener('mousemove', this.onResizerMouseMove);
	window.addEventListener('mouseup', this.onResizerMouseUp);
}

Peers.prototype.onResizerMouseMove = function(e){
	// this.$lroot.style.width = (100 * (e.clientX - this.resizeRect.left) / window.innerWidth) + 'vw';
	var lrh = (100 * (e.clientY - this.resizeRect.top) / window.innerHeight);
	localStorage.lrh = lrh;
	this.$lroot.style.height = lrh + 'vh';
};

Peers.prototype.onResizerMouseUp = function(){
	window.removeEventListener('mousemove', this.onResizerMouseMove);
	window.removeEventListener('mouseup', this.onResizerMouseUp);
};

Peers.prototype.onDragOver = function(e){
	e.preventDefault();
	e.stopPropagation();
	e.dataTransfer.dropEffect = 'copy';
};

Peers.prototype.onDrop = function(e){
	e.preventDefault();
	e.stopPropagation();
	
	var file = e.dataTransfer.files[0];
	if (!file) return;
	if (!/^image\//.test(file.type)) return;

	var fr = new FileReader();
	fr.onload = this.fileReaderOnload;
	fr.readAsDataURL(file);
};

Peers.prototype.fileReaderOnload = function(e){
	var result = e.target.result;

	// datachannel doesnt support large files
	gSock.sendAll('dispimg', result);
	gSelf.updateDispImg(result);

	// this.forEachPeer(function(p){
	// 	p.send('dispimg', result);
	// });
};

Peers.prototype.processUserMsg = function(uid, type, msg){
	var sender = this.peers[uid];

	if (!sender)
		sender = this.peers[uid] = new Peer(uid, type);

	sender.processMsg(type, msg);
};

Peers.prototype.processServerMsg = function(type, msg){
	switch(type){
		case fscmd.init:
		gUser.uid = msg[0];
		var names = msg[1];
		for (var name in names)
			this.getPeer(names[name]).setName(name);
		break;

		case fscmd.disconnected:
		var peer = this.peers[msg[0]];
		if (peer)
			peer.destroy();
		break;

		case fscmd.setname:
		this.getPeer(msg[0]).setName(msg[1]);
		break;
	}
};

Peers.prototype.sendPubChatMsg = function(msg){
	this.forEachPeer(function(p){
		p.send("pubchat", Date.now(), msg);
	});
};

Peers.prototype.getPeer = function(uid){
	var peer = this.peers[uid];
	if (peer) return peer;

	return (this.peers[uid] = new Peer(uid));
};

Peers.prototype.onLocalStreamChanged = function(){
	this.forEachPeer(function(p){
		p.onLocalStreamChanged();
	});
};

Peers.prototype.forEachPeer = function(f){
	for (var uid in this.peers)
		f(this.peers[uid]);
}
function Selection(){
	this.selection = [];
	this.rect = {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};

	this.createDOM();
}


Selection.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "selection";
	this.$root.style.left = 0;
	this.$root.style.top = 0;
	this.$root.dataset.visible = false;

	document.body.appendChild(this.$root);

	gPeers.$root.addEventListener('mousedown', this.onMouseDown.bind(this));
	window.addEventListener('mouseup', this.onMouseUp.bind(this));
};


Selection.prototype.onMouseDown = function(e){
	if (e.button) return;
	
	this.$root.style.width = 
	this.$root.style.height = "0px";

	this.$root.dataset.visible = true;

	this.rect.left = this.rect.bottom = this.initialX = e.pageX;
	this.rect.top = this.rect.bottom = this.initialY = e.pageY;

	this.onMouseMove = this.onMouseMove.bind(this);
	window.addEventListener('mousemove', this.onMouseMove);
};

Selection.prototype.onMouseMove = function(e){

	var endX = e.pageX;
	var endY = e.pageY;

	if (endX > this.initialX){
		
		this.rect.left = this.initialX;
		this.rect.right = endX;

		this.$root.style.left = this.initialX + "px"
		this.$root.style.width = (endX - this.initialX) + "px";
	}else{
		
		this.rect.left = endX;
		this.rect.right = this.initialX;

		this.$root.style.left = endX + "px";
		this.$root.style.width = (this.initialX - endX) + "px";
	}

	if (endY > this.initialY){
		this.rect.top = this.initialY;
		this.rect.bottom = endY;

		this.$root.style.top = this.initialY + "px";
		this.$root.style.height = (endY - this.initialY) + "px";
	}else{
		this.rect.top = endY;
		this.rect.bottom = this.initialY;

		this.$root.style.top = endY + "px";
		this.$root.style.height = (this.initialY - endY) + "px";
	}

	this.update();
};

Selection.prototype.update = function(){
	this.selection.length = 0;

	for (var k in gPeers.peers){
		var peer = gPeers.peers[k];
		var rect = peer.$root.getBoundingClientRect();

		if (rect.left <= this.rect.right &&
           rect.right >= this.rect.left &&
           rect.top <= this.rect.bottom &&
           rect.bottom >= this.rect.top
		){
			peer.setSelected(true);
			this.selection.push(peer);
		}else{
			peer.setSelected(false);
		}
	}
};

Selection.prototype.onMouseUp = function(e){
	this.onMouseMove(e);

	window.removeEventListener('mousemove', this.onMouseMove);
	this.$root.dataset.visible = false;	
};

function SettingsBar(){
	this.toggles = {};
	this.createDOM();
}

SettingsBar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = "settingsbar";

	this.$root.addEventListener('click', this.onBarClick.bind(this));

	this.onToggleClicked = this.onToggleClicked.bind(this);
	this.$micToggle = this.addToggleButton("mic");
	this.$camToggle = this.addToggleButton("cam");
	this.$screenToggle = this.addToggleButton("screen");

	this.hideMenuBtn = this.hideMenuBtn.bind(this);

	this.$menuBtn = this.$root.appendChild(document.createElement("div"));
	this.$menuBtn.className = "menubtn btn";
	this.$menuBtn.dataset.btntype = "menu";

	this.$menuBtn.addEventListener('click', this.onMenuBtnClicked.bind(this));

	this.$menu = this.$menuBtn.appendChild(document.createElement("div"));
	this.$menu.className = 'menu';


	this.addMenuCommand("Change Nickname", "changenick");

	document.body.appendChild(
		this.$root
	);
}

SettingsBar.prototype.onBarClick = function(e){
	var $target = e.target;
	switch ($target.dataset.btntype){
		case "toggle":
		this.onToggleClicked($target);
		break;

		case "menuitem":
		this.onMenuItemClicked($target);
	}
};

SettingsBar.prototype.onMenuBtnClicked = function(e){
	var $target = e.target;

	if ($target.dataset.cmd){
		this.onMenuItemClicked($target);
		return;
	}

	if ($target != this.$menuBtn) return;

	if ((this.$menuBtn.dataset.showmenu = !(this.$menuBtn.dataset.showmenu == "true"))){
		setTimeout((function(){
			window.addEventListener('click', this.hideMenuBtn);
		}).bind(this));
	}
};

SettingsBar.prototype.hideMenuBtn = function(){
	window.removeEventListener('click', this.hideMenuBtn);
	this.$menuBtn.dataset.showmenu = false;
}

SettingsBar.prototype.onMenuItemClicked = function($item){
	switch ($item.dataset.cmd){
		case "changenick":
		gUser.promptToChangeName();
		break;
	}
}

SettingsBar.prototype.onToggleClicked = function($btn){
	var cmd = $btn.dataset.cmd;

	var pressed = this.toggles[cmd] = ($btn.dataset.pressed == 'false');
	$btn.dataset.pressed = pressed;

	gLocalMediaStream.setTrackEnabled(cmd, pressed);
};

SettingsBar.prototype.addToggleButton = function(cmd, cb){
	var $btn = document.createElement("div");
	$btn.className = "btn";
	$btn.dataset.btntype = "toggle";
	$btn.dataset.cmd = cmd;
	$btn.dataset.pressed = false;

	this.$root.appendChild($btn);

	return $btn;
};

SettingsBar.prototype.addMenuCommand = function(label, cmd){
	var $opt = document.createElement("div");
	$opt.textContent = label;
	$opt.dataset.cmd = cmd;
	this.$menu.appendChild($opt);
};
function Sidebar(){
	this.createDOM();
}

Sidebar.prototype.createDOM = function(){
	this.$root = document.createElement("div");
	this.$root.className = 'sidebar';

	gApp.$mainTable.appendChild(this.$root);
}
function Sock(){
	this.sock = new WebSocket(
		"wss://" + document.domain
	);
};

Sock.prototype.ready = function(){
	return this.sock.readyState == WebSocket.prototype.OPEN;
};

Sock.prototype.send = function(txt){
	this.sock.send(txt);
};

Sock.prototype.sendAll = function(type){
	this.sendAllArr(
		type, Array.prototype.slice.call(arguments, 1)
	);
};

Sock.prototype.sendAllArr = function(type, arr){
	this.send(JSON.stringify(
		[cmdt.all, ucmd[type]].concat(arr)
	));
};

Sock.prototype.sendServer = function(type){
	this.sendServerArr(
		type, Array.prototype.slice.call(arguments, 1)
	);
};

Sock.prototype.sendServerArr = function(type, arr){
	this.send(JSON.stringify(
		[cmdt.server, tscmd[type]].concat(arr)
	));
}

Sock.prototype.addEventListener = function(type, cb){
	this.sock.addEventListener(type, cb);
};

Sock.prototype.removeEventListener = function(type, cb){
	this.sock.removeEventListener(type, cb);
};
function User(){
	this.restore();
}

User.prototype.restore = function(){
	this.setName(localStorage.name);
	
	if (!this.name)
		this.promptToChangeName();
};

User.prototype.promptToChangeName = function(){
	var name;

	do {
		name = prompt("Please enter your name:").trim();
	} while(!name);

	this.setName(name);
}

User.prototype.setName = function(name){
	// todo
	this.name = localStorage.name = name;
	if (gSock.ready())
		gSock.sendServer('setname', this.name);
};

User.prototype.setUID = function(uid){
	this.uid = uid;
};
(function(){

	var prefixes = ["moz", "webkit", "ms", "o"];

	function fixPrefixedMethods(obj, fnames){
		fnames.forEach(function(fname){
			if (obj[fname]) return;

			prefixes.some(function(prefix){
				var prefixedName = prefix + fname;
				if (obj[prefixedName]){
					obj[fname] = obj[prefixedName];
					return true;
				}
			});
		});
	}

	fixPrefixedMethods(window, ["AudioContext", "MediaStream", "RTCPeerConnection"]);
	fixPrefixedMethods(navigator, ["GetUserMedia"]);

})();
(function(){
	var exports = (typeof window == 'undefined' ? module.exports : window);


	function constants(){
		var o = {};
		for (var i = arguments.length; i--;)
			o[arguments[i]] = i;

		return o;
	}

	exports.cmdt = constants("server","all");
	exports.fscmd = constants("setname", "disconnected", "init");
	exports.tscmd = constants("setname", "kick", "ban");
	exports.ucmd = constants("dispimg", "icecandidate", "offer", "answer", "pubchat", "pubchathistory");
})();
window.onload = function(){
	window.onload = null;
	new AppController();
};
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
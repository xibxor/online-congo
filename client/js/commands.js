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
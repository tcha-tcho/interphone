if (!Object.extend) {
  Object.prototype.extend = function() {
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key))
          arguments[0][key] = arguments[i][key];
    return arguments[0];
  }
};

if (!set_cookie) {
  var set_cookie = function (sKey,sValue) {
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue);
    return sValue;
  }
  var get_cookie = function (sKey) {
    var regex = new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$");
    return decodeURIComponent(document.cookie.replace(regex, "$1")) || null;
  }
};

function get_host(win) {
  return win.location.protocol + "//" + win.location.hostname;
}

function crossCookie(config) {
  this.defaults = {
     allowed_hosts: "*"
    ,serverUrl: "https://rawgit.com/tcha-tcho/crossCookie/master/test/server.html"
    ,protected_cookies: []
    ,on_ready: function(){}
    ,on_cookie: function(){}
  }
  this.init(config);
}

var win = window;
var frame;
var interval;
var is_ready;

crossCookie.prototype.send = function (obj) {
  frame.postMessage(JSON.stringify(obj), "*");
}

crossCookie.prototype.setup_iframe = function () {
  // Create hidden iframe dom element
  var doc = win.document;
  window.doc = doc
  var iframe = doc.createElement('iframe');
  var iframeStyle = iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  // Append iframe to the dom and load up crossCookie.org inside
  doc.head.appendChild(iframe);
  iframe.src = this.o.serverUrl;
  return iframe;
};
crossCookie.prototype.set_local_cookie = function(sKey,sVal) {
  if (sVal != get_cookie(sKey)) {
    set_cookie(sKey,sVal);
  }
}

crossCookie.prototype.get = function(sKey,callback) {
  frame.postMessage('{"CCget":"'+sKey+'"}', "*");
}

crossCookie.prototype.is_protected = function(sKey) {
  return (this.o.protected_cookies.indexOf(sKey) != -1);
}

crossCookie.prototype.set = function(sKey,sVal) {
  this.set_local_cookie(sKey,sVal);
  if (!this.is_protected(sKey)) {
    console.log("enviando")
    this.send({CCset_cookie:[sKey,sVal]});
  };
}

crossCookie.prototype.onMessage = function (event,_self) {
  if (_self.o.allowed_hosts != "*") {
    if (event.origin != get_host(frame)) return;
    if (_self.o.allowed_hosts.indexOf(get_host(frame)) == -1) return;
  };
  if (!event.data) return;
  var msg = JSON.parse(event.data);
  if(!msg) return;
  console.log(event.origin, JSON.stringify(msg))
  if (msg.CCim_ready) {
    is_ready = true;
    _self.o.on_ready();
  } else if (msg.CCare_you_ready) { //?
    _self.send({"CCim_ready":true});
  } else if (msg.CCget) {
    if (_self.is_protected(msg.CCget)) {
      var cookie = "!protected"
    } else {
      var cookie = get_cookie(msg.CCget);
    };
    _self.send({"CCresponse":[msg.CCget,cookie]});
  } else if (msg.CCset_cookie) {
    var sKey = msg.CCset_cookie[0];
    if (_self.is_protected(sKey)) {
      var cookie = "!protected";
    } else {
      var cookie = msg.CCset_cookie[1];
      _self.set_local_cookie(sKey,cookie);
    };
    _self.send({"CCresponse":[sKey,cookie]});
  } else if (msg.CCresponse) {
    console.log("recebeu cookie")
    _self.o.on_cookie(msg.CCresponse[0],msg.CCresponse[1])
  } else {
    set_cookie(msg);
  };
};

crossCookie.prototype.init = function (config) {
  var _self = this;
  this.o = _self.extend(_self.defaults, config);
  delete this.defaults;

  if(!win.postMessage || !win.JSON ) return;

  if (!frame) {
    frame = (win.top == win) ? _self.setup_iframe().contentWindow : win.top;
  };

  // Setup postMessage event listeners
  if (win.addEventListener) {
    win.addEventListener('message', function(event){
      _self.onMessage(event,_self)
    }, false);
  } else if(win.attachEvent) {
    win.attachEvent('onmessage', function(event){
      _self.onMessage(event,_self)
    });
  }

  interval = window.setInterval(function(){
    if (is_ready) {
      window.clearInterval(interval);
    } else {
      _self.send({CCare_you_ready:true}); //?
    };
  },300);

};
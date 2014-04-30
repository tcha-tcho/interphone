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
  for(var key in obj) {var sKey = key; break;}
  console.log(this.o.protected_cookies, sKey)
  if (this.o.protected_cookies.indexOf(sKey) != -1) {
    console.log("eitaaaa")
    obj[sKey] = "!protected!";
  };
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

crossCookie.prototype.get = function(sKey) {
  frame.postMessage('{"CCget":"'+sKey+'"}', "*");
}

crossCookie.prototype.set = function(sKey,sVal) {
  this.set_local_cookie(sKey,sVal);
  this.send({CCset_cookie:[sKey,sVal]});
}

crossCookie.prototype.onMessage = function (event,_self) {
  if (win.CCallowed_hosts != "*") {
    if (event.origin != get_host(frame)) return;
    if (win.CCallowed_hosts.indexOf(get_host(frame)) == -1) return;
  };
  if (!event.data) return;
  var msg = JSON.parse(event.data);
  if(!msg) return;
  console.log(event.origin, JSON.stringify(msg))
  if (msg.CCim_ready) {
    is_ready = true;
    win.CCon_ready();
  } else if (msg.CCare_you_ready) { //?
    win.CCsend({"CCim_ready":true});
  } else if (msg.CCget) {
    var response = {"CCresponse":[msg.CCget,get_cookie(msg.CCget)]};
    win.CCsend(response);
  } else if (msg.CCresponse) {
    win.CCon_cookie(msg.CCresponse[0],msg.CCresponse[1])
  } else if (msg.CCset_cookie) {
    win.CCset_local_cookie(msg.CCset_cookie[0],msg.CCset_cookie[1]);
    var response = {"CCresponse":[msg.CCset_cookie[0],msg.CCset_cookie[0]]};
    win.CCsend(response);
  } else {
    set_cookie(msg);
  };
};

crossCookie.prototype.init = function (config) {
  var _self = this;
  this.o = _self.extend(_self.defaults, config);
  delete this.defaults;
  if(
      !win.postMessage ||
      !win.JSON
    ) {
      return;
  }

  win.CCsend = _self.send;
  win.CCallowed_hosts = this.o.allowed_hosts;
  win.CCset_local_cookie = this.set_local_cookie;
  win.CCon_ready = this.o.on_ready;
  win.CCon_cookie = this.o.on_cookie;

  if (!frame) {
    frame = (win.top == win) ? _self.setup_iframe().contentWindow : win.top;
  };

  // Setup postMessage event listeners
  if (win.addEventListener) {
    win.addEventListener('message', _self.onMessage, false);
  } else if(win.attachEvent) {
    win.attachEvent('onmessage', _self.onMessage);
  }

  interval = window.setInterval(function(){
    if (is_ready) {
      window.clearInterval(interval);
    } else {
      _self.send({CCare_you_ready:true}); //?
    };
  },1500);

};
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
    ,on_ready: function(){}
  }
  this.init(config);
}

var win = window;
var frame;
var reqs = {};

crossCookie.prototype.send_cookie = function (obj) {
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

crossCookie.prototype.get = function(sKey,callback) {
  var request_name = sKey+":::"+(new Date().getTime());
  reqs[request_name] = callback;
  frame.postMessage('{"CCget":"'+request_name+'"}', "*");
}

crossCookie.prototype.set = function(sKey,sVal) {
  if (sVal != get_cookie(sKey)) {
    var storage = frame.localStorage;
    var obj = {};
    obj[sKey] = sVal;
    storage.setItem(get_host(frame), JSON.stringify(obj));
    set_cookie(sKey,sVal);
  }
  this.send_cookie(obj);
}

crossCookie.prototype.onMessage = function (event,_self) {
  if (win.CCallowed_hosts != "*") {
    if (event.origin != get_host(frame)) return;
    if (win.CCallowed_hosts.indexOf(get_host(frame)) == -1) return;
  };
  var msg = JSON.parse(event.data);
  if(!msg) return;
  if (msg.CCready) {
    win.CCon_ready();
  } else if (msg.CCget) {
    var response = {"CCresponse":[msg.CCget,get_cookie(msg.CCget.split(":::")[0])]};
    console.log(response)
    window.CCsend_cookie(response);
  } else if (msg.CCresponse) {
    console.log(msg.CCresponse);
    reqs[msg.CCresponse[0]](msg.CCresponse[1]);
    delete reqs[msg.CCresponse[0]];
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
      !win.localStorage ||
      !win.JSON
    ) {
      return;
  }

  win.CCsend_cookie = _self.send_cookie;
  win.CCallowed_hosts = this.o.allowed_hosts;
  win.CCon_ready = this.o.on_ready;

  if (!frame) {
    frame = (win.top == win) ? _self.setup_iframe().contentWindow : win.top;
  };

  // Setup postMessage event listeners
  if (win.addEventListener) {
    win.addEventListener('message', _self.onMessage, false);
  } else if(win.attachEvent) {
    win.attachEvent('onmessage', _self.onMessage);
  }

  _self.send_cookie({CCready:true});
};
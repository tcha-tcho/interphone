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


function crossCookie(config) {
  this.defaults = {
     allowed_hosts: "*"
    ,on_ready: function(){}
  }
  this.init(config);
}

var win = window;
var frame;
var reqs = {};

crossCookie.prototype.send_cookie = function (obj) {
  frame.postMessage(JSON.stringify(obj), win.location.hostname);
}

crossCookie.prototype.setup_iframe = function () {
  // Create hidden iframe dom element
  var doc = win.document;
  var iframe = doc.createElement('iframe');
  var iframeStyle = iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  // Append iframe to the dom and load up crossCookie.org inside
  doc.body.appendChild(iframe);
  iframe.src = this.o.crossCookieServerUrl;
  return iframe;
};

crossCookie.prototype.onMessage = function (event) {
  if (this.o.allowed_hosts != "*") {
    // var originHostname = event.origin.split('://')[1].split(':')[0];
    if (this.o.allowed_hosts.indexOf(event.origin) == -1) return;
  };
  var msg = JSON.parse(event.data);
  if(!msg) return;
  if (msg.CCget) {
    var response = {"CCresponse":[msg.CRget,get_cookie(msg.CRget.split(":::")[0])]};
    send_cookie(response);
  } else if (msg.CCresponse) {
    reqs[msgCCresponse[0]](msg.CCresponse[1]);
    delete reqs[msgCCresponse[0]];
  } else {
    set_cookie(msg);
  };
}
crossCookie.prototype.get = function(sKey,callback) {
  var request_name = sKey+":::"+(new Date().getTime());
  reqs[request_name] = callback;
  frame.postMessage('{"CCget":"'+request_name+'"}', win.location.hostname);
}

crossCookie.prototype.set = function(sKey,sVal) {
  var _self = this;
  if (sVal != get_cookie(sKey)) {
    var storage = (iframe || win.parent).localStorage;
    var obj = {}, obj[sKey] = sVal;
    storage.setItem((iframe.contentWindow || win).location.hostname, JSON.stringify(obj));
    set_cookie(sKey,sVal);
  }
  _self.send_cookie(obj);
}

crossCookie.prototype.init = function (config) {
  var _self = this;
  _self.o = _self.extend(_self.defaults, config);
  delete _self.defaults;
  if(
      !win.postMessage ||
      !win.localStorage ||
      !win.JSON
    ) {
      return;
  }

  if (!frame) {
    frame = (win.top == win) ? _self.setup_iframe() : win.top;
  };

  // Setup postMessage event listeners
  if (win.addEventListener) {
    win.addEventListener('message', _self.onMessage, false);
  } else if(win.attachEvent) {
    win.attachEvent('onmessage', _self.onMessage);
  }

  _self.o.on_ready();
};
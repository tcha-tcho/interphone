if (!Object.extend) {
  Object.prototype.extend = function() {
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key))
          arguments[0][key] = arguments[i][key];
    return arguments[0];
  }
};

function get_host(win) {
  return win.location.protocol + "//" + win.location.hostname;
}

function interphone(config) {
  this.defaults = {
     allowed_hosts: "*"
    ,serverUrl: "https://rawgit.com/tcha-tcho/interphone/master/test/page1.html"
    ,protected_cookies: []
    ,no_calls: false
    ,on_ready: function(){}
    ,on_cookie: function(){}
    ,on_storage: function(){}
    ,on_msg: function(){}
  }
  this.init(config);
}

var win = (win || window);

interphone.prototype.send = function (obj) {
  this.frame.postMessage(JSON.stringify(obj), "*");
}

interphone.prototype.send_msg = function (obj) {
  //messaging all
  this.frame.postMessage('{"IPresponse_msg":'+JSON.stringify(obj)+'}', "*");
}

interphone.prototype.setup_iframe = function () {
  // Create hidden iframe dom element
  var doc = win.document;
  window.doc = doc
  var iframe = doc.createElement('iframe');
  var iframeStyle = iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  // Append iframe to the dom and load up interphone.org inside
  doc.head.appendChild(iframe);
  iframe.src = this.o.serverUrl;
  return iframe;
};

interphone.prototype.get_local_cookie = function(sKey) {
  var regex = new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey)
    .replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$");
  return decodeURIComponent(document.cookie.replace(regex, "$1")) || null;
}

interphone.prototype.set_local_cookie = function(sKey,sVal) {
  if (sVal != this.get_local_cookie(sKey)) {
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sVal);
  }
  return sVal;
}

interphone.prototype.get = function(sKey,callback) {
  this.frame.postMessage('{"IPget":"'+sKey+'"}', "*");
}

interphone.prototype.is_protected = function(sKey) {
  return ((this.o.protected_cookies.indexOf(sKey) != -1) || this.o.no_calls);
}

interphone.prototype.set = function(sKey,sVal) {
  this.set_local_cookie(sKey,sVal);
  if (!this.is_protected(sKey)) {
    this.send({IPset_cookie:[sKey,sVal]});
  };
}

interphone.prototype.onMessage = function (event,_self) {
  if (_self.o.allowed_hosts != "*") {
    if (event.origin != get_host(_self.frame)) return;
    if (_self.o.allowed_hosts.indexOf(get_host(_self.frame)) == -1) return;
  };
  if (!event.data) return;
  console.log(event.data)
  var msg = JSON.parse(event.data);
  if(!msg) return;
  if (msg.IPim_ready) {
    _self.is_ready = true;
    _self.o.on_ready();
  } else if (msg.IPare_you_ready) { //?
    _self.send({"IPim_ready":true});
  } else if (msg.IPget) {
    if (_self.is_protected(msg.IPget)) {
      var cookie = "!protected"
    } else {
      var cookie = _self.get_cookie(msg.IPget);
    };
    _self.send({"IPresponse":[msg.IPget,cookie]});
  } else if (msg.IPset_cookie) {
    var sKey = msg.IPset_cookie[0];
    if (_self.is_protected(sKey)) {
      _self.send({"IPresponse":[sKey,"!protected"]});
    } else {
      _self.set_local_cookie(sKey,msg.IPset_cookie[1]);
      _self.o.on_cookie(sKey,msg.IPset_cookie[1])
    };
  } else if (msg.IPresponse) {
    _self.o.on_cookie(msg.IPresponse[0],msg.IPresponse[1])
  } else if (msg.IPresponse_msg) {
    _self.o.on_msg(msg.IPresponse_msg)
  } else {
    _self.set_local_cookie(msg);
  };
};

interphone.prototype.init = function (config) {
  var _self = this;
  this.o = _self.extend(_self.defaults, config);
  delete this.defaults;

  if(!win.postMessage || !win.JSON ) return;

  if (!_self.frame) {
    _self.frame = (win.top == win) ? _self.setup_iframe().contentWindow : win.top;
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

  _self.interval = window.setInterval(function(){
    if (_self.is_ready) {
      window.clearInterval(_self.interval);
    } else {
      _self.send({IPare_you_ready:true}); //?
    };
  },300);

};
if (!Object.extend) {
  Object.prototype.extend = function() {
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key))
          arguments[0][key] = arguments[i][key];
    return arguments[0];
  }
};

if(!String.to_id) {
  String.prototype.to_id = function() {
    return this.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
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

interphone.prototype.send = function (key,val) {
  var obj = {};
  obj[this.win.uuid + ":::" + key] = val;
  // this.frame.postMessage(JSON.stringify(obj), get_host(this.frame));
  this.frame.postMessage(JSON.stringify(obj), "*");
}

interphone.prototype.send_msg = function (obj) {
  this.send("IPresponse_msg", obj);
}

interphone.prototype.setup_iframe = function () {
  // Create hidden iframe dom element
  var doc = this.win.document;
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

interphone.prototype.is_protected = function(sKey) {
  return ((this.o.protected_cookies.indexOf(sKey) != -1) || this.o.no_calls);
}

interphone.prototype.get = function(sKey,callback) {
  this.send("IPget", sKey);
}

interphone.prototype.set = function(sKey,sVal) {
  this.set_local_cookie(sKey,sVal);
  if (!this.is_protected(sKey)) {
    this.send("IPset_cookie", [sKey,sVal]);
  };
}

interphone.prototype.onMessage = function (event,_self) {
  if (_self.o.allowed_hosts != "*") {
    if (event.origin != get_host(_self.frame)) return;
    if (_self.o.allowed_hosts.indexOf(get_host(_self.frame)) == -1) return;
  };
  // if (!event.newValue && !event.data) return;
  if (event.type == "storage") {
    var msg = {};
    msg[event.key] = event.newValue
    // console.log("--------------------")
    // console.log(event)
    // console.log(_self.frame.uuid)
    // console.log(event.srcElement.uuid)
    // console.log(event.target.uuid)
    // console.log(event.currentTarget.uuid)
    // console.log("--------------------")
  } else if (event.type == "message") {
    var msg = JSON.parse(event.data);
    // if (!_self.is_iframe) console.log(event.source.uuid)
    // if (_self.is_iframe) console.log(event.source.uuid)
  };

  for (key in msg) {
    if (key != "extend") {
      var uuid = key.split(":::")[0];
      msg[key.split(":::")[1]] = msg[key];
      delete msg[key];
    };
  }

  if (uuid != _self.frame_uuid && !msg.IPare_you_ready) {
    // console.log("negada",uuid, _self.frame_uuid, JSON.stringify(msg))
    return;
  } else {
    // console.log("aprovada",uuid, _self.frame_uuid, JSON.stringify(msg))
  };

  switch(true) {
  case !!msg.IPim_ready:
    _self.is_ready = true;
    _self.o.on_ready();
    break;
  case !!msg.IPare_you_ready:
    _self.frame_uuid = uuid;
    _self.send("IPim_ready", true);
    break;
  case !!msg.IPget:
    if (_self.is_protected(msg.IPget)) {
      var cookie = "!protected"
    } else {
      var cookie = _self.get_cookie(msg.IPget);
    };
    _self.send("IPresponse", [msg.IPget,cookie]);
    break;
  case !!msg.IPset_cookie:
    var sKey = msg.IPset_cookie[0];
    if (_self.is_protected(sKey)) {
      _self.send("IPresponse", [sKey,"!protected"]);
    } else {
      _self.set_local_cookie(sKey,msg.IPset_cookie[1]);
      _self.o.on_cookie(sKey,msg.IPset_cookie[1])
    };
    break;
  case !!msg.IPresponse:
    _self.o.on_cookie(msg.IPresponse[0],msg.IPresponse[1])
    break;
  case !!msg.IPresponse_msg:
    _self.o.on_msg(msg.IPresponse_msg)
    break;
  default:
    _self.set_local_cookie(msg);
  }

};

interphone.prototype.set_listeners = function(type) {
  var _self = this;
  if (_self.win.addEventListener) {
    _self.win.addEventListener(type, function(event){
      _self.onMessage(event,_self)
    }, false);
  } else if(_self.win.attachEvent) {
    _self.win.attachEvent('on'+type, function(event){
      _self.onMessage(event,_self)
    });
  }
}

interphone.prototype.init = function (config) {
  var _self = this;
  this.o = _self.extend(_self.defaults, config);
  delete this.defaults;

  _self.win = window;

  if (!_self.win.postMessage || !_self.win.JSON ) return;
  _self.is_iframe = (_self.win.top == _self.win);
  _self.frame = _self.is_iframe ? _self.setup_iframe().contentWindow : _self.win.top;
  if (_self.is_iframe) {
    _self.frame_uuid = 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.to_id();
    _self.frame.uuid = _self.frame_uuid;
  } else {
    _self.win.uuid = 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.to_id();
  }

  // Setup event listeners
  _self.set_listeners('message');
  _self.set_listeners('storage');

  _self.interval = _self.win.setInterval(function(){
    if (_self.is_ready) {
      _self.win.clearInterval(_self.interval);
    } else {
      _self.send("IPare_you_ready", true); //?
    };
  },200);

};
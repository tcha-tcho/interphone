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

if(!String.crypt) {
  String.prototype.crypt = function(key) {
    var new_text = '';
    for (var i = 0; i < this.length; i++) {
      var k = key.charCodeAt(i%key.length);
      new_text += String.fromCharCode(this.charCodeAt(i) ^ k);
    };
    return new_text;
  };
};

function get_host(win) {
  return win.location.protocol + "//" + win.location.hostname;
}

function interphone(config) {
  this.defaults = {
     allowed_hosts: "*"
    ,serverUrl: "https://rawgit.com/tcha-tcho/interphone/master/test/page1.html"
    ,protected_data: []
    ,no_calls: false
    ,on_ready: function(){}
    ,on_data: function(){}
    ,on_storage: function(){}
    ,on_msg: function(){}
  }
  this.init(config);
}

interphone.prototype.is_protected = function(sKey) {
  return ((this.o.protected_data.indexOf(sKey) != -1) || this.o.no_calls);
}

interphone.prototype.send = function (key,val) {
  var _self = this;
  if (_self.is_protected(key)) val = "protected!";
  var obj = {}; obj[key] = val;
  var encrypted = JSON.stringify(obj).crypt(_self.pair+_self.uuid);
  _self.frame.postMessage(_self.uuid + "--" + encrypted, "*");
}

interphone.prototype.send_msg = function (obj) {
  this.send("IPresponse_msg", obj);
}

interphone.prototype.setup_iframe = function () {
  var _self = this;
  var doc = _self.win.document;
  _self.iframe = doc.createElement('iframe');
  _self.iframe.name = 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.to_id() + "--" + _self.uuid;
  var iframeStyle = _self.iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  doc.head.appendChild(_self.iframe);
  _self.iframe.src = this.o.serverUrl;
  return _self.iframe;
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

interphone.prototype.get_local_storage = function(sKey) {
  if (this.storage) return this.storage.getItem(sKey);
  return "!localStorage"
}

interphone.prototype.set_local_storage = function(sKey,sVal) {
  if (this.storage) this.storage.setItem(sKey,sVal);
  return sVal;
}

interphone.prototype.get_data = function(sKey,type) {
  if (!type) type = "storage";
  this.send("IPget_data", [sKey,type]);
}

interphone.prototype.set_data = function(sKey,sVal,type) {
  var _self = this;
  if (type=="cookie") {
    _self.set_local_cookie(sKey,sVal);
  } else {
    if (!type) type = "storage";
    if (_self.storage) _self.storage.setItem(sKey,sVal)
  };
  if (!this.is_protected(sKey)) {
    this.send("IPset_data", [sKey,sVal,type]);
  };
};

interphone.prototype.onMessage = function (event,_self) {
  if (!event) { event = window.event; } //IE
  if (_self.o.allowed_hosts != "*") {
    if (event.origin != get_host(_self.frame)) return;
    if (_self.o.allowed_hosts.indexOf(get_host(_self.frame)) == -1) return;
  };
  if (!event.data) return;
  var uuid = event.data.split("--")[0];
  var blob = event.data.split("--")[1];
  if (uuid != _self.pair) return;
  blob = blob.crypt(_self.uuid+_self.pair);
  var msg = JSON.parse(blob);

  switch(true) {
  case !!msg.IPim_ready:
    _self.is_ready = true;
    _self.o.on_ready();
    break;
  case !!msg.IPare_you_ready:
    _self.frame_uuid = uuid;
    _self.send("IPim_ready", true);
    break;
  case !!msg.IPget_data:
    var k = msg.IPget_data; //0-sKey,1-type
    _self.send("IPresponse", [k[0],_self["get_local_"+k[1]](k[0])],k[1]);
    break;
  case !!msg.IPset_data:
    var k = msg.IPset_data; //0-sKey,1-sVal,2-type
    if (_self.is_protected(k[0])) {
      _self.send("IPresponse", [k[0],"protected!",k[2]]);
    } else {
      _self["set_local_"+k[2]](k[0],k[1]);
      _self.o.on_data(k[0],k[1])
    };
    break;
  case !!msg.IPresponse:
    var k = msg.IPresponse
    _self.o.on_data(k[0],k[1],k[2])
    break;
  case !!msg.IPresponse_msg:
    _self.o.on_msg(msg.IPresponse_msg)
    break;
  default:
    _self.o.on_msg(msg);
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
};

interphone.prototype.init = function (config) {
  var _self = this;
  this.o = _self.extend(_self.defaults, config);
  delete this.defaults;

  _self.win = window;
  _self.storage = _self.win.localStorage;

  if (!_self.win.postMessage || !_self.win.JSON ) return;
  _self.is_iframe = (_self.win.top != _self.win);
  if (_self.is_iframe) {
    var both = _self.win.name.split("--");
    _self.uuid = both[0];
    _self.pair = both[1];
  } else {
    _self.uuid = 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.to_id();
  };
  _self.frame = _self.is_iframe ? _self.win.top : _self.setup_iframe().contentWindow;
  if (!_self.is_iframe) {
    _self.pair = _self.iframe.name.split("--")[0];
  }

  _self.set_listeners('message');

  _self.interval = _self.win.setInterval(function(){
    if (_self.is_ready) {
      _self.win.clearInterval(_self.interval);
    } else {
      _self.send("IPare_you_ready", true); //?
    };
  },200);

};
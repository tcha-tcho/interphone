if (!window.extend) {
  window.extend = function() {
    var a = arguments;
    for(var i=1; i<a.length; i++)
      for(var key in a[i])
        if(a[i].hasOwnProperty(key))
          a[0][key] = a[i][key];
    return a[0];
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

function interphone(config) {
  this.o = window.extend({
     allowed_hosts: "*"
    ,serverUrl: ""
    ,lock_keys: []
    ,closed: false
    ,on_ready: function(){}
    ,on_data: function(){}
    ,on_msg: function(){}
  }, config);
  this.init();
}

interphone.prototype.locked = function(sKey) {
  return ((this.o.lock_keys.indexOf(sKey) != -1) || this.o.closed);
}

interphone.prototype.send = function (key,val) {
  var _self = this;
  if (_self.locked(val[0])) val = "protected!";
  var obj = {}; obj[key] = val;
  var encrypted = JSON.stringify(obj).crypt(_self.pair+_self.uuid);
  _self.frame.postMessage(_self.uuid + "--" + encrypted, "*");
}

interphone.prototype.send_msg = function (obj) {
  this.send("IPres_msg", obj);
}

interphone.prototype.new_iframe = function () {
  var _self = this;
  var doc = _self.win.document;
  _self.iframe = doc.createElement('iframe');
  _self.iframe.name = 'xxxxxxx-xxxx-4xxx-yxxx'.to_id() + "--" + _self.uuid;
  var iframeStyle = _self.iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  doc.head.appendChild(_self.iframe);
  _self.iframe.src = this.o.serverUrl;
  return _self.iframe;
};

interphone.prototype.get_local = function(type,sKey) {
  if (type=="cookie") {
    var regex = new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey)
      .replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$");
    return decodeURIComponent(document.cookie.replace(regex, "$1")) || null;
  } else {
    if (this.storage) return this.storage.getItem(sKey);
    return "!localStorage"
  };
}

interphone.prototype.set_local = function(type,sKey,sVal) {
  if (type=="cookie") {
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sVal);
  } else {
    if (this.storage) this.storage.setItem(sKey,sVal);
  };
  return sVal;
}

interphone.prototype.get_data = function(sKey,type) {
  if (!type) type = "storage";
  this.send("IPget_dt", [sKey,type]);
}

interphone.prototype.set_data = function(sKey,sVal,type) {
  if (!type) type = "storage";
  this.set_local(type,sKey,sVal);
  this.send("IPset_dt", [sKey,sVal,type]);
};

interphone.prototype.onMessage = function (event,_self) {
  if (!event) event = window.event; //IE
  var data = (event.data || "");
  if (_self.o.allowed_hosts != "*") {
    var host = _self.frame.location.hostname
    if (event.origin != host) return;
    if (_self.o.allowed_hosts.indexOf(host) == -1) return;
  };
  var uuid = data.split("--")[0];
  if (uuid != _self.pair) return;
  var blob = data.split("--")[1].crypt(_self.uuid+_self.pair);
  var msg = JSON.parse(blob);

  switch(true) {
  case !!msg.IPim_ok:
    _self.ok = true;
    _self.o.on_ready();
    break;
  case !!msg.IPtest_ok:
    _self.send("IPim_ok", true);
    break;
  case !!msg.IPget_dt:
    var k = msg.IPget_dt; //0-sKey,1-type
    _self.send("IPres", [k[0], _self.get_local(k[1], k[0])], k[1]);
    break;
  case !!msg.IPset_dt:
    var k = msg.IPset_dt; //0-sKey,1-sVal,2-type
    if (_self.locked(k[0])) {
      _self.send("IPres", [k[0], "protected!", k[2]]);
    } else {
      _self.set_local(k[2],k[0],k[1]);
      _self.o.on_data(k[0],k[1])
    };
    break;
  case !!msg.IPres:
    var k = msg.IPres
    console.log(k[0],k[1],k[2])
    _self.o.on_data(k[0],k[1],k[2])
    break;
  case !!msg.IPres_msg:
    _self.o.on_msg(msg.IPres_msg)
    break;
  default:
    _self.o.on_msg(msg);
  }

};

interphone.prototype.init = function () {
  var _self = this;
  _self.win = window;
  _self.storage = _self.win.localStorage;

  if (!_self.win.postMessage || !_self.win.JSON ) return;
  _self.ifr = (_self.win.top != _self.win);
  if (_self.ifr) {
    var both = _self.win.name.split("--");
    _self.uuid = both[0];
    _self.pair = both[1];
  } else {
    _self.uuid = 'xxxxxxx-xxxx-4xxx-yxxx'.to_id();
  };
  _self.frame = _self.ifr ? _self.win.top : _self.new_iframe().contentWindow;
  if (!_self.ifr) _self.pair = _self.iframe.name.split("--")[0];

  if (_self.win.addEventListener) {
    _self.win.addEventListener('message', function(event){
      _self.onMessage(event,_self)
    }, false);
  } else if(_self.win.attachEvent) {
    _self.win.attachEvent('onmessage', function(event){
      _self.onMessage(event,_self)
    });
  }

  var interval = _self.win.setInterval(function(){
    if (_self.ok) {
      _self.win.clearInterval(interval);
    } else {
      _self.send("IPtest_ok", true); //?
    };
  },200);

};
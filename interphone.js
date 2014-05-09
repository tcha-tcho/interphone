/**
 * Interphone.JS
 *
 * @author       Tcha-Tcho <tchatcho66@hotmail.com>
 * @version      Release: 0.0.1-alpha
 * @license      http://www.gnu.org/licenses/gpl.html GNU GENERAL PUBLIC LICENSE
 */


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

if(!String.cypher) {
  String.prototype.cypher = function(key) {
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
     hosts: "*"
    ,serverUrl: ""
    ,lock_keys: []
    ,closed: false
    ,target: "*"
    ,on_ready: function(){}
    ,on_data: function(){}
    ,on_msg: function(){}
  }, config);
  this.init();
}

interphone.prototype.locked = function(sKey) {
  return (this.o.lock_keys.indexOf(sKey) != -1);
}

interphone.prototype.send = function (key,val) {
  var _self = this;
  var obj = {}; obj[key] = val;
  var encrypted = JSON.stringify(obj).cypher(_self.pair+_self.uuid);
  _self.frame.postMessage(_self.uuid + "--" + encrypted, _self.o.target);
}

interphone.prototype.send_msg = function (obj) {
  this.send("IPres_msg", obj);
}

interphone.prototype.new_iframe = function () {
  var _self = this;
  var doc = _self.w.document;
  _self.iframe = doc.createElement('iframe');
  _self.iframe.name = 'xxxxxxx-xxxx-4xxx-yxxx'.to_id() + "--" + _self.uuid;
  var iframeStyle = _self.iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  doc.head.appendChild(_self.iframe);
  _self.iframe.src = this.o.serverUrl;
  return _self.iframe;
};

interphone.prototype.get_local = function(sKey,type) {
  var regex = new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey)
    .replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$");
  var cookie = decodeURIComponent(document.cookie.replace(regex, "$1")) || null;
  var storage = (this.storage)?this.storage.getItem(sKey):"!storage";
  if (type == "storage") return storage;
  if (type == "cookie") return cookie;
  if (type == "all") return (storage || cookie);
}

interphone.prototype.set_local = function(sKey,sVal,type) {
  if (type=="cookie" || type=="all") {
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sVal);
  };
  if (type=="storage" || type=="all") {
    if (this.storage) this.storage.setItem(sKey,sVal);
  };
  return sVal;
};

interphone.prototype.get = function(sKey,type) {
  this.send("IPget_dt", [sKey,(type || "storage")]);
};

interphone.prototype.set = function(sKey,sVal,type) {
  type = (type || "storage");
  if (!this.locked(sKey)) this.send("IPset_dt", [sKey,sVal,type]);
};

interphone.prototype.onMessage = function (event,_self) {
  if (!event) event = window.event; //IE
  var data = (event.data || "");
  var uuid = data.split("--")[0];
  if (uuid != _self.pair) return;
  var blob = data.split("--")[1].cypher(_self.uuid+_self.pair);
  var msg = JSON.parse(blob);
  var lock_name = "protected!"

  if (_self.o.hosts != "*" && 
      _self.o.hosts.indexOf(event.origin) == -1) {
        _self.block = "blocked";
  };

  switch(true) {
  case !!msg.IPok:
    _self.ok = true;
    if (msg.IPok == "go") msg.IPok = _self;
    _self.o.on_ready(msg.IPok);
    break;
  case !!msg.IPtest_ok:
    _self.send("IPok", _self.block || "go");
    break;
  case !!_self.block:
    _self.send("IPres",["key",lock_name,"all"]);
    return;
    break;
  }

  switch(true) {
  case !!msg.IPget_dt:
    var k = msg.IPget_dt; //0-sKey,1-type
    var val = (_self.locked(k[0]) || _self.o.closed)?lock_name:_self.get_local(k[0], k[1]);
    _self.send("IPres", [k[0],val,k[1]]);
    break;
  case !!msg.IPset_dt:
    var k = msg.IPset_dt; //0-sKey,1-sVal,2-type
    if (_self.locked(k[0]) || _self.o.closed) {
      _self.send("IPres", [k[0], lock_name, k[2]]);
    } else {
      _self.set_local(k[0],k[1],k[2]);
      _self.o.on_data(k[0],k[1],k[2])
    };
    break;
  case !!msg.IPres:
    var k = msg.IPres
    _self.o.on_data(k[0],k[1],k[2])
    break;
  case !!msg.IPres_msg:
    _self.o.on_msg(msg.IPres_msg)
    break;
  }

};

interphone.prototype.init = function () {
  var _self = this;
  _self.w = window;
  _self.storage = _self.w.localStorage;

  if (!_self.w.postMessage || !_self.w.JSON ) return;
  _self.ifr = (_self.w.top != _self.w);
  if (_self.ifr) {
    var both = _self.w.name.split("--");
    _self.uuid = both[0];
    _self.pair = both[1];
  } else {
    _self.uuid = 'xxxxxxx-xxxx-4xxx-yxxx'.to_id();
  };
  _self.frame = _self.ifr ? _self.w.top : _self.new_iframe().contentWindow;
  if (!_self.ifr) _self.pair = _self.iframe.name.split("--")[0];

  if (_self.w.addEventListener) {
    _self.w.addEventListener('message', function(event){
      _self.onMessage(event,_self)
    }, false);
  } else if(_self.w.attachEvent) {
    _self.w.attachEvent('onmessage', function(event){
      _self.onMessage(event,_self)
    });
  }

  var interval = _self.w.setInterval(function(){
    if (_self.ok) {
      _self.w.clearInterval(interval);
    } else {
      _self.send("IPtest_ok", true); //?
    };
  },200);

};
/**
 * Interphone.JS
 *
 * @author       Tcha-Tcho <tchatcho66@hotmail.com>
 * @version      Release: 0.0.1-alpha
 * @license      http://www.gnu.org/licenses/gpl.html GNU GENERAL PUBLIC LICENSE
 */


/**
 * IE8 compatibility. indexOf for Array is not present
 */
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
    for (var i = (start || 0), j = this.length; i < j; i++) {
      if (this[i] === obj) { return i; }
    }
    return -1;
  }
};

if (!window.extend) {
  /**
   * window.extend() will join Objects
   * and will return a new one
   * @example
   * ```javascript
   * var new_obj = window.extend(obj1,obj2...)
   * ```
   * @param {Object} As many as you need
   * @return {Object}
   */
  window.extend = function() {
    var a = arguments;
    for(var i=1,l = a.length; i<l; i++)
      for(var key in a[i])
        if(a[i].hasOwnProperty(key))
          a[0][key] = a[i][key];
    return a[0];
  }
};


if(!String.to_id) {
  /**
   * Attached to String the capacity of
   * transform itself into a mix of letters
   * and numbers, good to use as a unique ID
   * @example
   * ```javascript
   * var id = "xxx1-xxxy-xxxxx".to_id();
   * id == "97b1-1e29-13a5f"
   * ```
   * @return {String}
   */
  String.prototype.to_id = function() {
    return this.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
};

if(!String.cypher) {
  /**
   * Attached to String the capacity of Cypher itself
   * given a certain key. To decypher you just
   * pass the encrypted text with the same key again
   * Note that you can reencrypt the same String several times
   * @example
   * ```javascript
   * var id = "xxx1-xxxy-xxxxx".to_id();
   * var secret = "This is secret".cypher("my key")
   * var plain = secret.cypher("my key")
   * plain == "This is secret"
   * ```
   * @param  {String} key
   * @return {String}
   */
  String.prototype.cypher = function(key) {
    var new_text = '';
    for (var i = 0; i < this.length; i++) {
      var k = key.charCodeAt(i%key.length);
      new_text += String.fromCharCode(this.charCodeAt(i) ^ k);
    };
    return new_text;
  };
};

/**
 * Main class.
 * You have to instanciate a new interphone({options})
 * we have a group of default options
 * But you can override this
 * You have to have interphone.js in both pages to
 * stablish a connections.
 * One start a connection. We can call him a Client.
 * The other we call a Server.
 * You have to define a serverUrl if you are a Client
 * @example
 * ```javascript
 * var page1 = new interphone({
 *   [your options]
 * })
 * ```
 * @param  {Object} config
 * @return {Interphone}
 */
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

/**
 * Look into the option 'lock_keys'
 * searching for keys that you protected on your page
 * @param  {String} sKey
 * @return {Boolean}
 */
interphone.prototype.locked = function(sKey) {
  return (this.o.lock_keys.indexOf(sKey) != -1);
}

/**
 * Send a postMessage for all listeners
 * and pages. If you set a 'target' on
 * options only the 'target' host will receive the message
 * Otherwise all listeners on page will receive messages
 * @param  {String} key
 * @param  {*} val
 * @return {undefined}
 */
interphone.prototype.send = function (key,val) {
  var _self = this;
  var obj = {}; obj[key] = val;
  var encrypted = JSON.stringify(obj).cypher(_self.pair+_self.uuid);
  _self.frame.postMessage(_self.uuid + "--" + encodeURIComponent(encrypted), _self.o.target);
}

/**
 * You can use this method to send messages
 * to the other connected pages.
 * They will receive any type you desire
 * The other page will receive this calls into
 * Security options may apply here
 * ```javascript
 * on_msg: function(obj){}
 * ```
 * @param  {*} obj
 * @return {undefined}
 */
interphone.prototype.send_msg = function (obj) {
  this.send("IPres_msg", obj);
}

/**
 * This method will publish a iframe into
 * <head> and will set this iframe as a pair
 * only calls and messages from that iframe
 * will be accepted
 * @return {iFrame}
 */
interphone.prototype.new_iframe = function () {
  var _self = this;
  var doc = _self.w.document;
  _self.iframe = doc.createElement('iframe');
  _self.iframe.name = 'xxxxxxx-xxxx-4xxx-yxxx'.to_id() + "--" + _self.uuid;
  var iframeStyle = _self.iframe.style;
  iframeStyle.position = 'absolute';
  iframeStyle.left = iframeStyle.top = '-999px';

  doc.getElementsByTagName('head')[0].appendChild(_self.iframe);
  _self.iframe.src = this.o.serverUrl;
  return _self.iframe;
};

/**
 * Will return the Data stored into the page domain
 * The options are 'cookie','storage','all'
 * Cookie will return a String aways
 * Storage will return what you stored into that key
 * @param  {String} sKey
 * @param  {String} type
 * @return {String}
 */
interphone.prototype.get_local = function(sKey,type) {
  var regex = new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey)
    .replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$");
  var cookie = decodeURIComponent(document.cookie.replace(regex, "$1")) || null;
  var storage = (this.storage)?this.storage.getItem(sKey):"!storage";
  if (type == "storage") return storage;
  if (type == "cookie") return cookie;
  if (type == "all") return (storage || cookie);
}

/**
 * Will set the Data into the page domain
 * type options are: 'cookie','storage','all'
 * You may store a Object when using 'storage'
 * @param {String} sKey key desired
 * @param {String} sVal value to be stored
 * @param {String} type where you want to store
 */
interphone.prototype.set_local = function(sKey,sVal,type) {
  if (type=="cookie" || type=="all") {
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sVal);
  };
  if (type=="storage" || type=="all") {
    if (this.storage) this.storage.setItem(sKey,sVal);
  };
  return sVal;
};

/**
 * Fire a search for a Key at the other page
 * If page find something stored that page will send you
 * the data as is.
 * Security options may apply
 * The Data will return at
 * ```javascript
 * on_data: function(key,val,type){}
 * ```
 * @param  {String} sKey Key desired
 * @param  {String} type Where to look 'storage','cookie','all'
 * @return {undefined}
 */
interphone.prototype.get = function(sKey,type) {
  this.send("IPget_dt", [sKey,(type || "storage")]);
};

/**
 * Set the data everywhere. Into your page and the other
 * Security options may apply
 * If no type is selected 'storage' will be used
 * When someone set a data into your page this will fire
 * on_data: function(key,val,type){}
 * @example
 * ```javascript
 * page1.set("my_key","My Value!","all");
 * ```
 * @param {String} sKey Key desired
 * @param {String} sVal Value, you may use a Object too
 * @param {String} type 'cookie','storage','all'
 */
interphone.prototype.set = function(sKey,sVal,type) {
  type = (type || "storage");
  this.set_local(sKey,sVal,type);
  if (!this.locked(sKey)) this.send("IPset_dt", [sKey,sVal,type]);
};

/**
 * Internal method to process postMessages calls
 * If Security is active and have options
 * this function will filter that
 * @param  {Event} event
 * @param  {Interphone} _self
 * @return {undefined}
 */
interphone.prototype.onMessage = function (event,_self) {
  if (!event) event = window.event; //IE
  var data = (event.data || "");
  var uuid = data.split("--")[0];
  if (uuid != _self.pair) return;
  var blob = decodeURIComponent(data.split("--")[1]).cypher(_self.uuid+_self.pair);
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

/**
 * Internal method to initiate a new Interphone
 * Here we set a iframe (if is needed) and pairs
 * @return {undefined}
 */
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
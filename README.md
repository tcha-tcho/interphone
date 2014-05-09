<img src="./test/interphone.png" ALIGN="center" width="200px" style="float:right;">

*Your cross domain intercom rock star. 3.4kb that will save your ass.*
With interphone you can remotly set and get cookies, localStorage or both.
You also can send and receive messages


## Installation
###Client and Server
```html
<script src="interphone.js" charset="UTF-8"></script>
```

## Usage

Get your blessed Data everywhere.
And you can customize your **interphone** \o/

```javascript
//freaking easy!!!!
//create a new caller/receiver.
//You have a lot of options too ;)
  var page = new interphone({
     //choose your friends ["http://allowed.com","http://thistoo.com"]
     hosts: "*"
    //Your 'Server' that will receive a call
    ,serverUrl: ""
    //Hey this cookies/storage are secret
    ,lock_keys: []
    //You know what? Just me will talk!
    ,closed: false
    //"http://onlyme.com" will receive messages - default is all listeners
    ,target: "*"
    //Huston we have a connection
    ,on_ready: function(this_phone){}
    //Every time you request a info or someone set a new Data. Here you will know
    ,on_data: function(key,val,type){}
    //Some one is calling you
    ,on_msg: function(){obj}
  })
```

## Features

### `Fast, Easy and Reliable`

Never get caught with your pants down again authenticating users cross site.

### `Supports All Browsers`

Yes we are watching you IE!
[See the table](http://caniuse.com/#feat=x-doc-messaging)


## TODO

 - More Tests!

## Running Tests

To run the test suite just open the ***```test/test.html```*** file at your browser

Or access:
***```https://rawgit.com/tcha-tcho/interphone/master/test/test.html```***

#Full Doc

window.extend()
----------
window.extend() will join Objects
and will return a new one
```javascript
var new_obj = window.extend(obj1,obj2...)
```
**Parameters**

*Object*,  many as you need


String.to_id()
-------
Atach to String the capacity of
transform itself into a mix of letters
and numbers, good to use as a unique ID
```javascript
var id = "xxx1-xxxy-xxxxx".to_id();
id == "97b1-1e29-13a5f"
```


cypher(key)
-----------
Atach to String the capacity of Cypher itself
given a certain key. To decypher you just
pass the encrypted text with the same key again
Note that you can reencrypt the same String several times
```javascript
var id = "xxx1-xxxy-xxxxx".to_id();
var secret = "This is secret".cypher("my key")
var plain = secret.cypher("my key")
plain == "This is secret"
```
**Parameters**

**key**:  *String*,  


interphone(config)
------------------
Main class.
You have to instanciate a new interphone({options})
we have a group of default options
But you can override this
You have to have interphone.js in both pages to
stablish a connections.
One start a connection. We can call him a Client.
The other we call a Server.
You have to define a serverUrl if you are a Client
```javascript
var page1 = new interphone({
[your options]
})
```
**Parameters**

**config**:  *Object*,  


send_msg(obj)
-------------
You can use this method to send messages
to the other connected pages.
They will receive any type you desire
Security options may apply here
The other page will receive this calls into
```javascript
on_msg: function(obj){}
```
**Parameters**

**obj**:  ***,  


get_local(sKey, type)
---------------------
Will return the Data stored into the page domain
The options are 'cookie','storage','all'
Cookie will return a String aways
Storage will return what you store into that key

**Parameters**

**sKey**:  *String*,  

**type**:  *String*,  


set_local(sKey, sVal, type)
---------------------------
Will set the Data into the page domain
type options are: 'cookie','storage','all'
You may store a Object when using 'storage'

**Parameters**

**sKey**:  *String*,  key desired

**sVal**:  *String*,  value to be stored

**type**:  *String*,  where you want to store


get(sKey, type)
---------------
Fire a search for a Key at the other page
If page find something stored that page will send you
the data as is.
Security options may apply
The Data will return at
```javascript
on_data: function(key,val,type){}
```
**Parameters**

**sKey**:  *String*,  Key desired

**type**:  *String*,  Where to look 'storage','cookie','all'


set(sKey, sVal, type)
---------------------
Set the data everywhere. Into your page and the other
Security options may apply
If no type is selected 'storage' will be used
When someone set a data into your page this will fire
on_data: function(key,val,type){}
```javascript
page1.set("my_key","My Value!","all");
```
**Parameters**

**sKey**:  *String*,  Key desired

**sVal**:  *String*,  Value, you may use a Object too

**type**:  *String*,  'cookie','storage','all'




## Credits

This library was a crazy dream build by [Tcha-Tcho](https://github.com/tcha-tcho);

## License

(The MIT License)

Copyright (c) 2012 Tcha-Tcho &lt;tchatcho66@hotmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

#!/usr/bin/env node

// config obj is whatever we need, like
// { verbose: true, memcache: true } or { pub: './public', port: 8000 }

module.exports = function(config) {

var Eserver = {};
Eserver.config = { port: 9000 }; // defaults
if( arguments.length > 0 && config ) Eserver.config = config;

// more default server configs
Eserver.config.verbose = true;
Eserver.config.memmax = 10;
Eserver.config.memdmax = 10000; 
Eserver.config.server_emits = ['weather', 'date']; // server socket.io named msgs to clients 
Eserver.config.client_emits = ['load', 'coord']; // clients socket.io named msgs to server
//Eserver.config.usrbin = ['/usr/local/bin/', '/opt/bin/'];
// load NOAA national weather service rest module
// weather is lodash-cloned-extended cache obj
Eserver.config.weather = Eserver.weather = require('NatWS')(Eserver.config);
// load socket.io module and define event handlers
// (which might include a click to request latest current data from weatherground)
Eserver.websock = require('WebSock')(Eserver.config); // websock is lodash-cloned-extended weather obj

// Creating an express server
Eserver.express = require('express'); // static file server

Eserver.listen = function(port) {
  // init a new socket.io object bound to the express app, allowing them to coexist.
  // and start listening for connections
  Eserver.port = port || process.env.PORT || parseInt(process.argv.slice(2)) || 9000;
  // SockEvents module load socket.io  
  console.log('Eserver.listen> on port: ' + Eserver.port);
  return Eserver.websock.listen(Eserver.app, Eserver.port);
}

Eserver.startWeather = function() {
  console.log("Eserver.startWeather> conditions interval fetcher");
  Eserver.weather.conditions(); // async request shouldupdate Weather.current can take a while
  setInterval(function() { 
    var time = new Date(); 
    Eserver.io.emit('date', time);
    Eserver.weather.conditions(); 
  }, Eserver.weather.interval); // Weather.interval periodicity == 90 sec
}

Eserver.onConnect = function(socket) { Eserver.websock.onConnect(socket, Eserver.weather); }

Eserver.startup = function(config) { // publish web-site 
  if( arguments.length > 0 && config ) Eserver.config = config;
  // expose/publish files in the pub folder to the world -- evidently this must 
  // be invoked before we start listening
  Eserver.app = Eserver.express();
  //Eserver.app.use(function(req, res) {
  //  res.setHeader('Cache-Control', 'no-cache, must-revalidate'); // try to avoid browser cache
  //});
  // or use html cache manifest: <html manifest="appcache.txt">
  //
  var web = Eserver.config.pub; // list of directories to publish
  web.forEach(function(pub) { 
    console.log("Eserver.startup>  web content of directory: "+pub);
    Eserver.app.use(Eserver.express.static(pub));
  });
  // evidently gotta start listening to provide io obj for handlers
  Eserver.io = Eserver.listen(Eserver.config.port); // note Eserver.io === Eserver.websock.io
  Eserver.startWeather(); // Weather.interval periodicity == 30 sec
  Eserver.io.on('connection', Eserver.onConnect); // io passes new client socket to connect handler
}

return Eserver;
};


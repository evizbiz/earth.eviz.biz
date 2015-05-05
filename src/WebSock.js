#!/usr/bin/env node

module.exports = function(config) {

var WebSock = {};

if( arguments.length > 0 && config && config.weather) {
  WebSock.weather = config.weather;
} else {
  WebSock.weather = require('NatWS')(config);
}
WebSock.sockio = require('socket.io');

WebSock.weatherCache = function(socket, weather) { 
  if( arguments.length > 1 && weather) { WebSock.weather = weather; }
  var conditions = 'awaiting weather rest request to complete ...'
  // extracted local temperature and winds and visibility, etc.
  var conditions = WebSock.weather.cachedObs();
  console.log('WebSock.weatherCache> emit to client: ');
  console.log('WebSock.weatherCache> '+conditions);
  socket.emit('weather', conditions);
}

WebSock.listen = function(app, port) {
  WebSock.io = WebSock.sockio.listen(app.listen(port));
  return WebSock.io;
}

WebSock.sendSysInfo = function(socket) {
  var sysinfo = process.title+' '+process.version+' '+process.arch+' '+process.platform;
  sysinfo = new Date() + ' -- ' + sysinfo;
  socket.emit('date', sysinfo);
}

WebSock.onReset = function(socket, data) {
  // handler for client "reset" event
  // placeholder:
  WebSock.sendSysInfo(socket);
}

WebSock.onLoad = function(socket, data) { 
  // handler for client "load" event
  // init a new socket.io application
  console.log('WebSock.onLoad> ' + socket.id + ' received from client: ');
  console.log(data);
  console.log('WebSock.onLoad> send date-time sysinfo. to client');
  WebSock.sendSysInfo(socket);
  //var auth = { access: (data.key === socket.secretKey ? "granted" : "denied") };
  //socket.emit('access', auth);
}

WebSock.parseLeafCoord = function(loc) {
  // leaflet client gville fl coord event data: looks like: 'LatLng(29.65673, -82.38459)'
  var searchme = 'LatLng(';
  var sidx = 1+searchme.indexOf('(');
  var latlon = loc.substr(sidx);
  var latlon = latlon.split(',');
  var lat = parseFloat(latlon[0]);
  var lon = parseFloat(latlon[1]);
  return [lat, lon];
}

WebSock.parseOL3Coord = function(loc) {
  // openlayers gville fl coord text from openlayers looks like: '-82.384, 29.656'
  var lonlat = loc.split(',');
  var lon = parseFloat(lonlat[0]); // parseFloat is ok with leading whitespace(s)
  var lat = parseFloat(lonlat[1]);
  return [lat, lon];
}

WebSock.onCoord = function(socket, data) {
  // handler for client 'coord' named-event.
  // coord text from leaflet looks like: 'LatLng(29.65673, -82.38459)'
  // coord text from openlayers looks like: '-82.384, 29.656'
  console.log('WebSock.onCoord> '+socket.id);
  console.log(data);
  // parse coord data text to [ lat,lon ] and push onto weather.loclist and fetch-rest
  var loc = null, latlon = null;
  if( data.hasOwnProperty('latlon') ) {
    loc = data.latlon; // leaflet
    latlon = WebSock.parseLeafCoord(loc);
  } else if( data.hasOwnProperty('lonlat') ) {
    loc = data.lonlat;
    latlon = WebSock.parseOL3Coord(loc); 
  } else {
    console.log('WebSock.onCoord> bad coord data (neither leaflet nor openlayers3?');
    return;
  }
  WebSock.weather.conditions(latlon, socket); // get conditions for new location
  WebSock.sendSysInfo(socket); // might as well update datetime-header too
}

WebSock.onText = function(socket, data) {
  // handler for client "change" event
  console.log('WebSock.onText> '+socket.id);
  console.log('WebSock.onText> '+data);
  //if(data.key != socket.secretKey) return;
  // inform all connected clients of change
  WebSock.sendSysInfo(socket);
}

WebSock.startClientUpdates = function(socket, weather) {
  console.log("WebSock.startClientUpdates> of latest weatherground conditions.");
  WebSock.weatherCache(socket, weather); // emits latest conditions
  setInterval(function() {
    WebSock.sendSysInfo(socket);
    WebSock.weatherCache(socket, weather); // latest cached conditions
  }, weather.interval); // Wunder.interval periodicity == 30 sec
}

WebSock.onConnect = function(socket, weather) {
  console.log('WebSock.onConnect> '+socket.id);
  WebSock.startClientUpdates(socket, weather);
  // evidently only one arg is passed to the lambda, but i prefer more args ...
  // no other way to use generic handlers (must use lambda)?
  // these are so-called "named" events, rather than unnamed "json" or "message"
  // presumably allowing for arbitrary data types, including binary.
  socket.on('load', function(data) { WebSock.onLoad(socket, data); });
  socket.on('coord', function(data) { WebSock.onCoord(socket, data); });
  socket.on('text', function(data) { WebSock.onText(socket, data); });
  socket.on('reset', function (data) { WebSock.onReset(socket, data); });
}

return WebSock;
};


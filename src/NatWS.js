#!/usr/bin/env node

module.exports = function(config) {

if( arguments.length <= 0 || !config ) {
  config = { verbose: true, memmax: 1000, precision: 10, weather: null };
}

var Cache = require('Cache')(config); // fs, os, path, mkdirp, memcached, etc

// clone cache obj with config
var NatWS = Cache.clone(Cache); // shallow or deep copy?

NatWS.request = require('request'); // handles url redirects quite gracefully

NatWS.jsonURL = 'http://forecast.weather.gov/MapClick.php?unit=0&lg=english&FcstType=json'; // +
                // '&lat=29.6805&lon=-82.4271' 
// https://github.com/request/request#custom-http-headers -- evidently default header yields
// 403 error freom nws ... so try the firefox header
NatWS.options = {
  url: NatWS.jsonURL,
  headers: {'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0'}
};
// [lat, lon] dc (actually churchkey pub on new 14th) and gville
NatWS.loclist = [ [38.907826, -77.03195], [ 29.6520, -82.3250 ] ];

NatWS.Gatorville = function() { return ' '; }

NatWS.DC = function() {
  var dcplace = '{ "type": "Feature",'+
                  '"geometry": { "type": "Point", "coordinates": [-77.03195, 38.907826] },' +
                  '"properties": { "marker-symbol": "bar", "name": "Churchkey", "address": "1337 14th St NW",' +
                  '"note": "Ask the bartender for the password" } }';
  var   gsfc = '{ "type": "Feature",'+
               '"geometry": { "type": "Point", "coordinates": [-76.842284, 38.994356] },' +
               '"properties": { "marker-symbol": "building", "name": "NASA Goddard B32", "address": "Greenbelt Maryland",' +
               '"note": "Earth Sciences satellite control and data center" } }';

  return dcplace + ', ' + gsfc;
}

NatWS.geojsonOfInterest = function() {
  var header = '{ "type": "FeatureCollection", "features": [ ';
  var footer = ' ]}';
  var dc = NatWS.DC();
  //var gv = NatWS.Gatorville();
  //return header + dc + ', ' + gv + footer;
  return header + dc + footer;
}


NatWS.parseObs = function(latest) {
  var obstxt = '' + NatWS.memSize() + '). no latest data obs? ';
  if( ! latest || ! latest.hasOwnProperty('obs') ) { 
    console.log('NatWS.parseObs> '+obstxt+latest);
    return obstxt;
  }
  var val = latest.obs;
  var today = val.data.text[0] + ' ... ' + val.data.text[1];
  var current = val.currentobservation;
  obstxt = '' + NatWS.memSize() + '). ' + 
           'lat: ' + current.latitude + ', lon: ' + current.longitude + ' -- ' +
           current.name.split(',')[0] + ', ' + current.state +
           ' -- ' + current.Weather + ', ' + current.Temp + ' deg.' +
           ', humidity: ' + current.Relh + ', winds: ' + current.Winds +
           ' | ' + today;
  if( NatWS.verbose ) console.log('NatWS.parseObs> '+obstxt);
  return obstxt;
}

NatWS.cachedObs = function(loc) { // from cache
  // parse NOAA National Weather Service json rest response:
  // resp.data.text[] is a 2*7 element forecast and
  // resp.data.currentobservation[] is most recent info  
  var cachelen = NatWS.memSize();
  //console.log('NatWS.cachedObs> cachelen: ' + cachelen);
  var latest = { qtidx: "0", obs: "NOAA National Weather Service current conditions -- unknown!" } ;
  if( cachelen <= 0 ) {
    console.log('NatWS.cachedObs> no cache? '+cachelen);
    return latest.obs;
  }
  latest = NatWS.latestObs(loc); // Cache.latestObs()
  return NatWS.parseObs(latest);
}

NatWS.setObs = function(loc, val, socket) {
  var data = NatWS.push(loc, val); // push latest obs onto cache
  // and optionally send info to client
  var latest = NatWS.latestObs(loc);
  if( NatWS.verbose ) console.log('NatWS.setObs> '+data.qtidx+' == '+latest.qtidx); 
  var conditions = NatWS.parseObs(latest);
  if( socket ) {
    socket.emit('weather', conditions);
    if( NatWS.verbose ) console.log('NatWS.setObs> emit conditions to client: '+conditions);
  } else {
    console.log('NatWS.setObs> no socket client to emit conditions to? '+conditions);
  }
  return conditions;
}

NatWS.handleObs = function(body, loc, socket) {
  // update in-memory latest value
  try {
    var val = JSON.parse(body); 
    val.now = new Date(); // cache time-stamp
    // push latest obs onto cache and emit to client 
    var obstxt = NatWS.setObs(loc, val, socket);
    var filename = NatWS.saveFile(loc, val); // sync file-cache
  } catch( e ) {
   console.log('NatWS.handleObs> resp. body is notJSON ... ' + e);
   //if( NatWS.verbose ) console.log('NatWS.handleObs> resp. body: '+body);
  }
}

NatWS.conditions = function(local, socket) {
  // tbd city name to latlon func and vice-versa ... for now local should be == [lat, lon]
  // var testlocals = ['Washington,DC', 'Gainesville,FL'];
  if( arguments.length > 0 && local) {
    NatWS.loclist.push(local); // keep track of locations?
    if( NatWS.verbose ) console.log('NatWS.conditions> '+NatWS.loclist.length+'). new loc: '+local);
  }
  else {
    local = NatWS.loclist[NatWS.loclist.length-1]; // last-latest loc. 
    if( NatWS.verbose ) console.log('NatWS.conditions> '+NatWS.loclist.length+'). use latest loc: '+local);
  }
  var fetchall = [ local ]; // tbd fetch last 2 or 3 or whatever to compare
  // support fetching list of locs.
  fetchall.forEach(function(loc) {
    var url = NatWS.options.url = NatWS.jsonURL + '&lat=' + loc[0] + '&lon=' + loc[1];
    if( NatWS.verbose ) console.log('NatWS.conditions> '+url);
    NatWS.request(NatWS.options, function (err, res, body) {
      if( NatWS.verbose ) console.log('NatWS.conditions> status code: '+ res.statusCode); 
      if( !err ) { return NatWS.handleObs(body, loc, socket); }
      if( NatWS.verbose ) console.log('NatWS.conditions> '+err);
    });
  });
}

//config.weather.push(NatWS);
config.weather = NatWS;
return NatWS;
};


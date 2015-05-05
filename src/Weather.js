#!/usr/bin/env node

module.exports = function(config) {

//var Weather = {}
//NatWs.cache = require('Cache')(config); // fs, os, path, mkdirp, memcached, etc

var Cache = require('Cache')(config); // fs, os, path, mkdirp, memcached, etc
var Weather = Cache.clone(Cache); // shallow or deep copy?
// Cache(cloned) obj should provide:
// Cache.memSize()
// Cache.mem.max -- max number of cached observations in memory -- all other in memcached or filesys
// Cache.mem.push(loc, latestval)
// Cache.mem.pull(qtidx);
// Cache.memd.boot() (memcached as child proc)

Weather.request = require('request'); // handles url redirects quite gracefully

// open weather map provides 1200 api calls/min. freely, any more and it will cost $.$$
Weather.OWMjsonURL = 'http://api.openweathermap.org/data/2.5/weather?'; // + 'lat=35&lon=139'
Weather.OWMjsonURL = 'http://api.openweathermap.org/data/2.5/weather?APPID=9a7562a29cfe9c463b7b12ada3c0b319'; // + 'lat=35&lon=139

// NOAA national weather service is free and unrestricted, but only provides usa info:
Weather.NWSjsonURL = 'http://forecast.weather.gov/MapClick.php?unit=0&lg=english&FcstType=json'; // +
                // '&lat=29.6805&lon=-82.4271' 
// https://github.com/request/request#custom-http-headers -- evidently default header yields
// 403 error freom nws ... so try the firefox header
Weather.options = {
  url: Weather.jsonURL,
  headers: {'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0'}
};
// the 1000 call / day free develper api key: 60*24 / 1000 == 1.44 min. ... so use freq. ~ 1 / 90 sec
Weather.interval = 90 * 1000; // 90 sec. interval
Weather.loclist = [ [38.907826, -77.03195], [ 29.6520, -82.3250 ] ];
// [lat, lon] dc (actually churchkey pub on new 14th) and gville

Weather.parseObs = function(val) {
  var today = val.data.text[0] + ' ... ' + val.data.text[1];
  var current = val.currentobservation;
  obstxt = '' + Weather.memSize() + '). ' + 
           'lat: ' + current.latitude + ', lon: ' + current.longitude + ' -- ' +
           current.name.split(',')[0] + ', ' + current.state +
           ' -- ' + current.Weather + ', ' + current.Temp + ' deg.' +
           ', humidity: ' + current.Relh + ', winds: ' + current.Winds +
           ' | ' + today;
  console.log('Weather.parseObs> '+obstxt);
  return obstxt;
}

Weather.cachedObs = function() { // from cache
  // parse NOAA National Weather Service json rest response:
  // resp.data.text[] is a 2*7 element forecast and
  // resp.data.currentobservation[] is most recent info  
  var cachelen = Weather.memSize();
  //console.log('Weather.cachedObs> cachelen: ' + cachelen);
  var latest = { qtidx: "0", obs: "NOAA National Weather Service current conditions -- unknown!" } ;
  if( cachelen <= 0 ) {
    console.log('Weather.cachedObs> no cache? '+cachelen);
    return latest.obs;
  }
  latest = Weather.latest();
  return Weather.parseObs(latest.obs);
}

Weather.setObs = function(loc, val, socket) {
  Weather.mem.push(loc, val); // push latest obs onto cache
  // and optionally send info to client
  var conditions = Weather.parseObs(val);
  if( socket ) socket.emit('weather', conditions);
  return conditions;
}

Weather.Gatorville = function() { return ' '; }

Weather.DC = function() {
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

Weather.geojsonOfInterest = function() {
  var header = '{ "type": "FeatureCollection", "features": [ ';
  var footer = ' ]}';
  var dc = Weather.DC();
  //var gv = Weather.Gatorville();
  //return header + dc + ', ' + gv + footer;
  return header + dc + footer;
}

Weather.handleObs = function(body, loc, socket) {
  // update in-memory latest value
  try {
    var obs = JSON.parse(body); 
    obs.now = new Date(); // cache time-stamp
    var obstxt = Weather.setObs(loc, obs, socket); // push latest obs onto cache  
    var filename = Weather.saveFile(loc, obs);
  } catch( e ) {
   console.log('Weather.handleObs> resp. body is notJSON ... ' + e);
  }
}

Weather.conditions = function(local, socket) {
  // tbd city name to latlon func and vice-versa ... for now local should be == [lat, lon]
  // var testlocals = ['Washington,DC', 'Gainesville,FL'];
  if( arguments.length > 0 && local) {
    Weather.loclist.push(local);
    console.log('Weather.conditions> '+Weather.loclist.length+'). new loc: '+local);
  }
  var fetchall = [ Weather.loclist[Weather.loclist.length-1] ]; // [ dc, gv ] -- just gv
  // support fetching listof locs.
  fetchall.forEach(function(loc) {
    var url = Weather.options.url = Weather.jsonURL + '&lat=' + loc[0] + '&lon=' + loc[1];
    console.log('Weather.conditions> '+url);
    Weather.request(Weather.options, function (err, res, body) {
      console.log('Weather.conditions> status code: '+ res.statusCode); 
      if( !err ) { return Weather.handleObs(body, loc, socket); }
      console.log('Weather.conditions> '+err);
    });
  });
}

return Weather;
};


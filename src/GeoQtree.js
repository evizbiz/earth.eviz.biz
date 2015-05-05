#!/usr/bin/env node
// https://github.com/B2MSolutions/node-quadtree/graphs/contributors
// thanks to jamesand roy and the b2m dev. team for this.

// i've just simply added a config. parm. and some defaults, with
// func. "signatures" that take a 2-elem locations array: [ lat, lon ] alternatives.
// note this module returns a function that takes the optional config parm -- usage:
// var qtree = require('GeoQtree')(); or var qtree = require('GeoQtree')({precision: 10, etc.}); 

module.exports = function(config) { 

var GeoQtree = {}; 
GeoQtree.config = {};
if( arguments.length > 0 && config ) GeoQtree.config = config;
GeoQtree.config.verbose = true; // debug?

// GeoQtree is meant for global lat-lon coords
GeoQtree.precision = GeoQtree.config.precision || 10; // default precision
GeoQtree.range = GeoQtree.config.range || { lng: 180, lat: 90 }; 

GeoQtree.placeLoc = function(name) {
  // use osm nomination placename search api and return list of qt-indices 
  var osmURL = 'http://nominatim.openstreetmap.org/search?format=json&limit=5&q='+name;
}

GeoQtree.placeName = function(loc) {
  // use osm nomination placename reverse search api and place-name for location
  // location parm can be lat-lon or qt-index
  var lat = 29.65, lon = -82.35;
  var osmURL = 'http://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat='+lat+'&lon='+lon;
}

GeoQtree.encode = function(coord, prec) {
  var precision = GeoQtree.precision;
  if( arguments.length <= 0 ) {
    var retval = 'please provide coord parm!'
    console.log('GeoQtree.encode> '+retval);
    return retval;
  }
  if( coord.length ) {
    // really should also check legth == 2 too!
    coord = { lat: coord[0], lng: coord[1] }; // redefine coord compatible with original func.
  }
  if( arguments.length > 1 && prec ) {
    precision = GeoQtree.precision = prec;
    //console.log('GeoQtree.encode> reset default precision: ' + precision);
  }
  var origin = { lng: 0, lat: 0 };
  var range = { lng: GeoQtree.range.lng, lat: GeoQtree.range.lat };
  var result = '';

  console.log('GeoQtree.encode> precision: '+precision+', coord: '+coord.lat + ', '+coord.lng);
  while(precision > 0) {
    --precision; range.lng /= 2; range.lat /= 2;

    if((coord.lng < origin.lng) && (coord.lat >= origin.lat)) {
      origin.lng -= range.lng; origin.lat += range.lat;
      result += '0';
    } else if((coord.lng >= origin.lng) && (coord.lat >= origin.lat)) {
      origin.lng += range.lng; origin.lat += range.lat;
      result += '1';
    } else if((coord.lng < origin.lng) && (coord.lat < origin.lat)) {
      origin.lng -= range.lng; origin.lat -= range.lat;
      result += '2';
    } else {
      origin.lng += range.lng; origin.lat -= range.lat;
      result += '3';
    }
  }
  console.log('GeoQtree.encode> index: '+result);
  return result;
};

GeoQtree.decode = function(encoded) {
  var origin = { lng: 0, lat: 0 };
  var error = { lng: 180, lat: 90 };
  var precision = encoded.length;
  var currentPrecision = 0;

  while(currentPrecision < precision) {
    var quadrant = encoded[currentPrecision];
    ++currentPrecision;
    error.lng /= 2; error.lat /= 2;
    if(quadrant === '0') {
      origin.lng -= error.lng; origin.lat += error.lat;
    } else if(quadrant === '1') {
      origin.lng += error.lng; origin.lat += error.lat;
    } else if(quadrant === '2') {
      origin.lng -= error.lng; origin.lat -= error.lat;
    } else {
      origin.lng += error.lng; origin.lat -= error.lat;
    }
  }
  return { origin: origin, error: error };
};

GeoQtree.neighbour = function(encoded, north, east) {
  var decoded = GeoQtree.decode(encoded);
  var neighbour = {
    lng: decoded.origin.lng + decoded.error.lng * east * 2,
    lat: decoded.origin.lat + decoded.error.lat * north * 2
  };
  return GeoQtree.encode(neighbour, encoded.length);
};

GeoQtree.bbox = function(encoded) {
  var decoded = GeoQtree.decode(encoded);
  return {
    minlng: decoded.origin.lng - decoded.error.lng,
    minlat: decoded.origin.lat - decoded.error.lat,
    maxlng: decoded.origin.lng + decoded.error.lng,
    maxlat: decoded.origin.lat + decoded.error.lat
  };
};

GeoQtree.envelop = function(bbox, precision) {
  var end = GeoQtree.encode({ lng: bbox.maxlng, lat: bbox.maxlat }, precision);
  var rowStart = GeoQtree.encode({ lng: bbox.minlng, lat: bbox.minlat }, precision);
  var rowEnd = GeoQtree.encode({ lng: bbox.maxlng, lat: bbox.minlat }, precision);
  var current = rowStart;
  var qtrees = [];
  while (true) {
    while(current != rowEnd) {
      qtrees.push(current);
      current = GeoQtree.neighbour(current, 0, 1);
    }

    if(current == end) break;

    qtrees.push(rowEnd);
    rowEnd = GeoQtree.neighbour(rowEnd, 1, 0);
    rowStart = GeoQtree.neighbour(rowStart, 1, 0);
    current = rowStart;
  }
  qtrees.push(end);
  return qtrees;
};

return GeoQtree;
}; // end module's single exported func (kinda like a ctor)

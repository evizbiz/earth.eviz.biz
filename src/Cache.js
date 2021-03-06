#!/usr/bin/env node
// in-memory, filesys and memcacheid i/o support:
// usage (optional single arg config obj, but could be an empty obj):
// var mycache = require('Cache')( { verbose: true, memmax: 1000, precision: 10 } );

module.exports = function(config) { 

if( arguments.length <= 0 || !config ) {
  config = { port: 9000, verbose: true, memmax: 1000, precision: 10 };
}

// in-memory cache obj
Mem = {};
// data is as an associative array of quadtree indexed items: { qtidx: idx, obs: val }
// currently the val is whatever json REST response body is fetched from WeatherMap of NOAA 
Mem.data = {};
Mem.qidxlist = []; // keep track of in-memory quadtree indices (keys in data == qtidx)
Mem.lodash = require('lodash'); // clone deep or shallow?
Mem.clone = Mem.lodash.clone; // or Mem.lodash.deepClone
// max number of cached observations in memory obj -- all others in memcached or filesys
Mem.max = config.memmax || 1000; 
Mem.latestIdx = '0000000000'; // precision 10 
Mem.verbose = true;

// memcached child proc?
var Memd = {}; // memcached interface obj
Memd.Memcached = require('memcached');
Memd.spawn = require('child_process').spawn; // support child procs
Memd.max = 10 * Mem.max; // max number of cached observations in memcached -- all others in mem or filesys
Memd.verbose = true;

// export this:
var Cache = {}; 

// minimal config:
Cache.verbose = config.verbose || true;
Cache.precision = config.precision || 10; // 10 default

// shortcuts:
Cache.memmax = Mem.max;
Cache.memdmax = Memd.max;
//console.log('Cache geoquadtree precision: '+ Cache.precision);
// quadtree module
Cache.clone = Mem.clone;
Cache.latestIdx = Mem.latestIdx;

Cache.quadtree = require('GeoQtree')(config); // NOAA NWS resp.data for lat-lon level 10 quadtree 
Cache.fs = require('fs'); // file i/o
Cache.os = require('os');
Cache.glob = require('glob');
//Cache.logbuf = require('log-buffer'); // this hangs?
//require('underscore'); lodash allegedly has more features than underscore (like deepClone)
Cache.mkdirp = require('mkdirp'); 
Cache.path = require('path'); 
Cache.lodash = Mem.lodash;
Cache.spawn = Memd.spawn; // support child procs

///////////////////////////// Memd funcs. ///////////////////////////////////////

Memd.connect = function(usocket) {  // child proc?
  var usock = '/usr/tmp/usocket.memcached'; // unix-unix socket (pipe)
  var daemon = config.usrbin[0] + 'memcached -s ' + usock;
  var memcached = new Memd.Memcached(usock);
  return memcached;
}
Memd.push = function(idx, data) {
  console.log('Memd.push> tbd ...'); 
  return 0; // return current size of memcached dataset
}
Memd.pull = function(idx) { 
  console.log('Memd.pull> tbd ...');
  return null;  // return data obj forgiven quadtree index
}

///////////////////////////// Mem funcs. ///////////////////////////////////////

Mem.sizeOf = function(obj) { return Mem.lodash.size(obj); }

Mem.pull = function(qidx) { 
  if( Mem.qidxlist.indexOf(qidx) < 0 ) {
    if( Mem.verbose ) console.log('Mem.pull> qidx not found: '+qidx);
    return null; // or what?
  }
  var data = Mem.data[qidx];
  if( Mem.verbose ) {
    console.log('Mem.pull> qtidx: '+ data.qtidx);
    console.log('Mem.pull> data: '+ data.obs);
  }
  return data;
} 

Mem.shift = function() {
  var idx = Mem.qidxlist.length - 1;
  if( idx < 0 ) return null;
  var idx0 = Mem.qidxlist[0];
  var val0 = Mem.clone(Mem.data[idx0]);
  if( Mem.verbose ) console.log('Mem.shift> before qidxlist size: '+Mem.sizeOf(Mem.qidxlist));
  var qidx = Mem.qidxlist.shift();
  if( Mem.verbose ) console.log('Mem.shift> after qidxlist size: '+Mem.sizeOf(Mem.qidxlist));
  if( Mem.verbose ) console.log('Mem.shift> idx0 and shifted: '+idx0+' and '+idx);
  if( Mem.verbose ) console.log('Mem.shift> before data size: '+Mem.sizeOf(Mem.data));
  delete Mem.data[qidx];
  if( Mem.verbose ) console.log('Mem.shift> after data size: '+Mem.sizeOf(Mem.data));
  return val0;
}

Mem.latestObs = function(loc) {
  // tbd get latest obs for loc[0] == lat, loc[1] = lon 
  // or loc == quadtree index
  // if( loc ) {
  //   var qidx = loc; // if string, length of string is quadtree precision
  //   if( !loc.isString() ) {
  //     var coord = { lat: loc[0], lng: loc[1] };
  //     qidx = Cache.quadtree.encode(coord, Cache.precision);
  //   } 
  //   return Mem.data[qidx];
  // }
  var lastidx = Mem.qidxlist.length - 1;
  if( lastidx < 0 ) {
    console.log('Mem.latestObs> Mem.qidxlist.length: '+Mem.qidxlist.length); 
    return null;
  }
  var qidx = Mem.qidxlist[lastidx];
  if( Mem.verbose ) console.log('Mem.latestObs> Mem.qidxlist.length: '+Mem.qidxlist.length+', qidx == '+qidx); 
  return Mem.data[qidx]; // data == { qtidx: idx, obs: val }
}

Mem.push = function(qidx, val) {
  if( Mem.verbose ) console.log('Mem.push> '+qidx);
  Mem.qidxlist.push(qidx);
  Mem.latestIdx = qidx; 
  var latest = { qtidx: qidx, obs: val };
  Mem.data[qidx] = Mem.lodash.clone(latest);
  //Mem.data[qidx] = Mem.lodash.cloneDeep(latest);
  var dsz = Mem.sizeOf(Mem.data);
  var isz = Mem.sizeOf(Mem.qidxlist);
  if( Mem.verbose ) {
    console.log('Mem.push> qidx: '+qidx); 
    console.log('Mem.push> item count: '+dsz+' == '+isz);
  }
  var latest = Mem.latestObs(qidx); 
  if( isz > Mem.max ) Cache.shift(); // prevent cache from exceeding memory limits:
  return latest;
}


//////////////////////////// Cache funcs. include Mem and Memd ///////////////
Cache.memd = Memd;
Cache.mem = Mem;
Cache.latestObs = Mem.latestObs;
Cache.sizeOf = Mem.sizeOf;
Cache.shift = Mem.shift;

Cache.fromFile = function(qidx) {
  console.log('Cache.fromFile> tbd ...');
  return null;  // return data obj forgiven quadtree index
}

Cache.push = function(loc, val, precision) { 
  var coord = { lat: loc[0], lng: loc[1] };
  var qidx = Cache.latestIdx = Cache.quadtree.encode(coord, Cache.precision);
  var data = Cache.mem.push(qidx, val);
  if( Cache.verbose ) console.log('Cache.push> qidx, data.qtidx: '+qidx+', '+ data.qtidx);
  return data;
}

Cache.pull = function(qidx) { 
  // return whatever was last pushed into mem { qtidx: 'level-10-lat-lon-idxstr', obs: { resp.data } };
  var data = Cache.mem.pull(qidx);
  if( ! data ) data = Cache.memd.pull(qidx);  // try memcached
  if( ! data ) data = Cache.fromFile(qidx);  // try filesystem
  return data;
}

Cache.memSize = function() {
  var dsz = Cache.sizeOf(Cache.mem.data);
  var isz = Cache.sizeOf(Cache.mem.qidxlist);
  if( Cache.verbose ) console.log('Cache.memSize> qidxlist: '+isz + ', data: '+dsz); 
  return isz; //Math.max(isz, dsz);
}

Cache.saveFile = function(loc, current) {
  var today = current.now.toJSON().split('T');
  var directory = './cache/'
  // 3 tries to ensure cache exists so that fs.write does not complain!
  Cache.mkdirp(directory); // make sure cache directory exists
  directory += today[0] + '/';
  Cache.mkdirp(directory); // make sure cache directory exists
  var coord = { lat: loc[0], lng: loc[1] };
  var idx = Cache.quadtree.encode(coord, Cache.precision);
  var filename = directory + idx + '_' + today[1] + '.json';
  if( Cache.verbose ) console.log('Cache.saveFile> save json to cache file: '+filename);
  Cache.fs.writeFileSync(filename, current);
  return filename;
}

Cache.utmain = function() {
  // unit test main 
  var arghash = require('minimist')(process.argv.slice(2));
  var args = arghash._;
  var argc = args.length;
  Cache.verbose = Cache.config.verbose = Cache.mem.verbose = true;
  Cache.memmax = Cache.mem.max = 3; // || parseInt(args[0]);
  var locs = [[0, 0], [-10, -20], [10, 20], [-30, -60], [30, 60], [-40, -80], [40, 80]];
  var qidxlist = [];
  console.log('Cache.utmain> Cache.latestIdx: '+Cache.latestIdx);
  locs.forEach(function(loc) {
    var today = (new Date()).toJSON().split('T');   
    var oldest = Cache.push(loc, today[1]+' another data value for location lat: '+loc[0]+', lon: '+loc[1]);    
    var latest = Cache.latestObs();
    qidxlist.push(latest.qtidx);
    console.log('Cache.utmain> Cache.latestIdx: '+Cache.latestIdx);
  });
  qidxlist.forEach(function(qidx) {
    var data = Cache.pull(qidx);
    if( data ) {
      console.log('Cache.utmain> qidx: '+qidx);
      console.log('Cache.utmain> data: '+data.qtidx+', '+data.obs);
    }
    else {
      console.log('Cache.utmain> no data in cache for quadtree index: '+qidx);
    }
  });
}

return Cache;
}; // end module's single exported func (kinda like a ctor)


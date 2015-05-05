#!/usr/bin/env node
// in-memory, filesys and memcacheid i/o support:
// usage:
// var mycache = require('Cache')( { verbose: true, usrbin: ['/usr/local/bin/', '/opt/bin/'] } );

module.exports = function(config) { 
var Cache = {}; 
if( arguments.length > 0 && config ) {
  Cache.config = config;
} else {
  Cache.config = {};
}
Cache.config.verbose = true;
Cache.config.memmax = 100;
Cache.config.memdmax = 10000;
Cache.config.usrbin = ['/usr/local/bin/', '/opt/bin/'];
if( ! Cache.config.precision ) Cache.precision = Cache.config.precision = 10; // 10 default
//console.log('Cache geoquadtree precision: '+ Cache.precision);
// quadtree module
Cache.quadtree = require('GeoQtree')(config); // NOAA NWS resp.data for lat-lon level 10 quadtree 

Cache.fs = require('fs'); // file i/o
Cache.os = require('os');
Cache.glob = require('glob');
//Cache.logbuf = require('log-buffer'); // this hangs?
//require('underscore'); lodash allegedly has more features than underscore (like deepClone)
Cache.mkdirp = require('mkdirp'); 
Cache.path = require('path'); 
Cache.spawn = require('child_process').spawn; // support child procs
Cache.lodash = require('lodash');
Cache.spawn = require('child_process').spawn; // support child procs
Cache.clone = Cache.lodash.clone;

Cache.arghash = require('minimist')(process.argv.slice(2));

// memcached child proc?
Cache.memd = {}; // memcached interface obj
Cache.memd.Memcached = require('memcached');

Cache.memd.connect = function(usocket) {  // child proc?
  var usock = '/usr/tmp/usocket.memcached';
  var daemon = config.usrbin[0] + 'memcached -s ' + usock;
  var memcached = new Cache.memd.Memcached(usock);
  return memcached;
}

Cache.memd.push = function(qtidx, data) { return 0; } // return current size of memcached dataset
Cache.memd.pull = function(qtidx) { return null; } // return data obj forgiven quadtree index
Cache.memd.max = config.memdmax; // max number of cached observations in memcached -- all others in mem or filesys

// in-memory cache obj can make use of memd ..
Cache.mem = {};
Cache.mem.data = {}; // treat this as an associative array -- quadtree indexed
Cache.mem.idxlist = []; // keep track of in-memory quadtree indices (keys in data)
Cache.mem.max = config.memmax; // max number of cached observations in memory obj -- all others in memcached or filesys

Cache.latestIdx = '0000000000'; // precision 10

// return whatever was last pushed into mem { qtidx: 'level-10-lat-lon-idxstr', obs: { resp.data } };
Cache.latest = function() { 
  var lastidx = Cache.mem.idxlist.length - 1;
  if( lastidx < 0 ) {
    console.log('Cache.latest> Cache.mem.idxlist.length: '+Cache.mem.idxlist.length); 
    return null;
  }
  var qtidx = Cache.mem.idxlist[lastidx];
  console.log('Cache.latest> Cache.mem.idxlist.length: '+Cache.mem.idxlist.length+', qtidx == '+qtidx); 
  return Cache.mem.data[qtidx];
}

Cache.sizeOf = function(obj) { return Cache.lodash.size(obj); }
Cache.memSize = function() {
  var dsz = Cache.sizeOf(Cache.mem.data);
  var isz = Cache.sizeOf(Cache.mem.idxlist);
  return isz; //Math.max(isz, dsz);
}
 
Cache.shift = function() {
  var lastidx = Cache.mem.idxlist.length - 1;
  if( lastidx < 0 ) return null;
  var idx0 = Cache.mem.idxlist[0];
  var val = Cache.mem.data[idx0];
  console.log('Cache.shift> before idxlist size: '+Cache.sizeOf(Cache.mem.idxlist));
  var idx = Cache.mem.idxlist.shift();
  console.log('Cache.shift> after idxlist size: '+Cache.sizeOf(Cache.mem.idxlist));
  console.log('Cache.shift> idx0 and shifted: '+idx0+' and '+idx);
  console.log('Cache.shift> before data size: '+Cache.sizeOf(Cache.mem.data));
  delete Cache.mem.data[idx];
  console.log('Cache.shift> after data size: '+Cache.sizeOf(Cache.mem.data));
  return val;
}

Cache.mem.pull = function(idx) { 
  var val = Cache.mem.data[idx];
  console.log('Cache.mem.pull> idx: '+ val.qtidx);
  console.log('Cache.mem.pull> data text[0]: '+ val.obs.data.text[0]);
  if( val ) return val;
  return null; // or what?
} 

Cache.mem.push = function(loc, val) {
  console.log('Cache.mem.push> '); console.log(loc);
  var coord = { lat: loc[0], lng: loc[1] };
  var idx = Cache.latestIdx = Cache.quadtree.encode(coord, Cache.precision);
  console.log('Cache.mem.push> idx: '+idx); console.log(coord);
  Cache.latestIdx = idx;
  console.log('Cache.mem.push> idx: ', idx); 
  var latest = { qtidx: idx, obs: val };
  Cache.mem.data[idx] = Cache.lodash.clone(latest);
  //Cache.mem.data[idx] = Cache.lodash.cloneDeep(latest);
  Cache.mem.idxlist.push(idx);
  var dsz = Cache.sizeOf(Cache.mem.data);
  var isz = Cache.sizeOf(Cache.mem.idxlist);
  console.log('Cache.mem.push> idx: '+idx); console.log('Cache.mem.push> item count: '+dsz+' == '+isz);
  var check = Cache.mem.pull(idx); 
  if( isz <= Cache.mem.max ) return idx; // ok within limits
  // prevent cache from exceeding memory limits:
  var oldest = Cache.shift(); // removes and returns first item in array list 
  return idx;
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
  console.log('Cache.saveFile> save json to cache file: '+filename);
  Cache.fs.writeFileSync(filename, current);
  return filename;  
}

return Cache;
}; // end module's single exported func (kinda like a ctor)


#!/usr/bin/env node
// the minimal config should provide the web directoy to publish
// and the tcp port # to listen on, and optionally a log verbosity,
// which we can pass as an arg to the  module loader, and optionally
// override by the startup func. ...
//
// publish these web page directory content:
//var web = [__dirname, __dirname + '/pub', __dirname + '/leaflet', __dirname + '/openlayers'];
var web = [__dirname];

// default http port 9000
var port = process.env.PORT || parseInt(process.argv.slice(2)) || 9000;
var cache = 1000; // max size of memory cache 
var config = { pub: web, listen: port, memmax: cache, verbose: true };

// the module load returns an express server init / ctor function that takes one arg
// config obj and returns the Eserver obj
var service = require('Eserver')(config);

// start the service listening on indicated port and indicate the directory of
// the web index.html and all other so-called satic file assets to be published:
//console.log('server> conf: ', config);
service.startup(config); 


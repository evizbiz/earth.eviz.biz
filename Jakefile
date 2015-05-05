var fs = require('fs');
var util = require('util');
//var mjson = require('mjson');

console.log('from: http://howtonode.org/intro-to-jake and http://jakejs.com/docs');
console.log('also see: https://srackham.wordpress.com/2014/08/23/switching-from-grunt-to-jake/');

task('default', ['deploy'], function () {
  //console.log('This is the default task.');
  console.log('from: http://howtonode.org/intro-to-jake and http://jakejs.com/docs');
  console.log('also see: https://srackham.wordpress.com/2014/08/23/switching-from-grunt-to-jake/');
  //console.log(util.inspect(arguments));
});

task('clean', [], function () {
  console.log('generate package.json from package.cjson (commented json)');
  //console.log(util.inspect(arguments));
  // evidently /bin/sh is used, and the r.e. is insensitive to case?
  //var cmd = 'rm -rf node_modules/[a-z]* results in empty directory (i.e. [A-Z]* gone too)!
  var cmd = "/bin/csh -c 'rm -rf ./cache ./node_modules/{.bin,[a-z]*}'"; // better, be sure /bin/csh is installed
  jake.exec(cmd, function() { console.log(cmd); });  
});

task('package', [], function () {
  console.log('generate package.json from package.cjson (commented json)');
  //console.log(util.inspect(arguments));
  var cmd = "mjson.js -i ' ' package.cjson > package.json";
  jake.exec(cmd, function() { console.log(cmd); });  
});

task('npm', [], function () {
  console.log('invoke npm for package.json to install all module dependencies');
  //console.log(util.inspect(arguments));
  var cmd = "npm install";
  jake.exec(cmd, function() { console.log(cmd); });  
});

task('index', ['npm'], function() {
  console.log('parse ReadMe.md into index.html');
  //console.log(util.inspect(arguments));
  var head = "./node_modules/.bin/jade -P < src/head.jade | head --lines=-1 | sed 's/  //g' > ./index.html"
  var body = "echo '<body>' >> ./index.html"
  var md = "./node_modules/.bin/md2html ./ReadMe.md >> ./index.html"
  var foot = "echo '</body>\n</html>' >> ./index.html"
  var cmds = [head, body, md, foot];
  jake.exec(cmds, function() { console.log(cmds); });  
});

task('deploy', ['index'], function () {
  console.log('install node.js custom modules int ./node_module');
  //console.log(util.inspect(arguments));
  var cmd = "/bin/csh -c 'cp -p ./src/[A-Z]*.js ./node_modules'";
  jake.exec(cmd, function() { console.log(cmd); });  
});


#!/usr/bin/env python
#!/usr/bin/env python
"""Module docstring.
From Guido Van Rossum blog on generic main() func. app. entry:
"This serves as a long usage message. I've written a few main() functions in my time.
They usually have a structure roughly like this .."

Placeholder for Flask-SocketIO version of earth.eviz.biz webserve ... TBD
"""
import errno, getopt, os, sys, time,
import bz2, copy, tarfile
import urllib, urllib2

def testWeatherAPI():
  # test gville loc:
  natws = 'http://forecast.weather.gov/MapClick.php?unit=0&lg=english&FcstType=json&lat=29.652&lon=-82.325'
  response = urllib2.urlopen(natws)
  json = response.read()
  print json

# end testWeartherAPI

def forex(arg):
  localtime = time.localtime()
  os.environ['TZ'] = 'EST'
  timestr = time.strftime('%x %X %z')
# datimestr = time.strftime("%Y%m%d%H%M%S", localtime)
  datimestr = time.strftime("%Y%m%d%H%M%S")
  jsonfile='quote_forex'+datimestr+'.json' 
  ref='from: https://openexchangerates.org/quick-start';
  url = quote = 'http://openexchangerates.org/api/latest.json?app_id=a3aef6b27057437da448f3322a3b660e';
  print ref ; print url ; print jsonfile
  urllib.urlretrieve(url, jsonfile)
#end forex

class Usage(Exception):
  def __init__(self, msg):
    self.msg = msg
#end Usage

def appMain(argv=None):
  if argv is None:
    argv = sys.argv # etc., replacing sys.argv with argv in the getopt() call.
  # parse command line options
  try:
    opts, args = getopt.getopt(sys.argv[1:], "h", ["help"])
  except getopt.error, msg:
    raise Usage(msg)
  except Usage, err:
    print >>sys.stderr, err.msg ; print >>sys.stderr, "for help use -h or --help"
    return 1
  # process options
  for o, a in opts:
    if o in ("-h", "--help"):
      print __doc__
      return 0

  # process arguments
  forex(argv) # forex() is defined elsewhere
#end appMain

if __name__ == "__main__":
  sys.exit(appMain())


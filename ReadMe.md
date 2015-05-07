#### Open Street Map Weather WebSocket (Socket.io) demo. comparing Leaflet and OpenLayers3
 
Provides a popup / layover / marker containing local weather conditions for selected location.
Browser client single-left-mouse-click should emit lat-lon coord. to server which then converts to
quadtree cell index and searches for data in a quadtree indexed hash cache. If the cache does
not currently contain the location of interest, a REST API date fetch is perform from the NOAA
National Weather Service and/or the Open Weather Map service. The cache is also populated via
regular updates from the weather services.

#### Install and deploy: prerequisites -- node.js, npm, and jake; HAProxy optional ...
1. npm install -- ./node_modules/[a-z]
2. jake or jake deploy -- creates index.html from this ReadMe.md
3. ./server.js -- weberver default port 9000 showing this ReadMe/index.html: <http://localhost:9000>

Only tested so far with node.js 0.12.2 on Linux with chrome, firefox,and seamonkey
(deployed on <http://1and1.com> dedicated servers ...)

#### Demos

local install:

<http://localhost:9000/leaflet> and <http://localhost:9000/openlayers> 

also thru haproxy on my ubuntu and centos servers at 1and1 (with out-of-date ssl certificates): 

<https://leaf.earthlimb.net> and <https://ol3.earthlimb.net> 

<https://earth.eviz.biz/leaflet> and <https://earth.eviz.biz/openlayers>


#### TBD:
1. perform reverse geoloaction search for selected (mouse-click lat-lon) place-name via: <https://github.com/twain47/Nominatim>
2. get international data via open weather map service (see below).
3. get more data (atmosphere and ocean) from nasa eos and other satellites via: <https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+Available+Imagery+Products>
4. jazz it up with bootstrap -- 3-column layout ala: <https://github.com/evizbiz/bootstrap-viewer-template/tree/master/3-column>
5. complete cache functionaility -- file-system, memcached interface, and maybe postgis
6. refactor html into jade with markdown; refactor common js into separate module; refactor css with lessc
7. in-house deployment of mapnik or custom tile-server (local install of libosmium with full osm pdf dataset and optional import into local postgis)  
8. compare server-side node.js (server.js) with python flask micro-server-framework (server.py) implementation: <https://github.com/miguelgrinberg/Flask-SocketIO>
9. also compare socket.io and sockjs

#### NOAA Nationa Weather Service provides free info, but this particular interface provides lots of extraneuous content:

<http://forecast.weather.gov/MapClick.php?lat=29.7&lon=-82.5>

After some experimentation this works for json. "currentconditions" and 1 week forecat summary
(14 items 7 day and 7 night summary):

<http://forecast.weather.gov/MapClick.php?lat=29.7&lon=-82.5&unit=0&lg=english&FcstType=json>

 ... and FcstType=xml is also available ...

The NOAA national weather service (at least the above URL) provides USA data. International data
is freely available from the sources described below in a limited fashion. Note each service
expects registration for a unique 'appkey' ..  

---

#### Open Weather Map provide 1200 / min free -- wow!
    appkey: 'regiser to get your unique hex key'
    http://api.openweathermap.org/data/2.5/forecast/city?id=524901&APPID=appkey
    http://api.openweathermap.org/data/2.5/weather?lat=val&lon=val&APPID=appkey

#### Near real-time data from wunderground.com 500 / day free 
    appkey: 'regiser to get your unique hex key' 
    http://api.wunderground.com/api/appkey/conditions/q/lat,lon

#### forecast.io (appId keys requires) 1000 / day free 
    appkey: 'regiser to get your unique hex key'
    https://api.forecast.io/forecast/appkey/lat,lon

#### worldweatheronline.com provides 1000 / day free
    appkey: 'regiser to get your unique hex key'
    http://api.worldweatheronline.com/free/v2/weather.ashx?q=London&format=json&num_of_days=1&key=appkey

---

#### Geolocation with lat-lon data sources

Note that the NWS response.data json buffer for the requested lat-lon coord. includes a 
place / city / town name. Nevertheless it may be of use to provide a placename service too

Evidently the Open Street Map server provides a REST API for place-name lookup (place name
query that returns lat-lon coord) and reverse lookup (lat-lon query that returns place name).
See <http://wiki.openstreetmap.org/wiki/Nominatim>

Also see ./data/cities.csh -- maxmind provides a free compresses csv.txt with an extensive list
<http://dev.maxmind.com/geoip/legacy/geolite and https://www.maxmind.com/en/free-world-cities-database>
    
These are also of interset:

<http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places>
<http://download.geonames.org/export/dump>
<http://sedac.ciesin.columbia.edu/data/set/grump-v1-settlement-points/data-download>

---

### Short-flat minimal directory tree description

Note src and roadmap directories are not actually required by static express content service 

1. ./src -- custom node.js modules; jade source for html generation; maybe less source for css too?
2. ./src/roadmap -- future plans tbd
3. ./src/roadmap/site-packages -- future python modules

Directories served via node.js express "static" middelware:

1. ./css -- general css (perhaps compiled from lessc in ./src) shared by all pages.
2. ./fonts -- general fonts shared by all pages.
3. ./img -- general images shared by all pages.
4. ./js -- general javascript libs (like jquery) shared by all pages.
5. ./leaflet -- leaflet OSM + weather app
6. ./leaflet/css -- css files specific to leaflet app
7. ./leaflet/img -- image files specific to leaflet app
8. ./leaflet/js -- javascript specific to leaflet app
9. ./node_modules -- node.js modules supporting express service 
10. ./openlayers -- openlayers 3 OSM + weather app
11. ./openlayers/css -- css files specific to openlayers app
12. ./openlayers/img -- image files specific to openlayers app
13. ./openlayers/js -- javascript specific to openlayers app


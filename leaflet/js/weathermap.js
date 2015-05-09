// $.extend -- extend jquery with Leaflet websock Weather object
// note this assumes leaflet global L and jquery $.geolocation extension is present ... or ...
// One-shot position request example from: http://dev.w3.org/geo/api/spec-source.html
// navigator.geolocation.getCurrentPosition(callback);

// $.extend -- extend jquery with Leaflet websock Weather object
(function($) {
  var Weather = {};
  Weather.cache = { datetime: 'server date-time', text: 'weatherground near realtime conditions' };
  Weather.socket = null;
  Weather.position = { coords: { latitude: 29.65, longitude: -82.35 } }; // gainesville fl
  Weather.clickLoc = 'mouse click location text (lat-lon)';

  Weather.dateHandler = function(data) {
    Weather.cache.datetime = data; // console.log(Weather.cache.date);
    $('#date-header').text('date-time: '+Weather.cache.datetime);
  }
 
  Weather.conditionsHandler = function(data) {
    Weather.cache.text = data;
    console.log(Weather.clickLoc+' -- '+Weather.cache.text);
    $('#text-header').text(Weather.clickLoc);
    $('#text-footer').text(Weather.cache.text);
  }

  Weather.websock = function() {
    // test.js for use by test.html
    Weather.socket = io.connect();
    Weather.socket.on('date', function(data) { Weather.dateHandler(data); });
    Weather.socket.on('weather', function(data) { Weather.conditionsHandler(data); });
  }

  Weather.leafletMap = function() {
    // user location (position.coords.latitude, position.coords.longitude).
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(function(pos) { Weather.position = pos;} );
    }

    var map = L.map('map'); console.log('leaflet map for div id == "map"');
    //$.geolocation.get({win: alertMyPosition, fail: noLocation});
    var loc = { lat: Weather.position.coords.latitude, lon: Weather.position.coords.longitude }; // default gainesville fl
    var town = new L.LatLng(loc.lat, loc.lon); 
    //map.attributionControl.setPrefix(''); // Don't show the 'Powered by Leaflet' text. Attribution overload
    //add a tile layer to add to our map, in this case it's the 'standard' OpenStreetMap.org tile server
    var tileURL = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var contrib = '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    L.tileLayer(tileURL, { attribution: contrib, maxZoom: 18 }).addTo(map);
    // 
    //var circle = L.circle([loc.lat, loc.lon], 1000, { color: 'orange', fillColor: '#aaf', fillOpacity: 0.5 }).addTo(map);
    //circle.bindPopup(Weather.cache.datetime);
    //var marker = L.marker([loc.lat, loc.lon]).addTo(map);
    //marker.bindPopup(Weather.cache.text).openPopup();
    map.setView(town, 13);
    //$('#map').style.display = 'block'; map.invalidateSize(); // somehow this forece proper map rendering?
    document.getElementById('map').style.display = 'block'; map.invalidateSize();
    var onMapClick = function(e) { 
      Weather.clickLoc = e.latlng.toString();
      $('#text-header').text(Weather.clickLoc);
      Weather.socket.emit('coord', {'latlon': Weather.clickLoc } );
      var content = '<html><body><p>'+Weather.clickLoc+'</p>'+Weather.cache.text+'</body></html>';
      L.popup().setLatLng(e.latlng).setContent(content).openOn(map);
    };
    map.on('click', onMapClick); console.log('leaflet map click handler set');
    Weather.socket.emit('load', {'ready': 'new client connected and ready to roll.'} );
  }

  var Envelope = {};
  Envelope.Weather = Weather;
  $.extend(Envelope); // $.Weather obj should become an element of our extended jquery $ obj ...
})(jQuery);

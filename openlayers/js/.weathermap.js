// ol3-popup extension from: https://github.com/walkermatt/ol3-popup
/**
 * OpenLayers 3 Popup Overlay.
 * See [the examples](./examples) for usage. Styling can be done via CSS.
 * @constructor
 * @extends {ol.Overlay}
 * @param {Object} opt_options Overlay options, extends olx.OverlayOptions adding:
 * **`panMapIfOutOfView`** `Boolean`- Should the map be panned so that the popup is entirely within view.
 */
ol.Overlay.Popup = function(opt_options) {
  var options = opt_options || {};

  this.panMapIfOutOfView = options.panMapIfOutOfView;
  if (this.panMapIfOutOfView === undefined) {
    this.panMapIfOutOfView = true;
  }

  this.ani = options.ani;
  if (this.ani === undefined) {
    this.ani = ol.animation.pan;
  }

  this.ani_opts = options.ani_opts;
  if (this.ani_opts === undefined) {
    this.ani_opts = {'duration': 250};
  }

  this.container = document.createElement('div');
  this.container.className = 'ol-popup';

  this.closer = document.createElement('a');
  this.closer.className = 'ol-popup-closer';
  this.closer.href = '#';
  this.container.appendChild(this.closer);

  var that = this;
  this.closer.addEventListener('click', function(evt) {
    that.container.style.display = 'none';
    that.closer.blur();
    evt.preventDefault();
  }, false);

  this.content = document.createElement('div');
  this.content.className = 'ol-popup-content';
  this.container.appendChild(this.content);

  ol.Overlay.call(this, {
    element: this.container,
    stopEvent: true
  });

};

ol.inherits(ol.Overlay.Popup, ol.Overlay);

/**
 * Show the popup.
 * @param {ol.Coordinate} coord Where to anchor the popup.
 * @param {String} html String of HTML to display within the popup.
 */
ol.Overlay.Popup.prototype.show = function(coord, html) {
  this.setPosition(coord);
  this.content.innerHTML = html;
  this.container.style.display = 'block';
  if (this.panMapIfOutOfView) {
    this.panIntoView_(coord);
  }
  return this;
};

/**
 * @private
 */
ol.Overlay.Popup.prototype.panIntoView_ = function(coord) {

  var popSize = {
        width: this.getElement().clientWidth + 20,
        height: this.getElement().clientHeight + 20
    },
    mapSize = this.getMap().getSize();

  var tailHeight = 20,
    tailOffsetLeft = 60,
    tailOffsetRight = popSize.width - tailOffsetLeft,
    popOffset = this.getOffset(),
    popPx = this.getMap().getPixelFromCoordinate(coord);

  var fromLeft = (popPx[0] - tailOffsetLeft),
    fromRight = mapSize[0] - (popPx[0] + tailOffsetRight);

  var fromTop = popPx[1] - popSize.height + popOffset[1],
    fromBottom = mapSize[1] - (popPx[1] + tailHeight) - popOffset[1];

  var center = this.getMap().getView().getCenter(),
    curPx = this.getMap().getPixelFromCoordinate(center),
    newPx = curPx.slice();

  if (fromRight < 0) {
    newPx[0] -= fromRight;
  } else if (fromLeft < 0) {
    newPx[0] += fromLeft;
  }

  if (fromTop < 0) {
    newPx[1] += fromTop;
  } else if (fromBottom < 0) {
    newPx[1] -= fromBottom;
  }

  if (this.ani && this.ani_opts) {
    this.ani_opts.source = center;
    this.getMap().beforeRender(this.ani(this.ani_opts));
  }

  if (newPx[0] !== curPx[0] || newPx[1] !== curPx[1]) {
    this.getMap().getView().setCenter(this.getMap().getCoordinateFromPixel(newPx));
  }

  return this.getMap().getView().getCenter();

};

/**
 * Hide the popup.
 */
ol.Overlay.Popup.prototype.hide = function() {
  this.container.style.display = 'none';
  return this;
};

// ... end popup extension ol.Overlay.Popup ...
//
// below is weather socket.io stuff:

var Weather = {}

Weather.popup = new ol.Overlay.Popup();
Weather.socket = null;
Weather.clickcoord = null;
Weather.lonlat = [-82.325, 29.652]; // default is gatorville
Weather.cache = {
  datetime: 'server date-time',
  text: 'LatLon: '+Weather.lonlat[1]+', '+Weather.lonlat[0]+ ' current weather conditions and 7 day forecast'
};

Weather.dateHandler = function(data) {
  Weather.cache.datetime = data; // console.log(Weather.cache.date);
  $('#date').text('date-time: '+Weather.cache.datetime);
} 

Weather.conditionsHandler = function(data) {
  Weather.cache.text = data; // update cache with latest info.
  console.log('openlayers Weather.conditionsHandler got more weather conditions data'); // console.log(Weather.cache.text);
  //$('#text').text(Weather.cache.text);
  console.log(Weather.cache.text); // alert(Weather.cache.text);
  Weather.popup.show(Weather.clickcoord, '<span>Location: ' + Weather.cache.text + '</span>');
}

Weather.websock = function() {
  // test.js for use by test.html
  Weather.socket = io.connect();
  Weather.socket.on('date', function(data) { Weather.dateHandler(data); });
  Weather.socket.on('weather', function(data) { Weather.conditionsHandler(data); });
}

Weather.ol3Map = function() {
  // openlayers 3 cdn or local copy of ol3.min.js provides ol global 
  var osmsrc = new ol.source.OSM();
  var osmtile = new ol.layer.Tile({ source: osmsrc })
  var gville = ol.proj.transform(Weather.lonlat, 'EPSG:4326', 'EPSG:3857');
  var gview = new ol.View({center: gville, zoom: 6});

  // assume <div id="map"> provided by html5 index.html
  var map = new ol.Map({ target: 'map', layers: [ osmtile ], view: gview });

  // use popup extension of ol.Overlay
  map.addOverlay(Weather.popup);

  var onMapClick = function(click) {
    Weather.clickcoord = click.coordinate;
    // latlon text from openlayers looks like: 'LatLng(29.65673, -82.38459)'
    //var loctext = ol.coordinate.toStringHDMS(ol.proj.transform(click.coordinate, 'EPSG:3857', 'EPSG:4326'), 3);
    var loctext = ol.coordinate.toStringXY(ol.proj.transform(click.coordinate, 'EPSG:3857', 'EPSG:4326'), 3);
    Weather.socket.emit('coord', { 'lonlat': loctext} );
    console.log('socket emit coord: '+loctext);
    var lonlat = loctext.split(','); // console.log('lonlat: '+lonlat);
    var lon = parseFloat(lonlat[0]);
    var lat = parseFloat(lonlat[1]);
    console.log('lat: ' + lat + ', lon: ' + lon);
    //alert(loctext + ' ... lat: ' + lat + ', lon: ' + lon);
    //if( Math.abs(lat - Weather.lonlat[1]) > 1 || Math.abs(lon - Weather.lonlat[0]) > 1 ) {
      // reset weather info text to reflect fetch for new coords ...
      //Weather.cache.text = 'LatLon: '+Weather.lonlat[1]+', '+Weather.lonlat[0]+ ' expecting current conditions and 7 day forecast'
    //}
    Weather.lonlat[1] = lat; Weather.lonlat[0] = lon; // and reset current location
    Weather.popup.show(click.coordinate, '<span>Location: ' + Weather.cache.text + '</span>');
  };

  map.on('singleclick', onMapClick); console.log('openlayers map click handler set');

  Weather.socket.emit('load', { 'ready': 'new client connected and ready to roll.' });
}



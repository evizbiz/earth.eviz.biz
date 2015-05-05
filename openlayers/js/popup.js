// openlayers 3 cdn or local copy of ol3.min.js provides ol global 
var osmsrc = new ol.source.OSM();
var osmtile = new ol.layer.Tile({ source: osmsrc })
var gville = ol.proj.transform([-82.325, 29.652], 'EPSG:4326', 'EPSG:3857');
var gview = new ol.View({center: gville, zoom: 6});

// assume <div id="map"> provided by html5 index.html
var map = new ol.Map({ target: 'map', layers: [ osmtile ], view: gview });

// local ol3-popup.js extends ol.Overlay
var popup = new ol.Overlay.Popup();
map.addOverlay(popup);

map.on('singleclick', function(evt) {
    var prettyCoord = ol.coordinate.toStringHDMS(ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'), 2);
    popup.show(evt.coordinate, '<span>Location: ' + prettyCoord + '</span>');
});

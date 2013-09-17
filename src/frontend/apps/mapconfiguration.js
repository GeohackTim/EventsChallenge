var map, bounds, mapPanel, accordian, viewport, searchPanel;
var osm;
Proj4js.defs["EPSG:27700"] = "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs";
Proj4js.defs["EPSG:4326"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

//Pickup the browser size
var winW = 630, winH = 460;
if (document.body && document.body.offsetWidth) {
 winW = document.body.offsetWidth;
 winH = document.body.offsetHeight;
}
if (document.compatMode=='CSS1Compat' &&
    document.documentElement &&
    document.documentElement.offsetWidth ) {
 winW = document.documentElement.offsetWidth;
 winH = document.documentElement.offsetHeight;
}
if (window.innerWidth && window.innerHeight) {
 winW = window.innerWidth;
 winH = window.innerHeight;
}

function loadmap(){
	var options = {
		projection: new OpenLayers.Projection("EPSG:27700"),
        units: "m",
        numZoomLevels: 18,
		bounds: new OpenLayers.Bounds(
			461952, 167208, 480155, 179442
		),
        zoom: 10,
		controls: [new OpenLayers.Control.PanZoomBar()]
	};
	
	map = new OpenLayers.Map(options);
	
	osm = new OpenLayers.Layer.OSM( "Simple OSM Map");
    map.addLayer(osm);
	
	//Geolocation tools
	var geolocate = new OpenLayers.Control.Geolocate({
		bind: false,
		geolocationOptions: {
			enableHighAccuracy: true,
			maximumAge: 0,
			timeout: 7000
		}
	});
	
	//Register an event to add location if available
	firsttime = 0;
	var geolocationlayer = new OpenLayers.Layer.Vector('Current Location');
	geolocate.events.register("locationupdated",geolocate,function(e) {
		geolocationlayer.removeAllFeatures();
		
		var userLocation = new OpenLayers.LonLat(e.x, e.y);
		geolocationlayer.addFeatures([
			new OpenLayers.Feature.Vector(
				userLocation,
				{},
				{
					graphicName: 'cross',
					strokeColor: '#f00',
					strokeWidth: 2,
					fillOpacity: 0,
					pointRadius: 10
				}
			)
		]);
		if (firsttime == 0){
			map.setCenter(userLocation);
			firsttime = 1;
		}
	});
	geolocate.watch = true;
	map.addControl(geolocate);
	geolocate.activate();
	map.addLayer(geolocationlayer);	
	
	//Define the mapPanel
	mapPanel = new GeoExt.MapPanel({
		region: 'center', 
		layout: 'fit',
		height:(winH-68),
		width: (winW-210), //Width minus the east or west panel width
		stateId: "map",
		map: map,
		title: 'Event Map',
		getState: function() {
			var state = GeoExt.MapPanel.prototype.getState.apply(this);
			state.width = this.getSize().width;
			state.height = this.getSize().height;
			return state;
		},
		applyState: function(state) {
			GeoExt.MapPanel.prototype.applyState.apply(this, arguments);
			this.width = state.width;
			this.height = state.height;
		},
		zoom: 10
	});
	
	searchPanel = new Ext.Panel({
		title: "Event Search",
		layout: 'fit',
		html: ''
	});
	
	accordion = new Ext.Panel({
		region:'east',
		margins:'5 0 5 5',
		split:true,
		width: 210,
		layout:'accordion',
		items: [searchPanel]
	});
	
	viewport = new Ext.Panel({ //Viewport would fill the full screen so I'm using a panel
		renderTo: 'mapPanel',
		height: winH-68,  //Trouble is that we need to specify a height.
		layout:'border',
		items:[accordion, mapPanel]
	});

}
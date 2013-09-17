var map, bounds, mapPanel, accordian, viewport, searchPanel;
var osm, skiddlePoint, poiSaveStrategy;
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
	bounds = new OpenLayers.Bounds(
			461952, 167208, 480155, 179442
	).transform(new OpenLayers.Projection("EPSG:27700"),new OpenLayers.Projection("EPSG:900913"));
	
	var mapProj = new OpenLayers.Projection("EPSG:900913");
	
	map = new OpenLayers.Map({
        projection: mapProj,
        units: "m",
        numZoomLevels: 18,
        maxResolution: 156543.0339,
        maxExtent: bounds,
        layers: [
            new OpenLayers.Layer.OSM("OpenStreetMap", null, {
                transitionEffect: 'resize'
            })
        ],
        center: new OpenLayers.LonLat(405000,285000).transform(new OpenLayers.Projection("EPSG:27700"),new OpenLayers.Projection("EPSG:900913")),
        zoom: 1
    });
	
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
	
	var searchContent = 'Search Area:  <input id="buffersize" type="input" size="5" value="5" />m<br />';
	searchContent += '<input type="button" value="Select Location on Map" onclick="skiddlesearchon()" />'; 
	
	searchPanel = new Ext.Panel({
		title: "Event Search",
		layout: 'fit',
		html: searchContent
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
	
	poiSaveStrategy = new OpenLayers.Strategy.Save({auto: true});
	
	var selStyle = {
		strokeColor: "#006400",
		fillColor: "#32CD32",				
		strokeOpacity: 0.85,
		fillOpacity: 0.85,
		pointRadius: 5,
		strokeWidth: 2
	};
	var selSty = OpenLayers.Util.applyDefaults(selStyle, OpenLayers.Feature.Vector.style["default"]);
	
	// //////////////////////////////////////////////////////////
	// Vertex style, to allow custom theme for the 
	// editing controls. It is necessary in order to visualize 
	// correctly the edit controls symbols (RESHAPE, DRAG, ROTATE) 
	// in the map when a feature is selected.
	// //////////////////////////////////////////////////////////
	var vertexStyle = {
		strokeColor: "#ff0000",
		fillColor: "#ff0000",
		strokeOpacity: 1,
		strokeWidth: 2,
		pointRadius: 3,
		graphicName: "cross"
	};

	// ////////////////////////////////////////
	// Select style, the style used when a 
	// feature is selected.
	// ////////////////////////////////////////
	var select = {
		strokeColor: "blue", 
		strokeOpacity: 0.5,
		fillOpacity: 0.5,
		fillColor: "blue"
	};
			
	var selsm = new OpenLayers.StyleMap({
		'default': selSty,
		'vertex': vertexStyle,
		'select': select
	});
			
	pointLayer = new OpenLayers.Layer.Vector("Selection", {
		displayInLayerSwitcher: false,
		projection: mapProj,
		styleMap: selsm
	});
	map.addLayer(pointLayer);
	
	//Skiddle Search Tool
	OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
		defaultHandlerOptions: {
			'single': true,
			'double': false,
			'pixelTolerance': 0,
			'stopSingle': false,
			'stopDouble': false
		},

		initialize: function(options) {
			this.handlerOptions = OpenLayers.Util.extend(
				{}, this.defaultHandlerOptions
			);
			OpenLayers.Control.prototype.initialize.apply(
				this, arguments
			); 
			this.handler = new OpenLayers.Handler.Click(
				this, {
					'click': this.trigger
				}, this.handlerOptions
			);
		},

		trigger: function(e) {
			//Pickup the location
			var lonlat = map.getLonLatFromPixel(e.xy);
			var newGeom = lonlat;
			var attributes = {
				x: lonlat.lat,
				y: lonlat.lon,			
				buffer: document.getElementById('buffersize').value //This value is in metres
			};
			var newFeature = new OpenLayers.Feature.Vector(newGeom, attributes); 
			newFeature.state = OpenLayers.State.INSERT;
			
			//Delete any previous points
			pointLayer.removeAllFeatures();
			
			//Add the point graphic
			/*pointLayer.addFeatures([newFeature]);
			poiSaveStrategy.save(newFeature);
			pointLayer.refresh({force:true});
			BOUNDS ISSUE
			*/
			
			//Convert latlon to WGS84 latlon
			lonlat = lonlat.transform(new OpenLayers.Projection("EPSG:900913"),new OpenLayers.Projection("EPSG:4326"));
			
			//Call the search
			skiddlesearch(lonlat.lat,lonlat.lon,document.getElementById('buffersize').value);
							
			//Deactivate the tool
			skiddlePoint.deactivate();
		}

	});
	skiddlePoint = new OpenLayers.Control.Click();
	map.addControl(skiddlePoint);
	skiddlePoint.activate();
	skiddlePoint.deactivate();
	
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
		
		//point:{id:"OpenLayers.Geometry.Point_156", x:-134079.62897798652, y:6971611.355122281}
		var userLocation = new OpenLayers.LonLat(e.point.x, e.point.y);
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

}
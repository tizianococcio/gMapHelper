(function($) {
	"use strict";
	$.fn.gMapHelper = function(options) {

		// CONFIG
		var html_elements = {
			map_container: '',
		};
		
		var setup = $.extend({
			map_marker: '',
			geoLocalize: false,
			geoLocalizationScriptPath: '',
			markerClickCallback: function() {},
			APIUrl: '',
			startupPosition: '',
			zoomLevel: 6,
		}, options);
		
		var map_data = {
			map: null,
			markers: [],
			positions: [],
		};


		// Functions object
		var fn = {

			// HTML element upon which the plugin was called
			element: this,

			// Logger function
			logger: function(data) {
				if (console !== 'undefined')
				{
					console.log('[MAP PLUGIN LOG]');
					console.log(data);
				}
			},

			// Loads Google Maps API
			init: function() {
				$("<script>")
					.appendTo($('head'))
					.attr({type: 'text/javascript', src: 'http://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=cma'});
			},

			// Load function
			load: function() {

				// Sets the map container - Corresponds to the HTML element the plugin was called on
				html_elements.map_container = fn.element[0];

				// Loads map without geolocalizing
				if (!setup.geoLocalize)
				{
					fn.load_map();
				}
				else
				{
					// Tries to init geolocalization
					if(geoPosition.init())
					{
						// Geolocation Initialisation
						geoPosition.getCurrentPosition(success_callback,error_callback,{enableHighAccuracy:true});

						// Start timer, so that if in firefox the user picks "not now" at the geolocation question when the timer expires the user will still see a map
						if (navigator.userAgent.toString().match(/Firefox/))
						{
							var timer = setTimeout(function(){
								error_callback();
							}, setup.geolocation_timeout);
						}

					} else {
						// You cannot use Geolocation in this device
					}
				}
				

				// LOAD THE MAP USING DATA FROM GEOLOCATION
				function success_callback(p){
					fn.load_map(p.latitude, p.longitude);
				}

				// TODO: LOAD THE MAP CENTERING ON A COUNTRY
				function error_callback(p) { }
			},

			// TODO: InfoBubble
			generateInfoBubble : function() {
				var txt_color = ' style="color: #000;"';
				if (navigator.userAgent.toString().match(/MSIE 8.0/)) {
					txt_color = ' style="color: #fff;"';
					fn.infobubble = new InfoBubble({hideCloseButton: true, disableAutoPan: true, shadowStyle: 'display: none', borderWidth: 0, borderRadius: 0, padding: 0, minWidth: '300', backgroundColor: 'rgb(73, 73, 73)'});
				} else {
					txt_color = '';
					fn.infobubble = new InfoBubble({
						hideCloseButton: true,
						minWidth: '300',
						disableAutoPan: true,
						backgroundColor: 'rgba(57,57,57, 0.8)',
						padding: 0,
						borderRadius: 0,
						borderWidth: 0,
						shadowStyle: 'display: none'
					});
				}
				var boxText = document.createElement("div");
				boxText.style.cssText = "color: #fff; font-family: arial, verdana, sans-serif; font-size: 11px; padding: 5px;";
			},


			// Load map
			load_map: function () {

				// init geocoder
				var geocoder = new google.maps.Geocoder();

				// options
				var mapOptions = {
					zoom: setup.zoomLevel,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};

				// init map
				var map = new google.maps.Map(html_elements.map_container, mapOptions);

				// copy map object
				map_data.map = map;

				// geocoding
				geocoder.geocode( { 'address': setup.startupPosition }, function(results, status) {

					// call successfull
					if (status == google.maps.GeocoderStatus.OK)
					{
						map.setCenter(results[0].geometry.location);
						fn.load_data();

					} else {
						fn.logger('[LOADING] Cannot position map on : ' + setup.startupPosition + ' - Error: ' + status);
					}
				});
				
			}, // load_map

			load_data: function() {

				$.get(setup.APIUrl, function(json_data){
					fn.position_markers(json_data);
				}, "json");
				
			},

			position_markers: function(json, show_distance) {

				// init positions array
				map_data.positions = [];

				// Remove all markers from map
				if (map_data.markers) {
					for (var i in map_data.markers) {
						map_data.markers[i].setMap(null);
					}
					map_data.markers.length = 0;
				}

				/**
				 * Looping through the json data
				 * JSON data object is expected to have the following properties:
				 * address: Address where the marker should be positioned
				 * name: Name to be shown as a tooltip the mouse hovers the marker
				 * url: optional - Can be used as href destination for the clickCallback
				 */
				$(json).each(function(i, element){fn.logger(element);

					var position, marker;

					// Geocoding the address
					var geocoder = new google.maps.Geocoder();

					geocoder.geocode( { 'address': element.address }, function(results, status) {

						// if geocoding is successfull
						if (status == google.maps.GeocoderStatus.OK)
						{

							// Position of the marker
							position = results[0].geometry.location;

							// Generate the marker
							marker = new google.maps.Marker({
								position: position,
								map: map_data.map,
								icon: setup.map_marker,
								title: element.name
							});
							
							// Store the marker in the array
							map_data.markers.push(marker);

							// Store position data in array
							map_data.positions.push(position);
							

							// Callbacks
							google.maps.event.addListener(marker, 'click', function(marker){
								setup.markerClickCallback(marker, element);
							});
						}
					});
				});
			}, // position markers
		};
		
		// callback after google maps has been loaded from their server
		window.cma = function() {

			if (!setup.geoLocalize)
			{
				fn.load();
			}
			else
			{
				// Asyncronously loading of the geolocation script
				if (setup.geoLocalizationScriptPath !== '')
				{
					$.getScript(setup.geoLocalizationScriptPath, function(data, textStatus, jqxhr) {

						// Loads the map when the geolocation script has been loaded
						fn.load();
					});
				}
			}
		};

		fn.init();

	};

})(jQuery);
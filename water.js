// data.js, metrics.js and others should be loaded before this script is.

if (GBrowserIsCompatible()) {
    // http://colorbrewer2.org/index.php?type=qualitative&scheme=Set1&n=9
    var colors_qualitative = [
        "#E41A1C",
        "#377EB8",
        "#4DAF4A",
        "#984EA3",
        "#FF7F00",
        "#FFFF33",
        "#A65628",
        "#F781BF",
        "#999999"
    ];

    // http://colorbrewer2.org/index.php?type=sequential&scheme=Blues&n=9
    var colors_sequential = [
        "#F7FBFF", "#DEEBF7", "#C6DBEF", "#9ECAE1", "#6BAED6", "#4292C6",
        "#2171B5", "#08519C", "#08306B"
    ];
    colors_sequential.reverse();

    var map = new GMap2(document.getElementById("rivers"));
    // map.setCenter(new GLatLng(37.7533, -122.4293), 7); // SF
    map.setCenter(new GLatLng(39.4472,-119.7363), 6); // Tahoe
    map.setUIToDefault();

    // G_NORMAL_MAP displays the default road map view.
    // G_SATELLITE_MAP displays Google Earth satellite images. *
    // G_HYBRID_MAP displays a mixture of normal and satellite views.*
    // G_DEFAULT_MAP_TYPES contains an array of the above three types,
    // useful for iterative processing.
    // G_PHYSICAL_MAP displays a physical map based on terrain information.
    map.setMapType(G_PHYSICAL_MAP);

    // MapBox custom map
    var layername = "world-glass";
    var layer_title = "Chalk";
    var file_extension = "png";
    var min_zoom = 5;
    var max_zoom = 19;

    // var options = {minZoom: min_zoom, maxZoom: max_zoom, overlay:true, type: 'png', opacity: 100.0};
    // var custommap = GMapBox(layername, layer_title, options);
    // map.addOverlay(customoverlay);

    var options = {minZoom: min_zoom, maxZoom: max_zoom, type: 'png',
                   opacity: 100};
    var custommap = GMapBox(layername, layer_title, options);
    map.addMapType(custommap);
    map.setMapType(custommap);
    map.setUIToDefault();

    // set up marker mouseover tooltip div
    var tooltip = document.createElement("div");
    document.getElementById("rivers").appendChild(tooltip);
    tooltip.id = "tooltip";
    tooltip.style.visibility = "hidden";


    function drawOnMap (dateIndex) {

        // Setup the date for viewing
        var display_date = dates[dateIndex]["ymd"];
        YAHOO.util.Dom.get('d_date').innerHTML = display_date;

        // draw CA map
        drawCalifornia(map);


        function drawRiver(map, riverObj, color) {
            var pattern = riverObj.patterns[0];

            //  #DEBUG
            //           if (pattern != "COLORADO RIVER ")
            //              return;

            var latlngs = []; var flow = [];
            for (var i = 0; i < sites.length; i++) {
                var date = dates[dateIndex]["index"],
                valType = "00060",
                siteId = sites[i][0];

                if (sites[i][1].match(pattern) && metrics[siteId]) {
                    latlngs.push(new GLatLng(sites[i][2], sites[i][3]));
                    if (!metrics[siteId] || !metrics[siteId][date] ||
                        !metrics[siteId][date][valType]) {
                        console.log("no metrics[] for "+ siteId+ " "+
                                    date+ " "+ valType);
                        continue;
                    }
                    flow.push(metrics[siteId][date][valType]);

                    var point2 = new GLatLng(sites[i][2], sites[i][3]);

                    var tooltip_marker_html =
                        "<b>Sensor Location: " + sites[i][1] + "</b><br>" +
                        "USGS Sensor Code: " + siteId + "<br>" +
                        "Streamflow for " + display_date + ": " +
                        metrics[siteId][date][valType] + " cu. ft/s<br>"
                    ;

                    // var myMarker = createMarker(point2, sites[i][1],
                    //                             point2.toUrlValue(), map);
                    var myMarker = createMarker(point2, tooltip_marker_html,
                                                tooltip_marker_html, map);
                    // #DEBUG document.writeln(myMarker.getLatLng()+'<br>');

                    map.addOverlay(myMarker);
                }
            }


            // sort the sensor sites so that polygons are drawn correctly
            latlngs.sort(function (a, b) {
                             if (riverObj.flowdirection === "N" ||
                                 riverObj.flowdirection === "S")
                                 return a.lat() - b.lat();
                             else // E W
                                 return a.lng() - b.lng();
                         });

            // #DEBUG
            // var polyline = new GPolyline(latlngs, color, 20);
            //    map.addOverlay(polyline);


            for (var i = 0; i < latlngs.length-1; i++) {
                var p = makeSegmentPolygon(
                    latlngs[i],
                    flow[i],
                    latlngs[i+1],
                    flow[i+1],
                    color,
                    riverObj
                );
                map.addOverlay(p);
            }
        } // function drawRiver

        function makeSegmentPolygon(latlngfirst, size1, latlngsec,
                                    size2, color, river) {
            var dir = river.flowdirection;

            var size2graph = function(i) {
                // return Math.log(i/1000)/5; - gives -ve numbers
                return Math.pow(i/12000, (1/3));
                // return Math.sqrt(i/12000);
            };

            size1 = size2graph(size1);
            size2 = size2graph(size2);

            var latlngs_ew = [
                new GLatLng((latlngfirst.lat() - (size1/2)), latlngfirst.lng()),
                new GLatLng((latlngfirst.lat() + (size1/2)), latlngfirst.lng()),
                new GLatLng((latlngsec.lat() + (size2/2)), latlngsec.lng()),
                new GLatLng((latlngsec.lat() - (size2/2)), latlngsec.lng())
            ];

            var latlngs_ns = [
                new GLatLng((latlngfirst.lat()), latlngfirst.lng() - (size1/2)),
                new GLatLng((latlngfirst.lat()), latlngfirst.lng() + (size1/2)),
                new GLatLng((latlngsec.lat()), (latlngsec.lng() + (size2/2))),
                new GLatLng((latlngsec.lat()), (latlngsec.lng() - (size2/2)))
            ];

            var latlngs_test = [new GLatLng(latlngfirst.lat(), latlngfirst.lng()), latlngsec];

            var latlngs = latlngs_ns;
            if ( dir === "S" || dir === "N" )
                latlngs = latlngs_ns;
            else
                latlngs = latlngs_ew;

            var tooltip_html =
                "<b>" + river.name + "</b><br>" +
                "Length: " + river.length + " miles<br>" +
                "Peak Streamflow: " + river.peaksf + " cu. ft/s<br>" +
                "Rank: " + river.rank + "<br>"
            ;
            // #DEBUG
            // document.writeln(latlngfirst+'<t>'+latlngsec+'<t>'+'<br>');
            // document.writeln(latlngs+'<br>'+size1+'<t>'+size2+'<t>'+'<br><br><br>');

            // var p = new GPolygon(latlngs, color, 4, 0.0, color, 0.95);
            var p = createPolygon(latlngs, color, 16, 0.0, color,
                                  0.95, { clickable: false }, map, tooltip_html);
            return p;
        } // function makeSegmentPolygon

        for (var i=0; i < rivers.length; i++) {
            var color_index = ((rivers[i].rank + colors_sequential.length - 1) %
                               colors_sequential.length);
            drawRiver(map, rivers[i],
                      colors_sequential[color_index]);
            // colors_qualitative[ (colors_qualitative.length + i) %
            //                     colors_qualitative.length ]);
        }
    } //function drawOnMap

    // Draw for first date - other dates will be acccessed through slider
    drawOnMap(0);

    // Used to get length of dates {}
    Object.size = function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };


    function drawCalifornia (map) {
        var returnGeom = '-124.18585,41.99946|-124.17528,41.94972|-124.19027,41.86944|-124.21556,41.81999|-124.18138,41.75416|-124.11861,41.68306|-124.04680,41.46318|-124.04584,41.39444|-124.12222,41.15749|-124.09931,41.03854|-124.09889,40.99194|-124.14306,40.81194|-124.22945,40.74638|-124.27501,40.69472|-124.33195,40.58166|-124.35235,40.53222|-124.35431,40.41526|-124.32335,40.33625|-124.33118,40.27245|-124.29724,40.23805|-124.20222,40.17416|-124.06236,40.09166|-123.93111,39.94972|-123.86749,39.86915|-123.77236,39.70971|-123.73687,39.55499|-123.77417,39.49652|-123.79570,39.35333|-123.75418,39.25944|-123.68610,39.12194|-123.67458,39.00458|-123.70152,38.93041|-123.62000,38.86083|-123.53612,38.79611|-123.44750,38.73402|-123.35306,38.62444|-123.31306,38.57388|-123.23721,38.52276|-123.10723,38.46277|-122.95862,38.28527|-122.83056,38.12749|-122.80305,38.08194|-122.84000,38.10777|-122.92694,38.16249|-122.95639,38.05805|-122.89666,38.05444|-122.78229,38.00132|-122.65666,37.91055|-122.50548,37.83104|-122.45667,37.83346|-122.44333,37.90694|-122.47986,37.93666|-122.47833,38.11957|-122.36528,38.15555|-122.31139,38.13611|-122.26418,38.10999|-122.10974,38.06138|-122.05000,38.10878|-122.01863,38.14811|-121.97778,38.09721|-121.90527,38.06610|-121.81868,38.08115|-121.72292,38.04746|-121.66222,38.09659|-121.55319,38.11041|-121.47055,38.05499|-121.42722,38.01291|-121.49805,38.04888|-121.59111,38.10464|-121.64349,38.07899|-121.68485,38.01812|-121.83375,38.03666|-121.91555,38.05416|-122.01584,38.06610|-122.16332,38.04744|-122.22527,38.06416|-122.35278,37.99083|-122.39341,37.95916|-122.29999,37.82638|-122.24276,37.76666|-122.17471,37.71471|-122.13848,37.66222|-122.12597,37.60277|-122.08084,37.51027|-122.00584,37.47137|-122.06430,37.45930|-122.35777,37.61583|-122.35694,37.68763|-122.35139,37.73165|-122.37964,37.81381|-122.44812,37.81005|-122.49055,37.75222|-122.49944,37.58999|-122.48061,37.51222|-122.42597,37.48429|-122.37805,37.37444|-122.37319,37.32916|-122.39368,37.25186|-122.37902,37.19999|-122.14723,36.99583|-122.07097,36.96235|-122.02029,36.95486|-121.97834,36.96916|-121.91360,36.98034|-121.85111,36.95069|-121.79916,36.88402|-121.76390,36.81249|-121.77472,36.75916|-121.80916,36.64846|-121.84500,36.61513|-121.89980,36.64124|-121.94326,36.59457|-121.92166,36.51806|-121.89765,36.46735|-121.87346,36.39389|-121.86763,36.31534|-121.75806,36.22944|-121.66542,36.18304|-121.46096,35.97944|-121.43499,35.89430|-121.36805,35.82916|-121.29639,35.76611|-121.26876,35.70013|-121.16665,35.64916|-121.04777,35.52499|-120.97708,35.46596|-120.92000,35.44887|-120.84111,35.35527|-120.86973,35.25722|-120.83139,35.20999|-120.73854,35.16465|-120.68056,35.17111|-120.60006,35.10006|-120.61375,35.01861|-120.59806,34.86083|-120.60333,34.66944|-120.62833,34.62360|-120.60583,34.55860|-120.55833,34.56194|-120.49535,34.53047|-120.42415,34.45610|-120.35500,34.46583|-120.13083,34.47874|-120.00374,34.46791|-119.79861,34.42638|-119.59973,34.42361|-119.54167,34.41416|-119.41611,34.35750|-119.31247,34.28352|-119.25584,34.22346|-119.21965,34.16492|-119.17430,34.13611|-119.12917,34.11388|-118.98111,34.06750|-118.83640,34.03055|-118.69777,34.04611|-118.55445,34.05569|-118.50890,34.03111|-118.47112,33.98777|-118.42111,33.92124|-118.39862,33.80804|-118.40002,33.74986|-118.29777,33.71610|-118.26713,33.75777|-118.22222,33.78416|-118.10818,33.75694|-118.04527,33.70944|-117.99500,33.66249|-117.95500,33.63276|-117.91083,33.60666|-117.86389,33.59568|-117.77444,33.53944|-117.63195,33.44276|-117.48083,33.32749|-117.40944,33.24416|-117.31974,33.10527|-117.26986,32.97707|-117.25000,32.88972|-117.28034,32.82922|-117.25876,32.77042|-117.24055,32.68464|-117.20215,32.72770|-117.14139,32.68062|-117.14723,32.61860|-117.18271,32.65929|-117.12237,32.53533|-115.90778,32.63195|-114.71909,32.71846|-114.65265,32.74180|-114.58445,32.72568|-114.53521,32.73201|-114.45875,32.86236|-114.46445,32.97165|-114.51535,33.02555|-114.60292,33.02971|-114.66263,33.04374|-114.69707,33.08944|-114.67528,33.15541|-114.66819,33.20902|-114.72610,33.31888|-114.72556,33.39916|-114.64049,33.42034|-114.52750,33.55930|-114.48389,33.72193|-114.52333,33.94416|-114.42076,34.03014|-114.40709,34.09207|-114.31416,34.14666|-114.22264,34.19625|-114.11701,34.28805|-114.15167,34.34276|-114.27265,34.41583|-114.33583,34.46416|-114.36951,34.52194|-114.41887,34.63166|-114.45613,34.69860|-114.49333,34.75833|-114.55638,34.81666|-114.61971,34.88194|-114.62194,34.99214|-115.12416,35.39804|-115.86221,35.98082|-116.49249,36.46749|-117.26777,37.05305|-117.74527,37.40666|-118.37526,37.86527|-119.01306,38.32054|-119.51556,38.67276|-120.00111,39.00722|-120.00084,41.99944|-124.18585,41.99946';
        var geomAry = new Array();
        geomAry = returnGeom.split('|');
        var XY = new Array();
        var points = [];
        for (var i = 0; i < geomAry.length; i++) {
            XY = geomAry[i].split(',');
            points.push( new GLatLng(parseFloat(XY[1]),parseFloat(XY[0]))) ;
        }
        //        GPolygon(<GLatLng array> latlngs, <String> color,
        //        <Number> weight, <Number> opacity, <String> fillColor,
        //        <Number> fillOpacity);
        var fillOpacity = 0.6;
        if (map.getCurrentMapType().getName() === "Chalk") { fillOpacity = 0.2; }
        var dynRegionPolygon = new GPolygon(points,'#f33f00', 0.3, 1,
                                            '#C7E9C0', 0.2, {clickable: false});
        map.addOverlay(dynRegionPolygon);
    } // function drawCalifornia


    // Slider Anon function
    (function() {
         var Event = YAHOO.util.Event,
         Dom   = YAHOO.util.Dom,
         lang  = YAHOO.lang,
         slider,
         bg="slider-bg",
         thumb="slider-thumb",
         valuearea="slider-value",
         textfield="slider-converted-value";

         // The slider can move 0 pixels up
         var topConstraint = 0;

         // The slider can move 200 pixels down
         var bottomConstraint = 200;

         // Custom scale factor for converting the pixel offset into a real value
         var scaleFactor = (Object.size(dates)/(bottomConstraint + 20));

         // The amount the slider moves when the value is changed with the arrow
         // keys
         var keyIncrement = 1;

         var tickSize = scaleFactor;

         Event.onDOMReady(
             function() {
                 slider = YAHOO.widget.Slider.
                     getHorizSlider(bg,
                                    thumb,
                                    topConstraint,
                                    bottomConstraint,
                                    keyIncrement);


                 // Sliders with ticks can be animated without YAHOO.util.Anim
                 slider.animate = true;

                 slider.getRealValue = function() {
                     return Math.round(this.getValue() * scaleFactor);
                 };

                 slider.subscribe("change",
                                  function(offsetFromStart) {
                                      var sfdate = Dom.get('d_date');
                                      var actualValue = slider.getRealValue();
                                      sfdate.innerHTML = dates[actualValue]["ymd"];

                                      // Change date and redraw map
                                      map.clearOverlays();
                                      drawOnMap(actualValue);

                                      // #DEBUG - code is after main block so that failures
                                      // won't affect anything
                                      var valnode = Dom.get('d_offset');
                                      var fld = Dom.get('d_val');

                                      // Display the pixel value of the control
                                      valnode.innerHTML = offsetFromStart;
                                      fld.innerHTML = actualValue;
                                  });

                 slider.subscribe("slideStart", function() {
                                      YAHOO.log("slideStart fired", "warn");
                                  });

                 slider.subscribe("slideEnd", function() {
                                      YAHOO.log("slideEnd fired", "warn");
                                  });

                 // Listen for keystrokes on the form field that displays
                 // the control's value.  While not provided by default,
                 // having a form field with the slider is a good way to
                 // help keep your application accessible.
                 Event.on(textfield, "keydown",
                          function(e) {
                              // set the value when the 'return' key is detected
                              if (Event.getCharCode(e) === 13) {
                                  var v = parseFloat(this.value, 10);
                                  v = (lang.isNumber(v)) ? v : 0;

                                  // convert the real value into a pixel offset
                                  slider.setValue(Math.round(v/scaleFactor));
                              }
                          });

                 // Use setValue to reset the value to white:
                 Event.on("putval", "click", function(e) {
                              slider.setValue(100, false); //false here means to
                              //animate if possible
                          });

             }); // Event.onDomReady function

     })(); // Slider Anon function

}
// display a warning if the browser was not compatible
else {
    alert("Sorry, the Google Maps API and hence, this web application are not compatible with this browser");
}

// Google Analytics Tracking
var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
// The if ensures that there is no failure in the case of an adblocker
if (typeof(_gat) == 'object') {
  var pageTracker = _gat._getTracker("UA-11926785-2");
  pageTracker._trackPageview();
}

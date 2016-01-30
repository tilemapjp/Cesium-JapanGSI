//**
(function(){
var
    defaultValue = Cesium.defaultValue,
    defined = Cesium.defined,
    defineProperties = Cesium.defineProperties,
    loadText = Cesium.loadText,
    throttleRequestByServer = Cesium.throttleRequestByServer,
    Event = Cesium.Event,
    Credit = Cesium.Credit,
    WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme,
    HeightmapTerrainData = Cesium.HeightmapTerrainData,
    TerrainProvider = Cesium.TerrainProvider,
    when = Cesium.when;
/**/
    "use strict";

    var trailingSlashRegex = /\/$/;
    var defaultCredit = new Credit('国土地理院');
    var GSI_MAX_TERRAIN_LEVEL = 15;

    var JapanGSITerrainProvider = function JapanGSITerrainProvider(options) {
        options = defaultValue(options, {});

        var url = defaultValue(options.url, '//cyberjapandata.gsi.go.jp/xyz/dem');

/*
        if (!trailingSlashRegex.test(url)) {
            url = url + '/';
        }
*/

        this._url = url;
        this._proxy = options.proxy;
        this._heightPower = defaultValue(options.heightPower , 1);

        this._tilingScheme = new WebMercatorTilingScheme({numberOfLevelZeroTilesX:2});

        this._heightmapWidth = 32;
        this._demDataWidth   = 256;

        this._terrainDataStructure = {
            heightScale:       1,
            heightOffset:      0,
            elementsPerHeight: 1,
            stride:            1,
            elementMultiplier: 256
        };

        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.ellipsoid, this._heightmapWidth, this._tilingScheme.getNumberOfXTilesAtLevel(0));

        this._errorEvent = new Event();

        var credit = defaultValue(options.credit, defaultCredit);
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
    };

    JapanGSITerrainProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        var orgx = x;
        var orgy = y;
        var shift = 0;
        if (level > GSI_MAX_TERRAIN_LEVEL) {
            shift = level - GSI_MAX_TERRAIN_LEVEL;
            level = GSI_MAX_TERRAIN_LEVEL;
        }

        x >>= shift+1;
        y >>= shift;
        var shiftx = (orgx % Math.pow(2, shift + 1)) / Math.pow(2, shift + 1);
        var shifty = (orgy % Math.pow(2, shift)) / Math.pow(2, shift);

        var url = this._url + (level == 15 ? '5a' : '') +
          '/' + level + '/' + x + '/' + y + '.txt';

        var proxy = this._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        var promise;

        throttleRequests = defaultValue(throttleRequests, true);
        if (throttleRequests) {
            promise = throttleRequestByServer(url, loadText);
            if (!defined(promise)) {
                return undefined;
            }
        } else {
            promise = loadText(url);
        }

        var self = this;
        return when(promise, function(data) {
            var heightCSV = [];
            var LF = String.fromCharCode(10);
            var lines = data.split(LF);
            for (var i=0; i<lines.length; i++){
                var heights = lines[i].split(",");
                for (var j=0; j<heights.length; j++){
                    if (heights[j] == "e") heights[j] = 0;
                }
                heightCSV[i] = heights;
            }

            var whm = self._heightmapWidth;
            var wim = self._demDataWidth;
            var hmp = new Int16Array(whm*whm);

            for(var y = 0; y < whm; ++y){
                for(var x = 0; x < whm; ++x){
                    var py = Math.round( ( y / Math.pow(2, shift) / ( whm - 1 ) + shifty ) * ( wim - 1 ) );
                    var px = Math.round( ( x / Math.pow(2, shift + 1) / ( whm - 1 ) + shiftx ) * ( wim - 1 ) );

                    hmp[y*whm + x] = Math.round(heightCSV[py][px] * self._heightPower);
                }
            }

            return new HeightmapTerrainData({
                buffer:        hmp,
                width:         self._heightmapWidth,
                height:        self._heightmapWidth,
                structure:     self._terrainDataStructure,
                childTileMask: GSI_MAX_TERRAIN_LEVEL
            });
        });
    };

    JapanGSITerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };
    JapanGSITerrainProvider.prototype.hasWaterMask = function() {
        return !true;
    };
    JapanGSITerrainProvider.prototype.getTileDataAvailable = function(x, y, level) {
        return true;
    };

    defineProperties(JapanGSITerrainProvider.prototype, {
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        credit : {
            get : function() {
                return this._credit;
            }
        },

        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        ready : {
            get : function() {
                return true;
            }
        }
    });

    Cesium.JapanGSITerrainProvider = JapanGSITerrainProvider;
})();

//**
(function(){
    var
        Credit = Cesium.Credit,
        defaultValue = Cesium.defaultValue,
        defined = Cesium.defined,
        defineProperties = Cesium.defineProperties,
        DeveloperError = Cesium.DeveloperError,
        Event = Cesium.Event,
        Rectangle = Cesium.Rectangle,
        WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme,
        ImageryProvider = Cesium.ImageryProvider;
    /**/

    "use strict";

    var trailingSlashRegex = /\/$/;
    var zoomStringRegex = /^([0-9]+)-?([0-9]+)?$/;
    var defaultCredit = new Credit('国土地理院');

    var defaultLayerIDs = {
        "std": {
            "id": "std",
            "name": "標準地図",
            "ext": "png",
            "zoom": "0-18"
        },
        "pale": {
            "id": "pale",
            "name": "淡色地図",
            "ext": "png",
            "zoom": "12-18"
        },
        "blank": {
            "id": "blank",
            "name": "白地図",
            "ext": "png",
            "zoom": "5-14"
        },
        "english": {
            "id": "english",
            "name": "Romanized",
            "ext": "png",
            "zoom": "5-11"
        },
        "relief": {
            "id": "relief",
            "name": "色別標高図",
            "ext": "png",
            "zoom": "5-15"
        },
        "ort": {
            "id": "ort",
            "name": "電子国土基本図（オルソ画像）",
            "ext": "jpg",
            "zoom": "15-17"
        },
        "gazo1": {
            "id": "gazo1",
            "name": "国土画像情報（第一期：1974～1978年撮影）",
            "ext": "jpg",
            "zoom": "15-17"
        },
        "gazo2": {
            "id": "gazo2",
            "name": "国土画像情報（第二期：1979～1983年撮影）",
            "ext": "jpg",
            "zoom": "15-17"
        },
        "gazo3": {
            "id": "gazo3",
            "name": "国土画像情報（第三期：1984～1986年撮影）",
            "ext": "jpg",
            "zoom": "15-17"
        },
        "gazo4": {
            "id": "gazo4",
            "name": "国土画像情報（第四期：1988～1990年撮影）",
            "ext": "jpg",
            "zoom": "15-17"
        },
        "airphoto": {
            "id": "airphoto",
            "name": "簡易空中写真（2004年～）",
            "ext": "png",
            "zoom": "15-18"
        }
    };

    function devideZoomString(zoomString) {
        if (zoomString.match(zoomStringRegex)) {
            var min = RegExp.$1;
            var max = RegExp.$2;
            return max ? [parseInt(min),parseInt(max)] : [parseInt(min),parseInt(min)];
        }
        return [];
    }

    function parseLayers(optionLayerList) {
        if (!optionLayerList) {
            optionLayerList = ["std"];
        }
        var layerList = [], max = 0, min = 18;

        for (var i = 0; i < optionLayerList.length; i++) {
            var optionLayer = optionLayerList[i];
            var isStr = typeof optionLayer === "string";
            if (isStr) {
                optionLayer = defaultLayerIDs[optionLayer];
            } else {
                var defaultLayer = defaultLayerIDs[optionLayer.id];
                if (defaultLayer) {
                    optionLayer.ext = defaultValue(optionLayer.ext, defaultLayer.ext);
                    optionLayer.zoom = defaultValue(optionLayer.zoom, defaultLayer.zoom);
                }
            }

            var minmax = devideZoomString(optionLayer.zoom);
            if (minmax.length == 0) continue;
            if (minmax[0] < min) min = minmax[0];
            if (minmax[1] > max) max = minmax[1];

            for (var j=minmax[0];j<=minmax[1];j++) {
                if (!layerList[j]) layerList[j] = optionLayer;
            }
        }

        for (var i=min;i<=max;i++) {
            if (!layerList[i]) throw "No layer definition for zoom level" + i;
        }
        if (max < min) throw "There are no valid layer definition";

        return [layerList, min, max];
    }

    var JapanGSIImageryProvider = function JapanGSIImageryProvider(options) {
        options = defaultValue(options, {});

        var url = defaultValue(options.url, '//a.tile.openstreetmap.org/');

        if (!trailingSlashRegex.test(url)) {
            url = url + '/';
        }

        this._url = url;
        this._fileExtension = defaultValue(options.fileExtension, 'png');
        this._proxy = options.proxy;
        this._tileDiscardPolicy = options.tileDiscardPolicy;

        this._tilingScheme = new WebMercatorTilingScheme();

        this._tileWidth = 256;
        this._tileHeight = 256;

        var parsedLayers = parseLayers(options.layerLists);
        this._layerLists = parsedLayers[0];

        this._minimumLevel = defaultValue(options.minimumLevel, parsedLayers[1]);
        this._maximumLevel = defaultValue(options.maximumLevel, parsedLayers[2]);

        this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);

        // Check the number of tiles at the minimum level.  If it's more than four,
        // throw an exception, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        var swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel);
        var neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel);
        var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        if (tileCount > 4) {
            throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
        }

        this._errorEvent = new Event();

        this._ready = true;

        var credit = defaultValue(options.credit, defaultCredit);
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url;
        if (imageryProvider._layerLists[level]) {
            var layer = imageryProvider._layerLists[level];
            url = "//cyberjapandata.gsi.go.jp/xyz/" + layer.id + "/" + level + "/" + x + "/" + y + "." + layer.ext;
        } else {
            url = imageryProvider._url + level + '/' + x + '/' + y + '.' + imageryProvider._fileExtension;
        }

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }

    defineProperties(JapanGSIImageryProvider.prototype, {
        url : {
            get : function() {
                return this._url;
            }
        },

        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        tileWidth : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }

                return this._tileWidth;
            }
        },

        tileHeight: {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }

                return this._tileHeight;
            }
        },

        maximumLevel : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('maximumLevel must not be called before the imagery provider is ready.');
                }

                return this._maximumLevel;
            }
        },

        minimumLevel : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }

                return this._minimumLevel;
            }
        },

        tilingScheme : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }

                return this._tilingScheme;
            }
        },

        rectangle : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('rectangle must not be called before the imagery provider is ready.');
                }

                return this._rectangle;
            }
        },

        tileDiscardPolicy : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tileDiscardPolicy must not be called before the imagery provider is ready.');
                }

                return this._tileDiscardPolicy;
            }
        },

        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        ready : {
            get : function() {
                return this._ready;
            }
        },

        credit : {
            get : function() {
                return this._credit;
            }
        },

        hasAlphaChannel : {
            get : function() {
                return true;
            }
        }
    });

    JapanGSIImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    JapanGSIImageryProvider.prototype.requestImage = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }

        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
    };

    JapanGSIImageryProvider.prototype.pickFeatures = function() {
        return undefined;
    };

    Cesium.JapanGSIImageryProvider = JapanGSIImageryProvider;
})();

Cesium-JapanGSI
===============

概要(Abstruct)
--------------

国土地理院の地図系APIをCesiumで利用可能にするライブラリ群です。  
Libraries which make Japan GSI's APIs can be used with Cesium. 

### JapanGSIImageryProvider

国土地理院の提供する地図画像タイル群から、好きなレイヤを組み合わせてCesiumの地図タイルレイヤを生成するライブラリです。  
Cesium's image tile provider from Japan GSI's map image tile service.

#### プロパティ / Property 

* layerLists

地理院地図の使いたいレイヤIDを、配列で与えます。  
全国レベルの画像セットがあるレイヤはプリセットされていますが、災害情報レイヤ等、一部しかないレイヤはプリセットされていません。  
そのようなレイヤを使いたい場合は、本項末尾に記載したような方法で使いたいレイヤを定義してください。  
列挙されたレイヤ中、提供されるズームレベルに重なりがある場合は、先に書いたレイヤが優先されます。  
Give a list of GSI tile layer names which you want to use.

    var layers = new Cesium.JapanGSIImageryProvider({
        layerLists: [{
            "id": "20130717dol",
            "zoom": "10-18",
            "ext": "jpg"
        },"relief","std"]
    });

### JapanGSITerrainProvider

国土地理院のDEMタイル仕様から、Cesiumの地形を生成するライブラリです。  
Cesium's terrain provider from Japan GSI's DEM tile service.

* heightPower

高度差の描画を強調したい場合、この値に1以上の値を与えると、その倍率だけ高さが強調された描画が為されます。  
ただしもちろん、建物地物や飛行機の飛行経路等、その他の高度を持つ情報を描画する際は、そちらも同じ倍率を掛けないと相対高さがおかしくなります。  
If you want to emphasize height of terrain, you can give powering value by this property.

    var terrain = new Cesium.JapanGSITerrainProvider({
        heightPower: 2.0
    });

### 使い方 / Usage

    var viewer = new Cesium.Viewer('cesiumContainer', {
        imageryProvider: new Cesium.JapanGSIImageryProvider({
            layerLists: ["ort","relief","std"]
        }),
        terrainProvider: new Cesium.JapanGSITerrainProvider({}),
        baseLayerPicker: false,
        mapProjection: new Cesium.WebMercatorProjection(Cesium.Ellipsoid.WGS84)
    });
    var scene = viewer.scene;
    scene.globe.depthTestAgainstTerrain = true;

### Tips

どちらのライブラリも、Cesium.ViewerのbaseLayerPickerプロパティをfalse、viewer.scene.globe.depthTestAgainstTerrainプロパティをtrueにして使う事が推奨されます。  
前者は、falseにしないと、Cesium標準の地図セット切り替えコントロールが出てきてしまい、設定した地図タイル、地形が反映されません。  
後者は、trueにしないと、地形の地面の下に描画した地物も、透けて見えてしまいます。  
You should use these libraries with Cesium.Viewer's baseLayerPicker property as false and viewer.scene.globe.depthTestAgainstTerrain property as true.

### 参照 / See other

* [Cesium:WebGL Virtual Globe and Map Engine](http://cesiumjs.org/index.html)
* [国土地理院地図タイル / Japan GSI tile API](http://portal.cyberjapan.jp/help/development/ichiran.html)
* [サンプル / Example](http://t.tilemap.jp.s3.amazonaws.com/cesium/index.html)





import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import useAtlasStore from '../store/useAtlasStore';

/**
 * 地図操作と地図データのインタラクションを管理するカスタムフック
 * @param {Object} containerRef - 地図を表示するDOM要素のref
 * @returns {Object} - 地図関連の状態と関数
 */
const useMapInteraction = (containerRef) => {
  const map = useRef(null);
  const popup = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const { 
    visitedPlaces, 
    markPlaceAsVisited, 
    initializeStore 
  } = useAtlasStore();

  // ポップアップからの訪問登録処理
  const handleVisitButtonClick = useCallback((placeInfo) => {
    markPlaceAsVisited(placeInfo);
    if (popup.current) {
      popup.current.remove();
    }
  }, [markPlaceAsVisited]);

  // 初期化
  useEffect(() => {
    initializeStore();
    
    // 現在地の取得
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation([longitude, latitude]);
        },
        (error) => {
          console.log('現在地を取得できませんでした:', error);
          // エラー時は東京都千代田区の座標をセット
          setUserLocation([139.7528, 35.6852]);
        }
      );
    } else {
      // Geolocation APIに対応していない場合は東京都千代田区を中心に
      setUserLocation([139.7528, 35.6852]);
    }
  }, [initializeStore]);
  
  // 地図初期化
  useEffect(() => {
    if (map.current || !containerRef.current) return;
    
    // 初期座標（ユーザーの位置情報がまだない場合は日本）
    const initialCenter = userLocation || [139, 35];
    
    map.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: initialCenter,
      zoom: 3,
      touchZoomRotate: true,
      dragPan: true,
      doubleClickZoom: true,
      touchPitch: true
    });
    
    // タッチ操作を有効化
    map.current.touchZoomRotate.enable();
    map.current.dragPan.enable();
    
    // ポップアップ作成
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true
    });
    
    // 地図読み込み完了
    map.current.on('load', () => {
      // 国境データの追加
      map.current.addSource('countries', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
      });
      
      // 国の塗りつぶし
      map.current.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': [
            'case',
            ['in', ['get', 'ISO_A2'], ['literal', visitedPlaces.map(p => p.countryCodeISO).filter(Boolean)]],
            '#ADD8E6',
            'rgba(0, 0, 0, 0)'
          ],
          'fill-opacity': 0.7
        }
      });
      
      // 国境線
      map.current.addLayer({
        id: 'countries-outline',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#627BC1',
          'line-width': 1
        }
      });
      
      // 地図クリックイベント
      map.current.on('click', 'countries-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        const properties = feature.properties;
        
        // 選択地域の情報
        const placeInfo = {
          uniqueId: properties.ISO_A2,
          placeName: properties.ADMIN,
          adminLevel: 'Country',
          countryCodeISO: properties.ISO_A2
        };
        
        setSelectedFeature(placeInfo);
        
        // 地域名をポップアップ表示 - カスタムHTMLを使用
        const popupHTML = `
          <div class="map-popup">
            <h3>${properties.ADMIN}</h3>
            <button class="mark-visited-btn" id="mark-visited-${properties.ISO_A2}">訪問済みにする</button>
          </div>
        `;
        
        popup.current
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
          .addTo(map.current);
        
        // ポップアップ上のボタンにイベント追加
        const markBtn = document.getElementById(`mark-visited-${properties.ISO_A2}`);
        if (markBtn) {
          // 既存のイベントリスナーを削除してからリスナーを追加（メモリリーク防止）
          const newMarkBtn = markBtn.cloneNode(true);
          markBtn.parentNode.replaceChild(newMarkBtn, markBtn);
          
          newMarkBtn.addEventListener('click', () => {
            handleVisitButtonClick(placeInfo);
          });
        }
      });
      
      // マウスオーバーで色変更
      map.current.on('mouseenter', 'countries-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'countries-fill', () => {
        map.current.getCanvas().style.cursor = '';
      });
      
      // 現在地に移動（データが読み込まれた後）
      if (userLocation) {
        map.current.flyTo({
          center: userLocation,
          zoom: 5,
          speed: 1.5,
          curve: 1.5
        });
        
        // 現在地のマーカー
        new maplibregl.Marker({
          color: '#e74c3c'
        })
          .setLngLat(userLocation)
          .addTo(map.current);
      }
    });
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    
  }, [containerRef, visitedPlaces, userLocation, handleVisitButtonClick]);
  
  // 訪問地域データの変更をマップスタイルに反映
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getLayer('countries-fill')) return;
    
    try {
      map.current.setPaintProperty('countries-fill', 'fill-color', [
        'case',
        ['in', ['get', 'ISO_A2'], ['literal', visitedPlaces.map(p => p.countryCodeISO).filter(Boolean)]],
        '#ADD8E6',
        'rgba(0, 0, 0, 0)'
      ]);
    } catch (error) {
      console.error('マップスタイル更新エラー:', error);
    }
    
  }, [visitedPlaces]);

  // 現在地に移動する関数
  const flyToUserLocation = useCallback(() => {
    if (!map.current || !userLocation) return;
    
    map.current.flyTo({
      center: userLocation,
      zoom: 5,
      speed: 1.5
    });
  }, [userLocation]);

  return {
    map,
    selectedFeature,
    userLocation,
    flyToUserLocation
  };
};

export default useMapInteraction;
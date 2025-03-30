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
  const [hoveredCountryId, setHoveredCountryId] = useState(null); // ホバー/タッチ中の国のID

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
  
  // ハイライト表示のハンドラー
  const handleCountryHighlight = useCallback((e) => {
    if (e.features && e.features.length > 0) {
      const countryId = e.features[0].properties.ISO_A2;
      
      // 以前と同じ国なら何もしない
      if (hoveredCountryId === countryId) return;
      
      // 以前ハイライトされた国があれば、そのハイライトを削除
      if (hoveredCountryId && map.current) {
        map.current.setFeatureState(
          { source: 'countries', id: hoveredCountryId },
          { hover: false }
        );
      }
      
      // 新しい国をハイライト
      if (map.current) {
        map.current.setFeatureState(
          { source: 'countries', id: countryId },
          { hover: true }
        );
      }
      
      setHoveredCountryId(countryId);
    }
  }, [hoveredCountryId]);
  
  // ハイライト解除のハンドラー
  const handleCountryUnhighlight = useCallback(() => {
    if (hoveredCountryId && map.current) {
      map.current.setFeatureState(
        { source: 'countries', id: hoveredCountryId },
        { hover: false }
      );
      setHoveredCountryId(null);
    }
  }, [hoveredCountryId]);
  
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
        data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
        promoteId: 'ISO_A2' // ISO_A2をプロモートIDとして使用（feature stateで使用）
      });
      
      // 国の塗りつぶし
      map.current.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#69b3dd', // ホバー時の色
            [
              'case',
              ['in', ['get', 'ISO_A2'], ['literal', visitedPlaces.map(p => p.countryCodeISO).filter(Boolean)]],
              '#ADD8E6', // 訪問済み
              'rgba(0, 0, 0, 0)' // デフォルト（透明）
            ]
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.8, // ホバー時の不透明度
            0.7  // 通常時の不透明度
          ]
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
      
      // マウスイベントハンドラー
      map.current.on('mouseenter', 'countries-fill', handleCountryHighlight);
      map.current.on('mouseleave', 'countries-fill', handleCountryUnhighlight);
      map.current.on('mousemove', 'countries-fill', handleCountryHighlight);
      
      // タッチイベントのハンドラー（モバイル用）
      map.current.on('touchstart', 'countries-fill', handleCountryHighlight);
      map.current.on('touchend', 'countries-fill', (e) => {
        // タッチが終了しても色をしばらく残す（500ms後に消す）
        setTimeout(() => {
          handleCountryUnhighlight();
        }, 500);
      });
      
      // カーソルスタイル変更
      map.current.on('mouseenter', 'countries-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'countries-fill', () => {
        map.current.getCanvas().style.cursor = '';
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
        // イベントリスナーをクリーンアップ
        if (map.current.getLayer('countries-fill')) {
          map.current.off('mouseenter', 'countries-fill', handleCountryHighlight);
          map.current.off('mouseleave', 'countries-fill', handleCountryUnhighlight);
          map.current.off('mousemove', 'countries-fill', handleCountryHighlight);
          map.current.off('touchstart', 'countries-fill', handleCountryHighlight);
          map.current.off('touchend', 'countries-fill');
        }
        map.current.remove();
        map.current = null;
      }
    };
    
  }, [containerRef, visitedPlaces, userLocation, handleVisitButtonClick, handleCountryHighlight, handleCountryUnhighlight]);
  
  // 訪問地域データの変更をマップスタイルに反映
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !map.current.getLayer('countries-fill')) return;
    
    try {
      map.current.setPaintProperty('countries-fill', 'fill-color', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#69b3dd', // ホバー時の色
        [
          'case',
          ['in', ['get', 'ISO_A2'], ['literal', visitedPlaces.map(p => p.countryCodeISO).filter(Boolean)]],
          '#ADD8E6', // 訪問済み
          'rgba(0, 0, 0, 0)' // デフォルト（透明）
        ]
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
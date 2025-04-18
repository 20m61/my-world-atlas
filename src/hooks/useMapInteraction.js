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
  const [isMapReady, setIsMapReady] = useState(false); // 地図のロード状態を追跡
  const [isTouchDevice, setIsTouchDevice] = useState(false); // タッチデバイス検出

  const {
    visitedPlaces,
    markPlaceAsVisited,
    initializeStore
  } = useAtlasStore();

  // ポップアップからの訪問登録処理
  const handleVisitButtonClick = useCallback((placeInfo) => {
    console.log('訪問登録ボタンがクリックされました', placeInfo);
    markPlaceAsVisited(placeInfo);
    if (popup.current) {
      popup.current.remove();
    }
  }, [markPlaceAsVisited]);

  // 初期化
  useEffect(() => {
    console.log('ストアを初期化します');
    initializeStore();

    // タッチデバイスの検出
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

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
    if (!map.current || !isMapReady) return;
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const countryId = feature.properties.ISO_A2;

    // 以前と同じ国なら何もしない
    if (hoveredCountryId === countryId) return;

    // 以前ハイライトされた国があれば、そのハイライトを削除
    if (hoveredCountryId) {
      try {
        map.current.setFeatureState(
          { source: 'countries', sourceLayer: '', id: hoveredCountryId },
          { hover: false }
        );
      } catch (err) {
        console.error('ハイライト除去エラー:', err);
      }
    }

    // 新しい国をハイライト
    try {
      map.current.setFeatureState(
        { source: 'countries', sourceLayer: '', id: countryId },
        { hover: true }
      );
      console.log(`国 ${countryId} をハイライトしました`);
    } catch (err) {
      console.error('ハイライト設定エラー:', err);
    }

    setHoveredCountryId(countryId);
  }, [hoveredCountryId, isMapReady]);

  // ハイライト解除のハンドラー
  const handleCountryUnhighlight = useCallback(() => {
    if (!map.current || !isMapReady || !hoveredCountryId) return;

    try {
      map.current.setFeatureState(
        { source: 'countries', sourceLayer: '', id: hoveredCountryId },
        { hover: false }
      );
      console.log(`国 ${hoveredCountryId} のハイライトを除去しました`);
    } catch (err) {
      console.error('ハイライト解除エラー:', err);
    }

    setHoveredCountryId(null);
  }, [hoveredCountryId, isMapReady]);

  // 地図クリック・タッチイベントハンドラー
  const handleCountryClick = useCallback((e) => {
    if (!map.current || !isMapReady || !e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties;
    console.log('国がクリックされました:', properties.ADMIN);

    // 選択地域の情報
    const placeInfo = {
      uniqueId: properties.ISO_A2,
      placeName: properties.ADMIN,
      adminLevel: 'Country',
      countryCodeISO: properties.ISO_A2
    };
    setSelectedFeature(placeInfo);

    // ポップアップ表示用HTML（アクセシビリティも考慮）
    const popupHTML = `
      <div class="map-popup">
        <h3>${properties.ADMIN}</h3>
        <button class="mark-visited-btn" id="mark-visited-${properties.ISO_A2}" aria-label="${properties.ADMIN}を訪問済みにする">
          訪問済みにする
        </button>
      </div>
    `;

    popup.current
      .setLngLat(e.lngLat)
      .setHTML(popupHTML)
      .addTo(map.current);

    // DOM更新後にイベント登録（requestAnimationFrameで遅延）
    requestAnimationFrame(() => {
      const popupEl = popup.current.getElement();
      const markBtn = popupEl.querySelector(`#mark-visited-${properties.ISO_A2}`);
      if (markBtn) {
        markBtn.addEventListener('click', () => {
          console.log('訪問済みボタンがクリックされました:', placeInfo);
          handleVisitButtonClick(placeInfo);
        });
      } else {
        console.error('訪問済みボタンが見つかりません');
      }
    });
  }, [handleVisitButtonClick, isMapReady]);

  // 地図初期化・イベント登録（依存値なしで1度のみ実行）
  useEffect(() => {
    if (map.current || !containerRef.current) return;

    console.log('地図を初期化します');

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
      touchPitch: true,
      // モバイル用に慣性スクロールを改善
      inertia: {
        duration: 500, // 慣性の継続時間を短縮
        speedFactor: 0.7 // スピードを少し下げる
      }
    });

    // タッチ操作を有効化・改善
    map.current.touchZoomRotate.enable();
    map.current.dragPan.enable({
      inertia: true, // パン時の慣性を有効化
      linearity: 0.3 // 操作の線形度（小さいほどよりなめらか）
    });

    // ポップアップ作成（モバイル対応）
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      anchor: 'bottom',
      offset: [0, -10] // モバイル用にオフセット調整
    });

    // 地図読み込み完了
    map.current.on('load', () => {
      console.log('地図が読み込まれました');

      // 国境データの取得と各フィーチャーにid（ISO_A2）を付与
      fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
        .then(response => response.json())
        .then(data => {
          // 各フィーチャーにidプロパティをISO_A2に設定
          data.features = data.features.map(feature => ({
            ...feature,
            id: feature.properties.ISO_A2
          }));
          // ソース追加（generateIdは不要）
          map.current.addSource('countries', {
            type: 'geojson',
            data: data
          });

          // 国フィルレイヤーの追加
          map.current.addLayer({
            id: 'countries-fill',
            type: 'fill',
            source: 'countries',
            paint: {
              'fill-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                'rgba(105,179,221, 0.6)', // ホバー時
                [
                  'case',
                  ['in', ['get', 'ISO_A2'], ['literal', visitedPlaces.map(p => p.countryCodeISO)]],
                  '#ADD8E6', // 訪問済み
                  'rgba(0, 0, 0, 0.01)' // ほぼ透明にしてイベント検出を可能にする
                ]
              ],
              'fill-opacity': 1  // 明示的に設定
            }
          });

          // イベントハンドラー登録（タッチ/マウス別々に登録）
          if (navigator.maxTouchPoints > 0) {
            map.current.on('touchstart', 'countries-fill', handleCountryHighlight);
            map.current.on('touchend', 'countries-fill', () => {
              setTimeout(handleCountryUnhighlight, 1000);
            });
          } else {
            map.current.on('mousemove', 'countries-fill', handleCountryHighlight);
            map.current.on('mouseleave', 'countries-fill', handleCountryUnhighlight);
          }
          map.current.on('click', 'countries-fill', handleCountryClick);

          // カーソル変更（マウスのみ）
          if (navigator.maxTouchPoints === 0) {
            map.current.on('mouseenter', 'countries-fill', () => {
              map.current.getCanvas().style.cursor = 'pointer';
            });
            map.current.on('mouseleave', 'countries-fill', () => {
              map.current.getCanvas().style.cursor = '';
            });
          }

          // 現在地に移動およびマーカー設置
          if (userLocation) {
            map.current.flyTo({
              center: userLocation,
              zoom: 5,
              speed: 1.5
            });
            new maplibregl.Marker({ color: '#e74c3c' })
              .setLngLat(userLocation)
              .addTo(map.current);
          }

          // 地図の準備完了をマーク
          setIsMapReady(true);
        })
        .catch(error => {
          console.error('国境データの読み込みエラー:', error);
        });
    });

    // クリーンアップ関数
    return () => {
      if (map.current) {
        // イベントリスナーをクリーンアップ
        if (map.current.getLayer('countries-fill')) {
          map.current.off('mousemove', 'countries-fill', handleCountryHighlight);
          map.current.off('mouseleave', 'countries-fill', handleCountryUnhighlight);
          map.current.off('click', 'countries-fill', handleCountryClick);
        }
        map.current.remove();
        map.current = null;
        setIsMapReady(false);
      }
    };

  }, [containerRef]);

  // 訪問地域データの変更をマップスタイルに反映
  useEffect(() => {
    if (!map.current || !isMapReady || !map.current.getLayer('countries-fill')) return;

    try {
      // 訪問済みの国リストを生成
      const visitedCountryCodes = visitedPlaces
        .filter(place => place.countryCodeISO)
        .map(place => place.countryCodeISO);

      console.log('訪問済み国リストを更新しました:', visitedCountryCodes);

      // 塗りつぶしの色設定を更新
      const defaultColorExpression = [
        'case',
        ['in', ['get', 'ISO_A2'], ['literal', visitedCountryCodes]],
        '#ADD8E6', // 訪問済み
        'rgba(0, 0, 0, 0)' // デフォルト（透明）
      ];

      map.current.setPaintProperty('countries-fill', 'fill-color', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        'rgba(105,179,221, 0.6)', // ホバー時のオーバーレイ色
        defaultColorExpression // それ以外の場合の既存スタイル
      ]);
    } catch (error) {
      console.error('ホバー用スタイル更新エラー:', error);
    }

  }, [visitedPlaces, isMapReady]);

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
    flyToUserLocation,
    isTouchDevice
  };
};

export default useMapInteraction;
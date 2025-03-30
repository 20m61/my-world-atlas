import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import useAtlasStore from '../store/useAtlasStore';
import Toast from '../components/Toast';
import './MapView.css';

function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  
  const { 
    visitedPlaces, 
    markPlaceAsVisited, 
    initializeStore, 
    toast,
    showToast,
    exportToCSV,
    importFromCSV
  } = useAtlasStore();
  
  const [importOpen, setImportOpen] = useState(false);
  
  // 初期化
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);
  
  // 地図初期化
  useEffect(() => {
    if (map.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
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
          },
          'countries': {
            type: 'vector',
            url: 'https://openmaptiles.geo.uzh.ch/tiles/v3/world_boundaries_political/{z}/{x}/{y}.pbf'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          },
          {
            id: 'countries-fill',
            type: 'fill',
            source: 'countries',
            'source-layer': 'country',
            paint: {
              'fill-color': [
                'case',
                ['in', ['get', 'iso_a2'], ['literal', visitedPlaces.map(p => p.countryCodeISO).filter(Boolean)]],
                '#ADD8E6',
                'rgba(0, 0, 0, 0)'
              ],
              'fill-opacity': 0.7
            }
          },
          {
            id: 'countries-outline',
            type: 'line',
            source: 'countries',
            'source-layer': 'country',
            paint: {
              'line-color': '#627BC1',
              'line-width': 1
            }
          },
          {
            id: 'countries-label',
            type: 'symbol',
            source: 'countries',
            'source-layer': 'country',
            layout: {
              'text-field': '{name}',
              'text-size': 12,
              'text-max-width': 10,
              'text-transform': 'uppercase'
            },
            paint: {
              'text-color': '#4A4A4A',
              'text-halo-color': '#FFFFFF',
              'text-halo-width': 1
            }
          }
        ]
      },
      center: [139, 35], // 日本中心で表示
      zoom: 3
    });
    
    // ポップアップ作成
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true
    });
    
    // 地図クリックイベント
    map.current.on('click', 'countries-fill', (e) => {
      if (e.features.length === 0) return;
      
      const feature = e.features[0];
      const properties = feature.properties;
      
      // 選択地域の情報
      const placeInfo = {
        uniqueId: properties.iso_a2,
        placeName: properties.name,
        adminLevel: 'Country',
        countryCodeISO: properties.iso_a2
      };
      
      setSelectedFeature(placeInfo);
      
      // 地域名をポップアップ表示
      popup.current
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="map-popup">
            <h3>${properties.name}</h3>
            <button class="mark-visited-btn">訪問済みにする</button>
          </div>
        `)
        .addTo(map.current);
      
      // 訪問ボタンクリックイベント
      const markBtn = document.querySelector('.mark-visited-btn');
      if (markBtn) {
        markBtn.addEventListener('click', () => {
          markPlaceAsVisited(placeInfo);
          popup.current.remove();
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
    
    // 地図読み込み完了
    map.current.on('load', () => {
      // StateデータレイヤーをここでロードしたりTileサーバーから取得できるようにする
    });
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    
  }, [visitedPlaces, markPlaceAsVisited]);
  
  // 訪問地域データの変更をマップスタイルに反映
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    try {
      map.current.setPaintProperty('countries-fill', 'fill-color', [
        'case',
        ['in', ['get', 'iso_a2'], ['literal', visitedPlaces.map(p => p.countryCodeISO).filter(Boolean)]],
        '#ADD8E6',
        'rgba(0, 0, 0, 0)'
      ]);
    } catch (error) {
      console.error('マップスタイル更新エラー:', error);
    }
    
  }, [visitedPlaces]);
  
  // インポートフォーム送信処理
  const handleImportSubmit = (e) => {
    e.preventDefault();
    const file = e.target.csvFile.files[0];
    if (!file) {
      showToast('ファイルを選択してください', 'warning');
      return;
    }
    
    importFromCSV(file);
    setImportOpen(false);
  };
  
  return (
    <div className="map-view">
      <div ref={mapContainer} className="map-container" />
      
      <div className="map-controls">
        <button 
          className="map-control-button"
          onClick={exportToCSV}
          title="CSVエクスポート"
        >
          <span className="material-icons">file_download</span>
        </button>
        
        <button 
          className="map-control-button"
          onClick={() => setImportOpen(true)}
          title="CSVインポート"
        >
          <span className="material-icons">file_upload</span>
        </button>
      </div>
      
      {/* インポートフォーム */}
      {importOpen && (
        <div className="import-overlay">
          <div className="import-container">
            <h3>CSVファイルをインポート</h3>
            <form onSubmit={handleImportSubmit}>
              <div className="form-group">
                <label htmlFor="csvFile">CSVファイルを選択</label>
                <input 
                  type="file" 
                  id="csvFile" 
                  name="csvFile"
                  accept=".csv" 
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setImportOpen(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  インポート
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* トースト通知 */}
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
      />
    </div>
  );
}

export default MapView;

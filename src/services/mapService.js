import { logError } from '../utils/errorHandling';

/**
 * 地図関連のサービスクラス
 * 地図データの取得や地理情報処理を担当
 */
class MapService {
  constructor() {
    // 国境データのGeoJSONのURL
    this.countriesGeoJsonUrl = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
    
    // 地理データのキャッシュ
    this.geoDataCache = {
      countries: null,
      lastFetched: null
    };
    
    // キャッシュの有効期限（24時間）
    this.cacheExpiration = 24 * 60 * 60 * 1000;
    
    // リトライ設定
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }
  
  /**
   * 国境データのGeoJSONを取得（リトライ機能付き）
   * @returns {Promise<Object>} - GeoJSONデータ
   */
  async getCountriesGeoJson() {
    // キャッシュが有効ならキャッシュから返す
    if (this.isCacheValid('countries')) {
      return this.geoDataCache.countries;
    }
    
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        // キャッシュが無効なら新しくデータを取得
        const response = await fetch(this.countriesGeoJsonUrl, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          signal: AbortSignal.timeout(10000) // 10秒でタイムアウト
        });
        
        if (!response.ok) {
          throw new Error(`地図データの取得に失敗しました: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // データの検証
        if (!data || !data.features || !Array.isArray(data.features)) {
          throw new Error('無効なGeoJSONデータです');
        }
        
        // キャッシュを更新
        this.geoDataCache.countries = data;
        this.geoDataCache.lastFetched = new Date();
        
        return data;
      } catch (error) {
        retries++;
        
        // 最後のリトライでエラーが発生した場合はエラーをスロー
        if (retries >= this.maxRetries) {
          logError(error, { 
            action: 'getCountriesGeoJson', 
            attempts: retries 
          });
          
          throw new Error(`国境データの取得に${retries}回失敗しました: ${error.message}`);
        }
        
        // 次のリトライの前に待機
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
      }
    }
  }
  
  /**
   * キャッシュが有効かどうかをチェック
   * @param {string} cacheKey - チェックするキャッシュのキー
   * @returns {boolean} - キャッシュが有効かどうか
   */
  isCacheValid(cacheKey) {
    // キャッシュが存在しない場合
    if (!this.geoDataCache[cacheKey] || !this.geoDataCache.lastFetched) {
      return false;
    }
    
    // 現在時刻
    const now = new Date();
    
    // 前回取得時刻からの経過時間
    const elapsed = now - this.geoDataCache.lastFetched;
    
    // 経過時間が有効期限以内ならキャッシュは有効
    return elapsed < this.cacheExpiration;
  }
  
  /**
   * キャッシュを明示的にクリア
   * @param {string} cacheKey - クリアするキャッシュのキー（指定がなければ全て）
   */
  clearCache(cacheKey = null) {
    if (cacheKey && this.geoDataCache[cacheKey]) {
      this.geoDataCache[cacheKey] = null;
    } else {
      // 全てのキャッシュをクリア
      Object.keys(this.geoDataCache).forEach(key => {
        if (key !== 'lastFetched') {
          this.geoDataCache[key] = null;
        }
      });
    }
    
    this.geoDataCache.lastFetched = null;
  }
  
  /**
   * 現在地を取得（エラーハンドリング改善）
   * @returns {Promise<Object>} - 位置情報（緯度・経度）
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('お使いのブラウザは位置情報をサポートしていません'));
        return;
      }
      
      // タイムアウト処理
      const timeoutId = setTimeout(() => {
        reject(new Error('位置情報の取得がタイムアウトしました'));
      }, 15000); // 15秒
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const { longitude, latitude, accuracy } = position.coords;
          
          // 精度が低すぎる場合は警告
          if (accuracy > 10000) { // 10km以上の精度誤差
            console.warn('位置情報の精度が低い可能性があります', { accuracy });
          }
          
          resolve({ longitude, latitude, accuracy });
        },
        (error) => {
          clearTimeout(timeoutId);
          logError(error, { action: 'getCurrentLocation' });
          
          // エラーコードに基づいたメッセージ
          let errorMessage = '現在地を取得できませんでした';
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = '位置情報へのアクセスが拒否されました';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = '現在地を特定できませんでした';
              break;
            case 3: // TIMEOUT
              errorMessage = '現在地の取得がタイムアウトしました';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,  // 高精度を有効
          timeout: 10000,            // 10秒でタイムアウト
          maximumAge: 60000          // 1分間キャッシュ有効
        }
      );
    });
  }
  
  /**
   * 国のISOコードから国データを取得
   * @param {string} isoCode - ISO 3166-1の国コード
   * @returns {Promise<Object>} - 国データ（GeoJSONのFeature）
   */
  async getCountryByIsoCode(isoCode) {
    if (!isoCode || typeof isoCode !== 'string') {
      throw new Error('無効な国コードです');
    }
    
    try {
      const geoJson = await this.getCountriesGeoJson();
      
      if (!geoJson || !geoJson.features) {
        throw new Error('地図データが不正です');
      }
      
      const country = geoJson.features.find(feature => 
        feature.properties && feature.properties.ISO_A2 === isoCode
      );
      
      if (!country) {
        throw new Error(`国コード "${isoCode}" に該当する国が見つかりませんでした`);
      }
      
      return country;
    } catch (error) {
      logError(error, { action: 'getCountryByIsoCode', isoCode });
      throw error;
    }
  }
  
  /**
   * 国名から国データを検索
   * @param {string} name - 検索する国名（部分一致）
   * @returns {Promise<Array>} - 該当する国データの配列
   */
  async searchCountriesByName(name) {
    try {
      if (!name || name.trim() === '') {
        return [];
      }
      
      const geoJson = await this.getCountriesGeoJson();
      
      if (!geoJson || !geoJson.features) {
        throw new Error('地図データが不正です');
      }
      
      const searchTerm = name.toLowerCase();
      
      // 名前に検索文字列を含む国を検索
      return geoJson.features.filter(feature => 
        feature.properties && 
        feature.properties.ADMIN && 
        feature.properties.ADMIN.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      logError(error, { action: 'searchCountriesByName', name });
      throw error;
    }
  }
  
  /**
   * 訪問済みの国のスタイルを生成
   * @param {Array} visitedCountryCodes - 訪問済み国のISOコード配列
   * @param {string} visitedColor - 訪問済み国の色
   * @returns {Object} - 塗りつぶし色のスタイル設定
   */
  generateVisitedCountriesStyle(visitedCountryCodes, visitedColor = '#ADD8E6') {
    if (!Array.isArray(visitedCountryCodes)) {
      console.warn('訪問済み国コードが配列ではありません', visitedCountryCodes);
      return [
        'case',
        ['in', ['get', 'ISO_A2'], ['literal', []]],
        visitedColor,
        'rgba(0, 0, 0, 0)'
      ];
    }
    
    return [
      'case',
      ['in', ['get', 'ISO_A2'], ['literal', visitedCountryCodes]],
      visitedColor,
      'rgba(0, 0, 0, 0)'
    ];
  }
}

// シングルトンインスタンスをエクスポート
const mapService = new MapService();
export default mapService;
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
  }
  
  /**
   * 国境データのGeoJSONを取得
   * @returns {Promise<Object>} - GeoJSONデータ
   */
  async getCountriesGeoJson() {
    try {
      // キャッシュが有効ならキャッシュから返す
      if (this.isCacheValid('countries')) {
        return this.geoDataCache.countries;
      }
      
      // キャッシュが無効なら新しくデータを取得
      const response = await fetch(this.countriesGeoJsonUrl);
      
      if (!response.ok) {
        throw new Error(`地図データの取得に失敗しました: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // キャッシュを更新
      this.geoDataCache.countries = data;
      this.geoDataCache.lastFetched = new Date();
      
      return data;
    } catch (error) {
      logError(error, { action: 'getCountriesGeoJson' });
      throw new Error(`国境データの取得に失敗しました: ${error.message}`);
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
   * 現在地を取得
   * @returns {Promise<Object>} - 位置情報（緯度・経度）
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('お使いのブラウザは位置情報をサポートしていません'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          resolve({ longitude, latitude });
        },
        (error) => {
          logError(error, { action: 'getCurrentLocation' });
          
          // エラーコードに基づいたメッセージ
          let errorMessage = '現在地を取得できませんでした';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '位置情報へのアクセスが拒否されました';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '現在地を特定できませんでした';
              break;
            case error.TIMEOUT:
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
   * 座標から国を判定
   * @param {Array} coordinates - 緯度経度の配列 [longitude, latitude]
   * @returns {Promise<Object>} - 該当する国データ、または null
   */
  async getCountryFromCoordinates(coordinates) {
    try {
      const [longitude, latitude] = coordinates;
      
      // 座標の検証
      if (
        !Array.isArray(coordinates) || 
        coordinates.length !== 2 ||
        typeof longitude !== 'number' || 
        typeof latitude !== 'number' ||
        longitude < -180 || longitude > 180 ||
        latitude < -90 || latitude > 90
      ) {
        throw new Error('無効な座標です');
      }
      
      const geoJson = await this.getCountriesGeoJson();
      
      if (!geoJson || !geoJson.features) {
        throw new Error('地図データが不正です');
      }
      
      // 座標が含まれる国を検索
      // 注: これは簡易的な実装です。実際の地図アプリケーションでは、
      // point-in-polygon アルゴリズムのライブラリを使用することを推奨します。
      
      // この例では、単純化のために直接計算は行いません。
      // 本来は、turf.jsなどのライブラリを使用して、ポイントがポリゴン内に
      // 含まれるかどうかを正確に判定する必要があります。
      
      return null;
    } catch (error) {
      logError(error, { action: 'getCountryFromCoordinates', coordinates });
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

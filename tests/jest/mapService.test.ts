import MapService from '../../../src/services/mapService';

describe('MapService', () => {
  let mapService: MapService;

  beforeEach(() => {
    mapService = new MapService();
    // ダミーキャッシュを準備
    mapService['geoDataCache'] = {
      key1: { some: 'data' },
      key2: { other: 'info' },
      lastFetched: new Date(),
    };
    // キャッシュ有効期限（ミリ秒）を設定
    mapService['cacheExpiration'] = 1000 * 60; // 1分
  });

  test('キャッシュキーを指定した場合、そのキーのみクリアする', () => {
    mapService.clearCache('key1');
    expect(mapService['geoDataCache']['key1']).toBeNull();
    // 他のキーはそのまま（ただし、全体クリアの場合は lastFetched は nullになるので注意）
    expect(mapService['geoDataCache']['key2']).toBeDefined();
    expect(mapService['geoDataCache'].lastFetched).toBeNull();
  });

  test('キャッシュキーを指定しない場合は全てクリアする', () => {
    mapService.clearCache();
    Object.keys(mapService['geoDataCache']).forEach((key) => {
      expect(mapService['geoDataCache'][key]).toBeNull();
    });
  });
});

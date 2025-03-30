import { openDB } from 'idb';
import { logError } from '../utils/errorHandling';

/**
 * データベース操作のサービスクラス
 * IndexedDBへのアクセスを集約して管理
 */
class DBService {
  /**
   * コンストラクタ
   * @param {string} dbName - データベース名
   * @param {number} version - データベースバージョン
   */
  constructor(dbName = 'myWorldAtlasDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.dbPromise = this.initDB();
  }

  /**
   * データベースの初期化
   * @returns {Promise} - IndexedDBのデータベースインスタンス
   */
  async initDB() {
    try {
      return await openDB(this.dbName, this.version, {
        upgrade: (db) => {
          // 訪問済み地域のストア作成
          if (!db.objectStoreNames.contains('visitedPlaces')) {
            const visitedStore = db.createObjectStore('visitedPlaces', {
              keyPath: 'uniqueId'
            });
            
            // インデックス作成
            visitedStore.createIndex('adminLevel', 'adminLevel');
            visitedStore.createIndex('dateMarked', 'dateMarked');
          }
        }
      });
    } catch (error) {
      logError(error, { action: 'initDB' });
      throw new Error(`データベースの初期化に失敗しました: ${error.message}`);
    }
  }

  /**
   * すべての訪問地域データを取得
   * @returns {Promise<Array>} - 訪問地域データの配列
   */
  async getAllVisitedPlaces() {
    try {
      const db = await this.dbPromise;
      return await db.getAll('visitedPlaces');
    } catch (error) {
      logError(error, { action: 'getAllVisitedPlaces' });
      throw new Error(`訪問データの取得に失敗しました: ${error.message}`);
    }
  }

  /**
   * 特定のIDの訪問地域を取得
   * @param {string} uniqueId - 訪問地域のユニークID
   * @returns {Promise<Object>} - 訪問地域データ
   */
  async getVisitedPlace(uniqueId) {
    try {
      const db = await this.dbPromise;
      return await db.get('visitedPlaces', uniqueId);
    } catch (error) {
      logError(error, { action: 'getVisitedPlace', uniqueId });
      throw new Error(`訪問データの取得に失敗しました: ${error.message}`);
    }
  }

  /**
   * 訪問地域データを保存
   * @param {Object} placeData - 保存する訪問地域データ
   * @returns {Promise<string>} - 保存されたデータのユニークID
   */
  async saveVisitedPlace(placeData) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('visitedPlaces', 'readwrite');
      await tx.store.put(placeData);
      await tx.done;
      return placeData.uniqueId;
    } catch (error) {
      logError(error, { action: 'saveVisitedPlace', placeData });
      throw new Error(`訪問データの保存に失敗しました: ${error.message}`);
    }
  }

  /**
   * 訪問地域データを削除
   * @param {string} uniqueId - 削除する訪問地域のユニークID
   * @returns {Promise<void>}
   */
  async deleteVisitedPlace(uniqueId) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('visitedPlaces', 'readwrite');
      await tx.store.delete(uniqueId);
      await tx.done;
    } catch (error) {
      logError(error, { action: 'deleteVisitedPlace', uniqueId });
      throw new Error(`訪問データの削除に失敗しました: ${error.message}`);
    }
  }

  /**
   * 複数の訪問地域データを一括保存
   * @param {Array<Object>} placesData - 保存する訪問地域データの配列
   * @returns {Promise<Object>} - 成功件数とスキップ件数を含むオブジェクト
   */
  async bulkSaveVisitedPlaces(placesData) {
    let success = 0;
    let skipped = 0;
    
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('visitedPlaces', 'readwrite');
      
      for (const placeData of placesData) {
        try {
          await tx.store.put(placeData);
          success++;
        } catch (e) {
          skipped++;
          logError(e, { action: 'bulkSaveVisitedPlaces', placeData });
        }
      }
      
      await tx.done;
      return { success, skipped };
    } catch (error) {
      logError(error, { action: 'bulkSaveVisitedPlaces' });
      throw new Error(`データの一括保存に失敗しました: ${error.message}`);
    }
  }

  /**
   * 行政レベルによる訪問地域の検索
   * @param {string} adminLevel - 検索する行政レベル
   * @returns {Promise<Array>} - 該当する訪問地域データの配列
   */
  async findByAdminLevel(adminLevel) {
    try {
      const db = await this.dbPromise;
      const index = db.transaction('visitedPlaces').store.index('adminLevel');
      return await index.getAll(adminLevel);
    } catch (error) {
      logError(error, { action: 'findByAdminLevel', adminLevel });
      throw new Error(`行政レベルによる検索に失敗しました: ${error.message}`);
    }
  }

  /**
   * 日付範囲による訪問地域の検索
   * @param {string} startDate - 開始日（ISO形式）
   * @param {string} endDate - 終了日（ISO形式）
   * @returns {Promise<Array>} - 該当する訪問地域データの配列
   */
  async findByDateRange(startDate, endDate) {
    try {
      const db = await this.dbPromise;
      const index = db.transaction('visitedPlaces').store.index('dateMarked');
      const range = IDBKeyRange.bound(startDate, endDate);
      return await index.getAll(range);
    } catch (error) {
      logError(error, { action: 'findByDateRange', startDate, endDate });
      throw new Error(`日付範囲による検索に失敗しました: ${error.message}`);
    }
  }
}

// シングルトンインスタンスをエクスポート
const dbService = new DBService();
export default dbService;

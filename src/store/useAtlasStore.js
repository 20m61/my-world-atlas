import { create } from 'zustand';
import { openDB } from 'idb';
import Papa from 'papaparse';
import { formatErrorMessage, logError, withErrorHandling } from '../utils/errorHandling';

// IndexedDBのセットアップ
const dbPromise = openDB('myWorldAtlasDB', 1, {
  upgrade(db) {
    // 訪問済み地域のストア作成
    const visitedStore = db.createObjectStore('visitedPlaces', {
      keyPath: 'uniqueId'
    });
    
    // インデックス作成
    visitedStore.createIndex('adminLevel', 'adminLevel');
    visitedStore.createIndex('dateMarked', 'dateMarked');
  }
});

// Zustandストア
const useAtlasStore = create((set, get) => ({
  // 状態
  visitedPlaces: [],
  selectedPlace: null,
  isLoading: false,
  error: null,
  toast: { show: false, message: '', type: 'info' },

  // アクション：初期化
  initializeStore: withErrorHandling(async () => {
    set({ isLoading: true });
    
    try {
      const db = await dbPromise;
      const visitedPlaces = await db.getAll('visitedPlaces');
      set({ visitedPlaces, isLoading: false });
    } catch (error) {
      logError(error, { action: 'initializeStore' });
      const errorMessage = formatErrorMessage(error, 'データの読み込みに失敗しました');
      
      set({ 
        error: errorMessage, 
        isLoading: false,
        toast: {
          show: true,
          message: errorMessage,
          type: 'error'
        }
      });
    }
  }, (error) => {
    set({ 
      isLoading: false,
      error: formatErrorMessage(error, 'データ初期化中にエラーが発生しました')
    });
  }),

  // アクション：地域の訪問をマーク
  markPlaceAsVisited: withErrorHandling(async (placeData) => {
    const { uniqueId, placeName, adminLevel, countryCodeISO, regionCodeISO } = placeData;
    
    if (!uniqueId || !placeName || !adminLevel) {
      const errorMsg = '必須情報が不足しています';
      set({ 
        error: errorMsg,
        toast: { show: true, message: errorMsg, type: 'error' }
      });
      return;
    }
    
    set({ isLoading: true });
    
    try {
      const db = await dbPromise;
      const tx = db.transaction('visitedPlaces', 'readwrite');
      
      // 新規データ作成
      const newPlace = {
        uniqueId,
        placeName,
        adminLevel,
        dateMarked: new Date().toISOString(),
        countryCodeISO: countryCodeISO || uniqueId.split('-')[0],
        regionCodeISO: regionCodeISO || uniqueId
      };
      
      // データ保存
      await tx.store.put(newPlace);
      await tx.done;
      
      // 状態更新
      const visitedPlaces = [...get().visitedPlaces, newPlace];
      set({ 
        visitedPlaces, 
        isLoading: false,
        selectedPlace: newPlace,
        toast: {
          show: true,
          message: `${placeName}を訪問済みに登録しました`,
          type: 'success'
        }
      });
      
      // 3秒後にトーストを自動で閉じる
      setTimeout(() => {
        set(state => ({
          toast: { ...state.toast, show: false }
        }));
      }, 3000);
      
    } catch (error) {
      logError(error, { action: 'markPlaceAsVisited', placeData });
      const errorMessage = formatErrorMessage(error, '訪問地域の保存に失敗しました');
      
      set({ 
        error: errorMessage, 
        isLoading: false,
        toast: {
          show: true,
          message: errorMessage,
          type: 'error'
        }
      });
    }
  }, (error) => {
    set({ 
      isLoading: false,
      error: formatErrorMessage(error, '訪問記録中にエラーが発生しました'),
      toast: {
        show: true,
        message: formatErrorMessage(error, '訪問記録中にエラーが発生しました'),
        type: 'error'
      }
    });
  }),
  
  // アクション：訪問の削除
  removePlaceVisit: withErrorHandling(async (uniqueId) => {
    set({ isLoading: true });
    
    try {
      const db = await dbPromise;
      const tx = db.transaction('visitedPlaces', 'readwrite');
      
      // データ削除
      await tx.store.delete(uniqueId);
      await tx.done;
      
      // 状態更新
      const visitedPlaces = get().visitedPlaces.filter(place => place.uniqueId !== uniqueId);
      set({ 
        visitedPlaces, 
        isLoading: false,
        toast: {
          show: true,
          message: '訪問記録を削除しました',
          type: 'info'
        }
      });
      
      // 3秒後にトーストを自動で閉じる
      setTimeout(() => {
        set(state => ({
          toast: { ...state.toast, show: false }
        }));
      }, 3000);
      
    } catch (error) {
      logError(error, { action: 'removePlaceVisit', uniqueId });
      const errorMessage = formatErrorMessage(error, '訪問記録の削除に失敗しました');
      
      set({ 
        error: errorMessage, 
        isLoading: false,
        toast: {
          show: true,
          message: errorMessage,
          type: 'error'
        }
      });
    }
  }, (error) => {
    set({ 
      isLoading: false,
      error: formatErrorMessage(error, '削除中にエラーが発生しました'),
      toast: {
        show: true,
        message: formatErrorMessage(error, '削除中にエラーが発生しました'),
        type: 'error'
      }
    });
  }),
  
  // アクション：選択地域の設定
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  
  // アクション：エラーのクリア
  clearError: () => set({ error: null }),
  
  // アクション：トーストの表示
  showToast: (message, type = 'info') => {
    set({ toast: { show: true, message, type } });
    
    // 3秒後に自動で閉じる
    setTimeout(() => {
      set(state => ({
        toast: { ...state.toast, show: false }
      }));
    }, 3000);
  },
  
  // アクション：CSVエクスポート
  exportToCSV: withErrorHandling(() => {
    const visitedPlaces = get().visitedPlaces;
    
    if (visitedPlaces.length === 0) {
      get().showToast('エクスポートするデータがありません', 'warning');
      return;
    }
    
    try {
      // CSVデータの作成
      const csvData = Papa.unparse({
        fields: ['uniqueId', 'placeName', 'adminLevel', 'dateMarked', 'countryCodeISO', 'regionCodeISO'],
        data: visitedPlaces
      });
      
      // ファイル名の生成（YYYYMMDD形式）
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `MyWorldAtlas_Export_${dateStr}.csv`;
      
      // ダウンロード用のリンク作成
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      // リンクをクリックしてダウンロード開始
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      get().showToast('CSVファイルをエクスポートしました', 'success');
    } catch (error) {
      logError(error, { action: 'exportToCSV' });
      const errorMessage = formatErrorMessage(error, 'エクスポートに失敗しました');
      
      get().showToast(errorMessage, 'error');
      throw error; // エラーを再スロー
    }
  }, (error) => {
    get().showToast(formatErrorMessage(error, 'エクスポート中にエラーが発生しました'), 'error');
  }),
  
  // アクション：CSVインポート
  importFromCSV: withErrorHandling(async (file) => {
    if (!file) {
      get().showToast('ファイルを選択してください', 'warning');
      return;
    }
    
    set({ isLoading: true });
    
    try {
      // ファイル読み込み
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => {
          reject(new Error('ファイルの読み込みに失敗しました'));
        };
        reader.readAsText(file);
      });
      
      // CSVパース
      const { data, errors, meta } = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });
      
      if (errors.length > 0) {
        throw new Error('CSVの解析中にエラーが発生しました: ' + 
          errors.map(err => `行 ${err.row}: ${err.message}`).join(', '));
      }
      
      // データの検証
      const validData = data.filter(row => 
        row.uniqueId && row.placeName && row.adminLevel
      );
      
      if (validData.length === 0) {
        throw new Error('有効なデータが見つかりませんでした');
      }
      
      // データベースに保存
      const db = await dbPromise;
      const tx = db.transaction('visitedPlaces', 'readwrite');
      
      let success = 0;
      let skipped = 0;
      
      for (const row of validData) {
        try {
          await tx.store.put(row);
          success++;
        } catch (e) {
          skipped++;
          logError(e, { action: 'importFromCSV', row });
        }
      }
      
      await tx.done;
      
      // 状態の更新
      const visitedPlaces = await db.getAll('visitedPlaces');
      set({ 
        visitedPlaces, 
        isLoading: false,
        toast: {
          show: true,
          message: `インポート完了: ${success}件成功、${skipped}件スキップ`,
          type: 'success'
        }
      });
      
    } catch (error) {
      logError(error, { action: 'importFromCSV' });
      const errorMessage = formatErrorMessage(error, 'インポートに失敗しました');
      
      set({ 
        error: errorMessage, 
        isLoading: false,
        toast: {
          show: true,
          message: errorMessage,
          type: 'error'
        }
      });
    }
  }, (error) => {
    set({ 
      isLoading: false,
      error: formatErrorMessage(error, 'インポート中にエラーが発生しました'),
      toast: {
        show: true,
        message: formatErrorMessage(error, 'インポート中にエラーが発生しました'),
        type: 'error'
      }
    });
  })
}));

export default useAtlasStore;

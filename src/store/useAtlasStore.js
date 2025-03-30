import { create } from 'zustand';
import { openDB } from 'idb';
import Papa from 'papaparse';

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
  initializeStore: async () => {
    set({ isLoading: true });
    try {
      const db = await dbPromise;
      const visitedPlaces = await db.getAll('visitedPlaces');
      set({ visitedPlaces, isLoading: false });
    } catch (error) {
      console.error('データ初期化エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // アクション：地域の訪問をマーク
  markPlaceAsVisited: async (placeData) => {
    const { uniqueId, placeName, adminLevel, countryCodeISO, regionCodeISO } = placeData;
    
    if (!uniqueId || !placeName || !adminLevel) {
      set({ error: '必須情報が不足しています' });
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
      console.error('データ保存エラー:', error);
      set({ 
        error: error.message, 
        isLoading: false,
        toast: {
          show: true,
          message: `エラーが発生しました: ${error.message}`,
          type: 'error'
        }
      });
    }
  },
  
  // アクション：訪問の削除
  removePlaceVisit: async (uniqueId) => {
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
      console.error('データ削除エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  
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
  exportToCSV: () => {
    const visitedPlaces = get().visitedPlaces;
    
    if (visitedPlaces.length === 0) {
      get().showToast('エクスポートするデータがありません', 'warning');
      return;
    }
    
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
  },
  
  // アクション：CSVインポート
  importFromCSV: async (file) => {
    set({ isLoading: true });
    
    try {
      // ファイル読み込み
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      // CSVパース
      const { data, errors, meta } = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });
      
      if (errors.length > 0) {
        throw new Error('CSVの解析中にエラーが発生しました');
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
      console.error('インポートエラー:', error);
      set({ 
        error: error.message, 
        isLoading: false,
        toast: {
          show: true,
          message: `インポートエラー: ${error.message}`,
          type: 'error'
        }
      });
    }
  }
}));

export default useAtlasStore;

import { create } from 'zustand';
import { formatErrorMessage, logError, withErrorHandling } from '../utils/errorHandling';
import dbService from '../services/dbService';
import fileService from '../services/fileService';
import mapService from '../services/mapService';

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
      const visitedPlaces = await dbService.getAllVisitedPlaces();
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
      await dbService.saveVisitedPlace(newPlace);
      
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
      // データ削除
      await dbService.deleteVisitedPlace(uniqueId);
      
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
      fileService.exportToCSV(visitedPlaces);
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
      // CSVファイルのパース
      const { data } = await fileService.parseCSV(file);
      
      // データベースへの一括保存
      const { success, skipped } = await dbService.bulkSaveVisitedPlaces(data);
      
      // 更新された全データを取得
      const visitedPlaces = await dbService.getAllVisitedPlaces();
      
      // 状態更新
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
  }),
  
  // アクション：現在地を取得
  getCurrentLocation: withErrorHandling(async () => {
    try {
      return await mapService.getCurrentLocation();
    } catch (error) {
      // デフォルトの位置情報（東京都千代田区）
      return { longitude: 139.7528, latitude: 35.6852 };
    }
  }, (error) => {
    // エラーログは記録するが、ユーザーには通知しない
    logError(error, { action: 'getCurrentLocation' });
    // デフォルトの位置情報を返す
    return { longitude: 139.7528, latitude: 35.6852 };
  }),
  
  // アクション：国境データの取得
  getCountriesData: withErrorHandling(async () => {
    try {
      return await mapService.getCountriesGeoJson();
    } catch (error) {
      logError(error, { action: 'getCountriesData' });
      const errorMessage = formatErrorMessage(error, '地図データの取得に失敗しました');
      
      get().showToast(errorMessage, 'error');
      throw error;
    }
  }, (error) => {
    get().showToast(formatErrorMessage(error, '地図データの取得に失敗しました'), 'error');
    return null;
  }),
  
  // アクション：訪問国のスタイル生成
  getVisitedCountriesStyle: () => {
    const visitedPlaces = get().visitedPlaces;
    const visitedCountryCodes = visitedPlaces
      .filter(place => place.countryCodeISO)
      .map(place => place.countryCodeISO);
    
    return mapService.generateVisitedCountriesStyle(visitedCountryCodes);
  }
}));

export default useAtlasStore;

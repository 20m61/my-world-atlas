import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAtlasStore from '../store/useAtlasStore';
import Toast from '../components/Toast';
import FilterControls from '../components/list/FilterControls';
import ActionButtons from '../components/list/ActionButtons';
import ImportForm from '../components/map/ImportForm';
import ListItem from '../components/list/ListItem';
import ConfirmDialog from '../components/list/ConfirmDialog';
import { withErrorHandling } from '../utils/errorHandling';
import './ListView.css';

/**
 * 訪問記録の一覧表示画面
 */
function ListView() {
  const navigate = useNavigate();
  const { 
    visitedPlaces, 
    initializeStore, 
    toast, 
    removePlaceVisit,
    exportToCSV,
    importFromCSV,
    showToast
  } = useAtlasStore();
  
  const [sortBy, setSortBy] = useState('dateMarked');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    uniqueId: null,
    placeName: ''
  });
  
  // 初期化
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);
  
  // メモ化されたソート・フィルタリング関数
  const displayData = useMemo(() => {
    let filteredData = [...visitedPlaces];
    
    // 管理レベルでフィルタリング
    if (adminFilter !== 'all') {
      filteredData = filteredData.filter(place => place.adminLevel === adminFilter);
    }
    
    // 検索テキストでフィルタリング
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filteredData = filteredData.filter(place => 
        place.placeName.toLowerCase().includes(lowerFilter) ||
        place.uniqueId.toLowerCase().includes(lowerFilter)
      );
    }
    
    // ソート
    return filteredData.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // 文字列の場合はロケールベースで比較
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const result = valueA.localeCompare(valueB, 'ja');
        return sortDirection === 'asc' ? result : -result;
      }
      
      // 数値やその他のケース
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [visitedPlaces, sortBy, sortDirection, filter, adminFilter]);
  
  // ソート順変更
  const handleSortChange = useCallback((column) => {
    if (sortBy === column) {
      // 同じカラムの場合は方向を切り替え
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいカラムの場合は昇順開始
      setSortBy(column);
      setSortDirection('asc');
    }
  }, [sortBy, sortDirection]);
  
  // 行をクリックして地図にジャンプ
  const handleRowClick = useCallback(withErrorHandling((place) => {
    // 将来的にはURLパラメータで選択地域IDを渡す
    navigate('/');
  }, (error) => {
    showToast('地図画面への移動中にエラーが発生しました', 'error');
  }), [navigate, showToast]);
  
  // 削除確認ダイアログを表示
  const handleDeleteClick = useCallback((uniqueId, placeName) => {
    setDeleteConfirmation({
      isOpen: true,
      uniqueId,
      placeName
    });
  }, []);
  
  // 削除の確定処理
  const confirmDelete = useCallback(() => {
    if (deleteConfirmation.uniqueId) {
      removePlaceVisit(deleteConfirmation.uniqueId);
    }
    
    // ダイアログを閉じる
    setDeleteConfirmation({
      isOpen: false,
      uniqueId: null,
      placeName: ''
    });
  }, [deleteConfirmation.uniqueId, removePlaceVisit]);
  
  // 削除キャンセル
  const cancelDelete = useCallback(() => {
    setDeleteConfirmation({
      isOpen: false,
      uniqueId: null,
      placeName: ''
    });
  }, []);
  
  // インポートフォーム送信処理
  const handleImportSubmit = useCallback((file) => {
    if (!file) {
      showToast('ファイルを選択してください', 'warning');
      return;
    }
    
    importFromCSV(file);
    setImportOpen(false);
  }, [importFromCSV, showToast]);
  
  // フィルター変更ハンドラ
  const handleFilterChange = useCallback((value) => {
    setFilter(value);
  }, []);
  
  // 管理レベルフィルター変更ハンドラ
  const handleAdminFilterChange = useCallback((value) => {
    setAdminFilter(value);
  }, []);
  
  return (
    <div className="list-view">
      <div className="list-controls">
        {/* フィルターコントロール */}
        <FilterControls 
          filter={filter}
          onFilterChange={handleFilterChange}
          adminFilter={adminFilter}
          onAdminFilterChange={handleAdminFilterChange}
        />
        
        {/* アクションボタン */}
        <ActionButtons 
          onExportClick={exportToCSV}
          onImportClick={() => setImportOpen(true)}
        />
      </div>
      
      <div className="table-container">
        <table className="list-table" aria-label="訪問記録一覧">
          <thead>
            <tr>
              <th 
                className={sortBy === 'placeName' ? `sorted-${sortDirection}` : ''}
                onClick={() => handleSortChange('placeName')}
                aria-sort={sortBy === 'placeName' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                地域名
              </th>
              <th 
                className={sortBy === 'adminLevel' ? `sorted-${sortDirection}` : ''}
                onClick={() => handleSortChange('adminLevel')}
                aria-sort={sortBy === 'adminLevel' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                レベル
              </th>
              <th 
                className={sortBy === 'dateMarked' ? `sorted-${sortDirection}` : ''}
                onClick={() => handleSortChange('dateMarked')}
                aria-sort={sortBy === 'dateMarked' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                記録日時
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-message">
                  {filter || adminFilter !== 'all' 
                    ? '検索条件に一致する記録がありません' 
                    : '訪問記録がありません。地図画面で国や地域をクリックして記録を開始しましょう！'}
                </td>
              </tr>
            ) : (
              displayData.map((place) => (
                <ListItem 
                  key={place.uniqueId}
                  place={place}
                  onRowClick={handleRowClick}
                  onDeleteClick={handleDeleteClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* カウンター */}
      <div className="list-counter" aria-live="polite">
        {displayData.length > 0 && (
          <p>
            {adminFilter === 'all' 
              ? `合計: ${displayData.length}件` 
              : `${adminFilter === 'Country' ? '国' : '州・都道府県'}: ${displayData.length}件`}
          </p>
        )}
      </div>
      
      {/* インポートフォーム */}
      <ImportForm
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImportSubmit}
      />
      
      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title="訪問記録の削除"
        message={`「${deleteConfirmation.placeName}」の訪問記録を削除しますか？`}
        confirmText="削除する"
        cancelText="キャンセル"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      
      {/* トースト通知 */}
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
      />
    </div>
  );
}

export default ListView;
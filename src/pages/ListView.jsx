import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAtlasStore from '../store/useAtlasStore';
import Toast from '../components/Toast';
import './ListView.css';

function ListView() {
  const navigate = useNavigate();
  const { 
    visitedPlaces, 
    initializeStore, 
    toast, 
    removePlaceVisit,
    exportToCSV,
    importFromCSV
  } = useAtlasStore();
  
  const [sortBy, setSortBy] = useState('dateMarked');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('all');
  const [displayData, setDisplayData] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  
  // 初期化
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);
  
  // 訪問地域のソートとフィルタリング
  useEffect(() => {
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
    filteredData.sort((a, b) => {
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
    
    setDisplayData(filteredData);
  }, [visitedPlaces, sortBy, sortDirection, filter, adminFilter]);
  
  // ソート順変更
  const handleSortChange = (column) => {
    if (sortBy === column) {
      // 同じカラムの場合は方向を切り替え
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいカラムの場合は昇順開始
      setSortBy(column);
      setSortDirection('asc');
    }
  };
  
  // 行をクリックして地図にジャンプ
  const handleRowClick = (place) => {
    // TODO: URLパラメータで選択地域IDを渡すように実装
    navigate('/');
  };
  
  // 削除ボタンのクリック
  const handleDelete = (e, uniqueId) => {
    e.stopPropagation(); // 行クリックイベントの伝播を止める
    if (window.confirm('この訪問記録を削除しますか？')) {
      removePlaceVisit(uniqueId);
    }
  };
  
  // インポートフォーム送信処理
  const handleImportSubmit = (e) => {
    e.preventDefault();
    const file = e.target.csvFile.files[0];
    if (!file) {
      return;
    }
    
    importFromCSV(file);
    setImportOpen(false);
  };
  
  // 日付のフォーマット
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="list-view">
      <div className="list-controls">
        <div className="filter-controls">
          <input 
            type="text"
            className="search-input"
            placeholder="検索..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          
          <select 
            className="admin-filter"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
          >
            <option value="all">すべて</option>
            <option value="Country">国</option>
            <option value="State">州・都道府県</option>
          </select>
        </div>
        
        <div className="action-buttons">
          <button 
            className="btn btn-sm"
            onClick={exportToCSV}
          >
            エクスポート
          </button>
          <button 
            className="btn btn-sm"
            onClick={() => setImportOpen(true)}
          >
            インポート
          </button>
        </div>
      </div>
      
      <div className="table-container">
        <table className="list-table">
          <thead>
            <tr>
              <th 
                className={sortBy === 'placeName' ? `sorted-${sortDirection}` : ''}
                onClick={() => handleSortChange('placeName')}
              >
                地域名
              </th>
              <th 
                className={sortBy === 'adminLevel' ? `sorted-${sortDirection}` : ''}
                onClick={() => handleSortChange('adminLevel')}
              >
                レベル
              </th>
              <th 
                className={sortBy === 'dateMarked' ? `sorted-${sortDirection}` : ''}
                onClick={() => handleSortChange('dateMarked')}
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
                <tr 
                  key={place.uniqueId}
                  className="list-row"
                  onClick={() => handleRowClick(place)}
                >
                  <td>{place.placeName}</td>
                  <td>{place.adminLevel === 'Country' ? '国' : '州・都道府県'}</td>
                  <td>{formatDate(place.dateMarked)}</td>
                  <td>
                    <button 
                      className="delete-btn"
                      onClick={(e) => handleDelete(e, place.uniqueId)}
                      title="削除"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* カウンター */}
      <div className="list-counter">
        {displayData.length > 0 && (
          <p>
            {adminFilter === 'all' 
              ? `合計: ${displayData.length}件` 
              : `${adminFilter === 'Country' ? '国' : '州・都道府県'}: ${displayData.length}件`}
          </p>
        )}
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

export default ListView;

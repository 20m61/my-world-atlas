import React from 'react';

/**
 * リストアイテムコンポーネント
 * @param {Object} place - 訪問場所のデータ
 * @param {Function} onRowClick - 行クリック時のコールバック
 * @param {Function} onDeleteClick - 削除ボタンクリック時のコールバック
 */
const ListItem = ({ place, onRowClick, onDeleteClick }) => {
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
  
  // 削除ボタンクリック時のイベント伝播を防止
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDeleteClick(place.uniqueId, place.placeName);
  };
  
  return (
    <tr className="list-row" onClick={() => onRowClick(place)}>
      <td>{place.placeName}</td>
      <td>{place.adminLevel === 'Country' ? '国' : '州・都道府県'}</td>
      <td>{formatDate(place.dateMarked)}</td>
      <td>
        <button 
          className="delete-btn"
          onClick={handleDeleteClick}
          title="削除"
          aria-label={`${place.placeName}の訪問記録を削除`}
        >
          ✕
        </button>
      </td>
    </tr>
  );
};

export default ListItem;

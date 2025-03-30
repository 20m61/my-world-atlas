import React from 'react';

/**
 * フィルターコントロールコンポーネント
 * @param {string} filter - 検索フィルター文字列
 * @param {Function} onFilterChange - フィルター変更時のコールバック
 * @param {string} adminFilter - 行政レベルのフィルター値
 * @param {Function} onAdminFilterChange - 行政レベルフィルター変更時のコールバック
 */
const FilterControls = ({ filter, onFilterChange, adminFilter, onAdminFilterChange }) => {
  return (
    <div className="filter-controls">
      <input 
        type="text"
        className="search-input"
        placeholder="検索..."
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        aria-label="検索フィルター"
      />
      
      <select 
        className="admin-filter"
        value={adminFilter}
        onChange={(e) => onAdminFilterChange(e.target.value)}
        aria-label="行政レベル選択"
      >
        <option value="all">すべて</option>
        <option value="Country">国</option>
        <option value="State">州・都道府県</option>
      </select>
    </div>
  );
};

export default FilterControls;

import Papa from 'papaparse';
import { logError } from '../utils/errorHandling';

/**
 * ファイル操作のサービスクラス
 * CSVファイルのインポート/エクスポート処理を集約
 */
class FileService {
  /**
   * CSVファイルをパースしてデータを取得
   * @param {File} file - パースするCSVファイル
   * @returns {Promise<Object>} - パース結果とエラー情報
   */
  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('ファイルが選択されていません'));
        return;
      }
      
      try {
        // ファイル読み込み
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            // CSVパース
            const { data, errors, meta } = Papa.parse(e.target.result, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true
            });
            
            if (errors.length > 0) {
              const errorMsg = 'CSVの解析中にエラーが発生しました: ' + 
                errors.map(err => `行 ${err.row}: ${err.message}`).join(', ');
              reject(new Error(errorMsg));
              return;
            }
            
            // データの検証
            const validData = data.filter(row => 
              row.uniqueId && row.placeName && row.adminLevel
            );
            
            if (validData.length === 0) {
              reject(new Error('有効なデータが見つかりませんでした'));
              return;
            }
            
            resolve({
              data: validData,
              meta
            });
          } catch (parseError) {
            logError(parseError, { action: 'parseCSV' });
            reject(new Error(`CSVの解析中にエラーが発生しました: ${parseError.message}`));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('ファイルの読み込みに失敗しました'));
        };
        
        reader.readAsText(file);
      } catch (error) {
        logError(error, { action: 'parseCSV' });
        reject(new Error(`ファイル処理中にエラーが発生しました: ${error.message}`));
      }
    });
  }
  
  /**
   * データをCSV形式に変換
   * @param {Array<Object>} data - CSVに変換するデータ配列
   * @param {Array<string>} fields - 含めるフィールドの配列
   * @returns {string} - CSV形式の文字列
   */
  generateCSV(data, fields = null) {
    try {
      if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません');
      }
      
      // デフォルトフィールド
      const defaultFields = [
        'uniqueId', 
        'placeName', 
        'adminLevel', 
        'dateMarked', 
        'countryCodeISO', 
        'regionCodeISO'
      ];
      
      // CSVデータの作成
      return Papa.unparse({
        fields: fields || defaultFields,
        data: data
      });
    } catch (error) {
      logError(error, { action: 'generateCSV' });
      throw new Error(`CSVの生成中にエラーが発生しました: ${error.message}`);
    }
  }
  
  /**
   * CSVデータをファイルとしてダウンロード
   * @param {string} csvData - CSVデータの文字列
   * @param {string} fileName - ダウンロードするファイル名
   */
  downloadCSV(csvData, fileName = null) {
    try {
      if (!csvData) {
        throw new Error('ダウンロードするデータがありません');
      }
      
      // ファイル名の生成（YYYYMMDD形式）
      if (!fileName) {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        fileName = `MyWorldAtlas_Export_${dateStr}.csv`;
      }
      
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
      
      // クリーンアップ
      URL.revokeObjectURL(url);
    } catch (error) {
      logError(error, { action: 'downloadCSV' });
      throw new Error(`ファイルのダウンロード中にエラーが発生しました: ${error.message}`);
    }
  }
  
  /**
   * データをCSVに変換してダウンロード
   * @param {Array<Object>} data - エクスポートするデータ
   * @param {Array<string>} fields - 含めるフィールド
   * @param {string} fileName - ダウンロードするファイル名
   */
  exportToCSV(data, fields = null, fileName = null) {
    try {
      const csvData = this.generateCSV(data, fields);
      this.downloadCSV(csvData, fileName);
      return true;
    } catch (error) {
      logError(error, { action: 'exportToCSV' });
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
const fileService = new FileService();
export default fileService;

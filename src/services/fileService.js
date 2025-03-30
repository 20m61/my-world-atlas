import Papa from 'papaparse';
import { logError } from '../utils/errorHandling';

/**
 * ファイル操作のサービスクラス
 * CSVファイルのインポート/エクスポート処理を集約
 */
class FileService {
  /**
   * CSVファイルをパースしてデータを取得（改善版）
   * @param {File} file - パースするCSVファイル
   * @returns {Promise<Object>} - パース結果とエラー情報
   */
  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('ファイルが選択されていません'));
        return;
      }
      
      // ファイルタイプのチェック
      if (file.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type)) {
        reject(new Error(`サポートされていないファイル形式です: ${file.type}`));
        return;
      }
      
      try {
        // ファイル読み込み
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const content = e.target.result;
            
            // 空のファイルをチェック
            if (!content || content.trim() === '') {
              reject(new Error('ファイルが空です'));
              return;
            }
            
            // BOMを削除（CSVファイルでよくある問題）
            const cleanContent = content.replace(/^\uFEFF/, '');
            
            // CSVパース（オプション強化）
            const { data, errors, meta } = Papa.parse(cleanContent, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              transform: (value) => value.trim(),
              transformHeader: (header) => header.trim(),
              delimitersToGuess: [',', '\t', ';', '|'],
              error: (error) => {
                reject(new Error(`CSVの解析中にエラーが発生しました: ${error.message}`));
              }
            });
            
            if (errors.length > 0) {
              // 重大なエラーのみ表示（警告は無視）
              const criticalErrors = errors.filter(err => err.type !== 'FieldMismatch');
              
              if (criticalErrors.length > 0) {
                const errorMsg = 'CSVの解析中にエラーが発生しました: ' + 
                  criticalErrors.map(err => `行 ${err.row}: ${err.message}`).join(', ');
                reject(new Error(errorMsg));
                return;
              }
            }
            
            // 必須フィールドの存在チェック
            const requiredFields = ['uniqueId', 'placeName', 'adminLevel'];
            const missingFields = requiredFields.filter(field => !meta.fields.includes(field));
            
            if (missingFields.length > 0) {
              reject(new Error(`CSVファイルに必須フィールドがありません: ${missingFields.join(', ')}`));
              return;
            }
            
            // データの検証と修正
            const validData = data
              .filter(row => row.uniqueId && row.placeName && row.adminLevel)
              .map(row => {
                // データの整形
                return {
                  ...row,
                  uniqueId: String(row.uniqueId).trim(),
                  placeName: String(row.placeName).trim(),
                  adminLevel: String(row.adminLevel).trim(),
                  dateMarked: row.dateMarked || new Date().toISOString()
                };
              });
            
            if (validData.length === 0) {
              reject(new Error('有効なデータが見つかりませんでした'));
              return;
            }
            
            resolve({
              data: validData,
              meta,
              invalidRows: data.length - validData.length
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
   * データをCSV形式に変換（改善版）
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
      
      // データ整形（nullやundefinedを空文字に置き換え）
      const cleanData = data.map(item => {
        const cleanItem = {};
        (fields || defaultFields).forEach(field => {
          cleanItem[field] = item[field] !== null && item[field] !== undefined 
            ? item[field] 
            : '';
        });
        return cleanItem;
      });
      
      // CSVデータの作成（オプション強化）
      return Papa.unparse({
        fields: fields || defaultFields,
        data: cleanData
      }, {
        quotes: true,  // 全てのフィールドを引用符で囲む
        delimiter: ',', // 区切り文字を明示的に指定
        header: true,
        newline: '\r\n' // Windows互換の改行コード
      });
    } catch (error) {
      logError(error, { action: 'generateCSV' });
      throw new Error(`CSVの生成中にエラーが発生しました: ${error.message}`);
    }
  }
  
  /**
   * CSVデータをファイルとしてダウンロード（改善版）
   * @param {string} csvData - CSVデータの文字列
   * @param {string} fileName - ダウンロードするファイル名
   */
  downloadCSV(csvData, fileName = null) {
    try {
      if (!csvData) {
        throw new Error('ダウンロードするデータがありません');
      }
      
      // ファイル名の生成（YYYYMMDD_HHMMSS形式）- より詳細なタイムスタンプ
      if (!fileName) {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
        fileName = `MyWorldAtlas_Export_${dateStr}_${timeStr}.csv`;
      }
      
      // BOMを追加（Excel対応のため）
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvData;
      
      // ダウンロード用のリンク作成
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      // リンクをクリックしてダウンロード開始
      document.body.appendChild(link);
      link.click();
      
      // クリーンアップ（セキュリティとメモリリーク防止のため）
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
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
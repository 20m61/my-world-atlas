import Papa from 'papaparse';
import { logError } from '../utils/errorHandling';

class FileService {
  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('ファイルが選択されていません'));
        return;
      }

      if (file.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type)) {
        reject(new Error(`サポートされていないファイル形式です: ${file.type}`));
        return;
      }

      try {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const content = e.target.result;

            if (!content || content.trim() === '') {
              reject(new Error('ファイルが空です'));
              return;
            }

            const cleanContent = content.replace(/^\uFEFF/, '');

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
              const criticalErrors = errors.filter(err => err.type !== 'FieldMismatch');
              if (criticalErrors.length > 0) {
                const errorMsg = 'CSVの解析中にエラーが発生しました: ' +
                  criticalErrors.map(err => `行 ${err.row}: ${err.message}`).join(', ');
                reject(new Error(errorMsg));
                return;
              }
            }

            const requiredFields = ['uniqueId', 'placeName', 'adminLevel'];
            const missingFields = requiredFields.filter(field => !meta.fields.includes(field));

            if (missingFields.length > 0) {
              reject(new Error(`CSVファイルに必須フィールドがありません: ${missingFields.join(', ')}`));
              return;
            }

            const validData = data
              .filter(row => row.uniqueId && row.placeName && row.adminLevel)
              .map(row => ({
                ...row,
                uniqueId: String(row.uniqueId).trim(),
                placeName: String(row.placeName).trim(),
                adminLevel: String(row.adminLevel).trim(),
                dateMarked: row.dateMarked || new Date().toISOString()
              }));

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

  generateCSV(data, fields = null) {
    try {
      if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません');
      }

      const defaultFields = [
        'uniqueId',
        'placeName',
        'adminLevel',
        'dateMarked',
        'countryCodeISO',
        'regionCodeISO'
      ];

      const cleanData = data.map(item => {
        const cleanItem = {};
        (fields || defaultFields).forEach(field => {
          cleanItem[field] = item[field] !== null && item[field] !== undefined ? item[field] : '';
        });
        return cleanItem;
      });

      return Papa.unparse({
        fields: fields || defaultFields,
        data: cleanData
      }, {
        quotes: true,
        delimiter: ',',
        header: true,
        newline: '\r\n'
      });
    } catch (error) {
      logError(error, { action: 'generateCSV' });
      throw new Error(`CSVの生成中にエラーが発生しました: ${error.message}`);
    }
  }

  downloadCSV(csvData, fileName = null) {
    try {
      if (!csvData) {
        throw new Error('ダウンロードするデータがありません');
      }

      if (!fileName) {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
        fileName = `MyWorldAtlas_Export_${dateStr}_${timeStr}.csv`;
      }

      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvData;

      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      logError(error, { action: 'downloadCSV' });
      throw new Error(`ファイルのダウンロード中にエラーが発生しました: ${error.message}`);
    }
  }

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

const fileService = new FileService();
export default fileService;
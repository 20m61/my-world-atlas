import FileService from '../../../src/services/fileService';

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    fileService = new FileService();
  });

  test('空ファイルの場合はエラーとなる', async () => {
    // 空の内容を返すダミーファイル
    const emptyFile = { text: () => Promise.resolve('') } as File;
    await expect(fileService.parseCSV(emptyFile)).rejects.toThrow(
      'ファイルが空です'
    );
  });

  test('必須フィールドが不足している場合はエラーとなる', async () => {
    // ヘッダーに必須フィールドが含まれないCSV
    const invalidCSV = 'id,name\n1,Tokyo';
    const invalidFile = { text: () => Promise.resolve(invalidCSV) } as File;
    await expect(fileService.parseCSV(invalidFile)).rejects.toThrow(
      /CSVファイルに必須フィールドがありません/
    );
  });

  test('有効なCSVファイルの場合は正しくパースされる', async () => {
    // 有効なCSV内容（必要に応じて dateMarked は自動付与となるため任意）
    const validCSV = `uniqueId,placeName,adminLevel,dateMarked
1,Tokyo,Prefecture,2023-10-01T00:00:00.000Z`;
    const validFile = { text: () => Promise.resolve(validCSV) } as File;
    const result = await fileService.parseCSV(validFile);
    // result の中に data プロパティが含まれていると想定
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].uniqueId).toBe('1');
  });
});

// jest.config.js
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/jest/**/*.test.ts'],  // テストファイルのパターンを追加
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    // 以下のオプションを追加
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
};

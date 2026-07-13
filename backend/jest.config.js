"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { join } = require('path');
const config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    roots: ['<rootDir>/src'],
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.spec.json',
                useESM: false,
            },
        ],
    },
    moduleNameMapper: {
        '^uuid$': '<rootDir>/__mocks__/uuid.js',
    },
    collectCoverageFrom: ['src/**/*.(t|j)s'],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map
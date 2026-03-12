import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^nanoid$': '<rootDir>/tests/__mocks__/nanoid.ts',
  },
};

export default config;

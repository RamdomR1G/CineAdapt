/** Pruebas white box del frontend (Practica 11). Ejecutar: npm run test:wb */
module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests-wb', '<rootDir>/tests-ci'],
  setupFilesAfterEnv: ['<rootDir>/tests-wb/setup.ts'],
  transform: { '^.+\\.(ts|js|mjs)$': ['jest-preset-angular', { tsconfig: '<rootDir>/tsconfig.wb.json' }] },
  moduleNameMapper: {
    '^@ionic/angular/standalone$': '<rootDir>/tests-wb/stubs/ionic.ts',
    '^@capacitor/geolocation$': '<rootDir>/tests-wb/stubs/geolocation.ts',
    '^tz-lookup$': '<rootDir>/tests-wb/stubs/tz-lookup.ts',
  },
  collectCoverageFrom: [
    'src/app/auth/register.page.ts',
    'src/app/auth/validators.ts',
    'src/app/services/theme.service.ts',
    'src/app/catalog/catalog.store.ts',
    'src/app/services/auth.service.ts',
    'src/app/services/resilience.http.ts',
  ],
  coverageThreshold: { global: { statements: 85, branches: 80 } },
};

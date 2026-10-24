import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  globalTimeout: process.env.CI ? 25 * 60 * 1000 : undefined,
  expect: { timeout: 7_000 },
  // Evita condiciones de carrera cuando múltiples casos comparten la misma BD.
  workers: 1,
  fullyParallel: false,
  retries: 0, // Evita reintentos de login inválido y bloqueos de cuentas QA.
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ['list'], ['html', { open: 'never' }], ['json', { outputFile: 'qa/results/playwright.json' }],
    // QA02 TODOS ejecuta un caso por proceso: cada uno deja un blob que el workflow une en un solo reporte HTML.
    ...(process.env.QA_BLOB_DIR ? [['blob', { outputFile: `${process.env.QA_BLOB_DIR}/${process.env.QA_FILTER_IDS || 'run'}.zip` }]] : []),
  ],
  outputDir: 'test-results',
use: {
  baseURL: process.env.QA_BASE_URL,

  trace: process.env.QA_ALLOW_HTTP_AUTH === 'true'
    ? 'off' : 'retain-on-failure',

  screenshot: process.env.QA_ALLOW_HTTP_AUTH === 'true'
    ? 'off' : 'only-on-failure',

  video: process.env.QA_ALLOW_HTTP_AUTH === 'true'
    ? 'off' : 'retain-on-failure',

  actionTimeout: 10_000,
  ...devices['Desktop Chrome']
},
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});

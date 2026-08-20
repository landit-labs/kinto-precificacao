import { defineConfig } from '@playwright/test';

/**
 * Dois projetos:
 * - "jornadas": Chromium headed com slowMo de 3s por ação (acompanhamento visual).
 * - "seguranca-api": checagens de API/headers sem navegador lento (request-only e
 *   verificações de DOM rápidas rodam aqui em headless).
 *
 * Servidores já em execução (não gerenciados pelo Playwright):
 * - Frontend Vite: http://localhost:5173
 * - API mock FastAPI: http://localhost:8010
 */
export default defineConfig({
  testDir: './tests',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'jornadas',
      testMatch: /jornadas\.spec\.ts/,
      use: {
        browserName: 'chromium',
        headless: false,
        viewport: { width: 1440, height: 900 },
        launchOptions: { slowMo: 3000 },
      },
    },
    {
      name: 'seguranca',
      testMatch: /seguranca.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
        headless: true,
      },
    },
  ],
});

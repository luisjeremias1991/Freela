const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Aponta para a raiz da app, para o next/jest carregar next.config.js e .env.
  dir: './'
})

// Testes desta app, para já, são só sobre funções puras (lib/*) — sem
// componentes React nem DOM — por isso testEnvironment 'node' chega e evita
// depender de jsdom/@testing-library, que ainda não estão instalados.
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'node'
}

module.exports = createJestConfig(config)

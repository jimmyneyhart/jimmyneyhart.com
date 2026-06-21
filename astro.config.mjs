import { defineConfig } from 'astro/config';

// https://astro.build
export default defineConfig({
  site: 'https://jimmyneyhart.com',
  // Static output; Netlify serves dist/. The legacy bitcoin-calculator.html
  // and other static assets live in public/ and are copied verbatim.
  build: {
    inlineStylesheets: 'auto',
  },
});

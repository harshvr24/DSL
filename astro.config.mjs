import { defineConfig } from 'astro/config';

// Static output for S3 + CloudFront. Set `site` to the production URL.
export default defineConfig({
  site: 'https://www.example.com', // [PLACEHOLDER: production URL]
  output: 'static',
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
});

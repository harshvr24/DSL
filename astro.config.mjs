import { defineConfig } from 'astro/config';

// Static output (AWS Amplify Hosting, or S3 + CloudFront). `site` is the production URL:
// it feeds the canonical link, Open Graph URLs and structured data.
export default defineConfig({
  site: 'https://www.dslhyperscale.com',
  output: 'static',
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
});

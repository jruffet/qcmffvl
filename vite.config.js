import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function injectVersion(html, appVersion) {
  return html.replace(/\?v=__APP_VERSION__/g, `?v=${appVersion}`);
}

const versionsPath = resolve(__dirname, 'web/json/versions.json');
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
const base = process.env.BASE_URL || '/';

export default defineConfig(() => {
  return {
    base: base,
    root: resolve(__dirname, 'web'),
    define: {
      __APP_VERSION__: JSON.stringify(versions.app_version),
      __QCM_VERSION__: JSON.stringify(versions.qcm_version),
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      // Disable minification to prevent a 1-2px text shift in production caused by CSS bundling/minification
      minify: false,
    },
    server: {
      port: 3000,
      open: true,
    },
    plugins: [
      {
        name: 'version-injection',
        configureServer(server) {
          // Watch versions.json and restart dev server when it changes
          server.watcher.add(versionsPath);
          server.watcher.on('change', (file) => {
            if (file === versionsPath) {
              console.log('versions.json changed, restarting dev server...');
              server.restart().catch(() => {});
            }
          });
        },
        transformIndexHtml(html) {
          return injectVersion(html, versions.app_version);
        },
      },
      {
        name: 'html-version-replace',
        apply: 'build',
        closeBundle() {
          const outDir = resolve(__dirname, 'dist');
          const indexPath = resolve(outDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            html = injectVersion(html, versions.app_version);
            fs.writeFileSync(indexPath, html, 'utf8');
          }
        },
      },
      {
        name: 'copy-assets-files',
        apply: 'build',
        closeBundle() {
          const dirsToCopy = [
            { src: 'web/js/lib', dest: 'js/lib' },
            { src: 'web/json', dest: 'json' },
            { src: 'web/generated', dest: 'generated' },
            { src: 'web/assets', dest: 'assets' }
          ];

          dirsToCopy.forEach(({ src, dest }) => {
            const srcDir = resolve(__dirname, src);
            const distDir = resolve(__dirname, 'dist', dest);

            if (fs.existsSync(srcDir)) {
              fs.mkdirSync(distDir, { recursive: true });
              fs.cpSync(srcDir, distDir, { recursive: true });
              console.log(`Successfully copied ${src} to dist/${dest}`);
            }
          });
        }
      },
    ],
  };
});

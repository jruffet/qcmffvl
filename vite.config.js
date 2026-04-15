import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

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
        name: 'copy-assets-files',
        apply: 'build',
        closeBundle() {
          const dirsToCopy = [
            { src: 'web/js/lib', dest: 'js/lib' },
            { src: 'web/json', dest: 'json' },
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
      {
        name: 'version-injection',
        // This hook allows us to react to file changes in the watcher
        configureServer(server) {
          server.watcher.on('change', (file) => {
            if (file.endsWith('versions.json')) {
              console.log('Versions file changed, syncing data and restarting server...');
              try {
                execSync('node scripts/sync-data.js', { stdio: 'inherit' });
                console.log('Data sync completed successfully.');
              } catch (err) {
                console.error('Failed to sync data:', err);
              }
              server.restart();
            }
          });
        },
        transformIndexHtml(html) {
          const currentVersions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
          return html.replace(/\?v=__APP_VERSION__/g, `?v=${currentVersions.app_version}`);
        },
      },
    ],
  };
});

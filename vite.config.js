import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                // Main process
                entry: 'electron/main/index.ts',
                vite: {
                    resolve: {
                        alias: {
                            '@shared': path.resolve(__dirname, 'shared'),
                            '@electron': path.resolve(__dirname, 'electron')
                        }
                    },
                    build: {
                        outDir: 'dist-electron/main',
                        lib: {
                            entry: 'electron/main/index.ts',
                            formats: ['cjs'],
                            fileName: function () { return 'index.js'; }
                        },
                        rollupOptions: {
                            external: [
                                'electron',
                                'path',
                                'fs',
                                'url',
                                'crypto',
                                'stream',
                                'events',
                                'util'
                            ],
                            output: {
                                entryFileNames: '[name].js',
                                format: 'cjs'
                            }
                        },
                        minify: process.env.NODE_ENV === 'production',
                        sourcemap: true
                    }
                }
            },
            {
                // Preload
                entry: 'electron/preload/index.ts',
                onstart: function (options) {
                    options.reload();
                },
                vite: {
                    resolve: {
                        alias: {
                            '@shared': path.resolve(__dirname, 'shared'),
                            '@electron': path.resolve(__dirname, 'electron')
                        }
                    },
                    build: {
                        outDir: 'dist-electron/preload',
                        lib: {
                            entry: 'electron/preload/index.ts',
                            formats: ['cjs'],
                            fileName: function () { return 'index.js'; }
                        },
                        rollupOptions: {
                            external: ['electron'],
                            output: {
                                entryFileNames: '[name].js',
                                format: 'cjs'
                            }
                        },
                        minify: process.env.NODE_ENV === 'production',
                        sourcemap: true
                    }
                }
            }
        ]),
        renderer()
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@shared': path.resolve(__dirname, 'shared'),
            '@electron': path.resolve(__dirname, 'electron'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@core': path.resolve(__dirname, 'src/core'),
            '@components': path.resolve(__dirname, 'src/shared/components'),
            '@hooks': path.resolve(__dirname, 'src/shared/hooks'),
            '@services': path.resolve(__dirname, 'src/shared/services'),
            '@utils': path.resolve(__dirname, 'src/shared/utils'),
            '@types': path.resolve(__dirname, 'src/shared/types')
        }
    },
    server: {
        port: 5173,
        strictPort: true
    },
    build: {
        outDir: 'dist-renderer',
        emptyOutDir: true
    }
});

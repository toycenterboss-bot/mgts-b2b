export default ({ env }) => ({
  // Локальное хранилище для медиа-файлов (автономное решение)
  upload: {
    config: {
      provider: 'local', // Используем локальное хранилище
      providerOptions: {},
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  'media-library-fix': {
    enabled: true,
    resolve: './src/plugins/media-library-fix',
  },
  'icon-picker': {
    enabled: true,
    resolve: './src/plugins/icon-picker',
  },
});

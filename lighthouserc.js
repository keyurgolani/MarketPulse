module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173',
        'http://localhost:5173/login',
        'http://localhost:5173/register',
        'http://localhost:5173/dashboard',
        'http://localhost:5173/markets',
        'http://localhost:5173/news',
        'http://localhost:5173/watchlist',
      ],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local:.*5173',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
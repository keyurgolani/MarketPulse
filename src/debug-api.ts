// Debug script to check API client configuration
import { apiClient } from './services/apiClient';

console.log('=== API Client Debug ===');
console.log('Environment variables:');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('DEV:', import.meta.env.DEV);

// Access the private config through any means possible
console.log('API Client instance:', apiClient);

// Try to make a test call and see what URL it actually uses
console.log('Making test API call...');
apiClient.get('/dashboards').catch(error => {
  console.log('API call error:', error);
  console.log('Error details:', {
    message: error.message,
    status: error.status,
    stack: error.stack,
  });
});

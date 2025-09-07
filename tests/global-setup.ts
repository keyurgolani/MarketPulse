import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for servers to be ready
    console.log('⏳ Waiting for servers to be ready...');
    
    // Check backend health
    let backendReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await page.goto('http://localhost:3001/api/system/health');
        if (response?.ok()) {
          backendReady = true;
          break;
        }
      } catch {
        // Server not ready yet
      }
      await page.waitForTimeout(1000);
    }
    
    if (!backendReady) {
      throw new Error('Backend server is not responding');
    }
    
    // Check frontend
    let frontendReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await page.goto('http://localhost:5173');
        if (response?.ok()) {
          frontendReady = true;
          break;
        }
      } catch {
        // Server not ready yet
      }
      await page.waitForTimeout(1000);
    }
    
    if (!frontendReady) {
      throw new Error('Frontend server is not responding');
    }
    
    console.log('✅ Servers are ready');
    
    // Set up test data if needed
    console.log('📝 Setting up test data...');
    
    // Create test user for E2E tests
    try {
      await page.goto('http://localhost:5173/register');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="first-name-input"]', 'Test');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.click('[data-testid="register-button"]');
      
      // Wait for registration to complete
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Test user created');
    } catch (error) {
      console.log('ℹ️ Test user may already exist or registration failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global test setup completed');
}

export default globalSetup;
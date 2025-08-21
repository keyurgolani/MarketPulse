#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function checkConsoleErrors() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  const consoleWarnings = [];
  const networkErrors = [];
  
  // Listen for console messages
  page.on('console', (msg) => {
    const text = msg.text();
    const args = msg.args();
    
    if (msg.type() === 'error') {
      // Try to get more detailed error information
      let errorDetails = text;
      if (args.length > 0) {
        try {
          // Get the first argument which might be an error object
          const firstArg = args[0];
          if (firstArg) {
            errorDetails += ` | Args: ${args.length}`;
          }
        } catch (e) {
          // Ignore errors when trying to get more details
        }
      }
      consoleErrors.push(errorDetails);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
    } else if (msg.type() === 'log') {
      console.log('Browser Console Log:', text);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', (error) => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });
  
  // Listen for network failures
  page.on('requestfailed', (request) => {
    networkErrors.push(`Network Error: ${request.method()} ${request.url()} - ${request.failure().errorText}`);
  });
  
  // Listen for response errors
  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push(`HTTP Error: ${response.status()} ${response.url()}`);
    }
  });
  
  // Listen for all requests to debug API calls
  page.on('request', (request) => {
    if (request.url().includes('localhost:3001')) {
      console.log(`API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  try {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
    console.log(`Navigating to ${baseUrl}...`);
    
    // First check if the server is accessible
    const response = await page.goto(baseUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
    }
    
    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== CONSOLE TEST RESULTS ===');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    
    if (networkErrors.length > 0) {
      console.log('\n--- NETWORK ERRORS ---');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n--- CONSOLE ERRORS ---');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (consoleWarnings.length > 0) {
      console.log('\n--- CONSOLE WARNINGS ---');
      consoleWarnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    if (consoleErrors.length === 0 && networkErrors.length === 0) {
      console.log('\n✅ SUCCESS: No console or network errors found!');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED: Errors detected!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Failed to load page:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

checkConsoleErrors();
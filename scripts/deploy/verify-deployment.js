import fetch from 'node-fetch';

const STAGING_URL = 'https://api-staging.chroniclesync.xyz';
const PROD_URL = 'https://api.chroniclesync.xyz';

async function checkHealth(url) {
  console.log(`\nChecking health for ${url}...`);
  try {
    const response = await fetch(`${url}/health`);
    const data = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    if (data.status !== 'healthy') {
      throw new Error(`Unhealthy status: ${JSON.stringify(data)}`);
    }
    
    const services = data.services || {};
    const unhealthyServices = Object.entries(services)
      .filter(([, status]) => status !== 'ok')
      .map(([name]) => name);
    
    if (unhealthyServices.length > 0) {
      throw new Error(`Unhealthy services: ${unhealthyServices.join(', ')}`);
    }
    
    console.log('✅ Health check passed');
    console.log('Services status:', services);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function verifyDeployment(environment) {
  const url = environment === 'production' ? PROD_URL : STAGING_URL;
  console.log(`\n🚀 Verifying ${environment} deployment...`);
  
  // Wait for the worker to be ready
  console.log('Waiting for worker to be ready...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Try health check up to 3 times
  for (let i = 0; i < 3; i++) {
    if (await checkHealth(url)) {
      console.log(`\n✨ ${environment} deployment verified successfully!`);
      return true;
    }
    if (i < 2) {
      console.log(`\nRetrying in 5 seconds... (attempt ${i + 2}/3)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.error(`\n💥 ${environment} deployment verification failed after 3 attempts`);
  process.exit(1);
}

// Check which environment to verify
const environment = process.argv[2]?.toLowerCase();
if (!environment || !['staging', 'production'].includes(environment)) {
  console.error('Please specify environment: node verify-deployment.js [staging|production]');
  process.exit(1);
}

verifyDeployment(environment);
import fetch from "node-fetch";

export async function checkHealth(url) {
  console.log(`\n🔍 Checking health for ${url}...`);
  try {
    const response = await fetch(`${url}/health`);
    const data = await response.json();

    if (response.status !== 200) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    if (data.status !== "healthy") {
      throw new Error(`Unhealthy status: ${JSON.stringify(data)}`);
    }

    const services = data.services || {};
    const unhealthyServices = Object.entries(services)
      .filter(([, status]) => status !== "ok")
      .map(([name]) => name);

    if (unhealthyServices.length > 0) {
      throw new Error(`Unhealthy services: ${unhealthyServices.join(", ")}`);
    }

    console.log("✅ Health check passed");
    console.log("Services status:", services);
    if (data.environment) {
      console.log("Environment:", data.environment);
    }
    return true;
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

export async function verifyWithRetries(url, maxAttempts = 3, waitMs = 5000, initialWaitMs = 0) {
  // Optional initial wait (useful for deployments)
  if (initialWaitMs > 0) {
    console.log(`Waiting ${initialWaitMs/1000} seconds before first check...`);
    await new Promise((resolve) => setTimeout(resolve, initialWaitMs));
  }

  // Try health check up to maxAttempts times
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkHealth(url)) {
      console.log("\n✨ Health verification successful!");
      return true;
    }
    if (i < maxAttempts - 1) {
      console.log(`\nRetrying in ${waitMs/1000} seconds... (attempt ${i + 2}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  console.error(`\n💥 Health verification failed after ${maxAttempts} attempts`);
  return false;
}
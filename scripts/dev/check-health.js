import fetch from "node-fetch";

const DEV_URL = "http://127.0.0.1:8787";

async function checkHealth() {
  console.log("\n🔍 Checking development worker health...");
  try {
    const response = await fetch(`${DEV_URL}/health`);
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
    console.log("Environment:", data.environment);
    return true;
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

// Try health check up to 3 times
async function verifyHealth() {
  for (let i = 0; i < 3; i++) {
    if (await checkHealth()) {
      console.log("\n✨ Development worker is healthy!");
      return;
    }
    if (i < 2) {
      console.log(`\nRetrying in 5 seconds... (attempt ${i + 2}/3)`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.error("\n💥 Development worker health check failed after 3 attempts");
  process.exit(1);
}

verifyHealth();
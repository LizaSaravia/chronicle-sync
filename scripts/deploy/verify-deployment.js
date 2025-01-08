import { getApiUrl } from "../../src/shared/constants.js";
import { verifyWithRetries } from "../utils/health-checker.js";

async function verifyDeployment(environment) {
  const url = getApiUrl(environment);
  console.log(`\n🚀 Verifying ${environment} deployment...`);

  const success = await verifyWithRetries(url, 3, 5000, 10000);
  if (!success) {
    process.exit(1);
  }
  console.log(`\n✨ ${environment} deployment verified successfully!`);
}

// Check which environment to verify
const environment = process.argv[2]?.toLowerCase();
if (!environment || !["staging", "production"].includes(environment)) {
  console.error(
    "Please specify environment: node verify-deployment.js [staging|production]",
  );
  process.exit(1);
}

verifyDeployment(environment);

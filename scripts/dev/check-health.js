import { getApiUrl } from "../../src/shared/constants.js";
import { verifyWithRetries } from "../utils/health-checker.js";

const devUrl = getApiUrl("development");

async function verifyHealth() {
  const success = await verifyWithRetries(devUrl);
  if (!success) {
    process.exit(1);
  }
}

verifyHealth();
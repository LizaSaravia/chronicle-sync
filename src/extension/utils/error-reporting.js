import { getApiUrl, ERROR_REPORTING_PATHS } from "../../shared/constants.js";

async function isErrorReportingEnabled() {
  const storage = await chrome.storage.local.get([
    "environment",
    "errorReporting",
  ]);
  // Enable by default in staging/beta, disable by default in production
  if (storage.errorReporting === undefined) {
    return storage.environment === "staging";
  }
  return storage.errorReporting === true;
}

export async function reportError(error, context = {}) {
  // Check if error reporting is enabled
  if (!(await isErrorReportingEnabled())) {
    console.log("Error reporting disabled, skipping report:", error);
    return;
  }

  // Get runtime context
  const isServiceWorker = typeof window === "undefined";

  const errorDetails = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context: context,
    runtime: isServiceWorker ? "Service Worker" : "Window",
    extensionVersion: chrome.runtime.getManifest().version,
  };

  try {
    const storage = await chrome.storage.local.get(["environment"]);
    const baseUrl = getApiUrl(storage.environment);
    const response = await fetch(
      `${baseUrl}${ERROR_REPORTING_PATHS.reportError}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "🐛 Chronicle Sync Error Report",
          embeds: [
            {
              title: "Error Details",
              description: `\`\`\`\n${error.message}\n\`\`\``,
              fields: [
                {
                  name: "Stack Trace",
                  value: `\`\`\`\n${error.stack?.substring(0, 1000) || "No stack trace"}\n\`\`\``,
                },
                {
                  name: "Context",
                  value: `\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``,
                },
                {
                  name: "Runtime Context",
                  value: errorDetails.runtime,
                  inline: true,
                },
                {
                  name: "Extension Version",
                  value: errorDetails.extensionVersion,
                  inline: true,
                },
                {
                  name: "Timestamp",
                  value: errorDetails.timestamp,
                  inline: true,
                },
              ],
              color: 0xff0000,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      console.error("Failed to send error to Discord:", await response.text());
    }
  } catch (e) {
    console.error("Failed to report error:", e);
  }
}

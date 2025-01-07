const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1326006790500126750/RbTZ2KVA7p_Y1q5mRtJ9GcyuzEppMQe5RY0dal8_JFB2La45kBv9u2k-JLfGXMxk-OUB';

async function isErrorReportingEnabled() {
    const storage = await chrome.storage.local.get(['environment', 'errorReporting']);
    // Enable by default in staging/beta, disable by default in production
    if (storage.errorReporting === undefined) {
        return storage.environment === 'staging';
    }
    return storage.errorReporting === true;
}

export async function reportError(error, context = {}) {
    // Check if error reporting is enabled
    if (!await isErrorReportingEnabled()) {
        console.log('Error reporting disabled, skipping report:', error);
        return;
    }
    const errorDetails = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context: context,
        userAgent: navigator.userAgent,
        extensionVersion: chrome.runtime.getManifest().version
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: '🐛 Chronicle Sync Error Report',
                embeds: [{
                    title: 'Error Details',
                    description: `\`\`\`\n${error.message}\n\`\`\``,
                    fields: [
                        {
                            name: 'Stack Trace',
                            value: `\`\`\`\n${error.stack?.substring(0, 1000) || 'No stack trace'}\n\`\`\``,
                        },
                        {
                            name: 'Context',
                            value: `\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``,
                        },
                        {
                            name: 'Extension Version',
                            value: errorDetails.extensionVersion,
                            inline: true
                        },
                        {
                            name: 'Timestamp',
                            value: errorDetails.timestamp,
                            inline: true
                        }
                    ],
                    color: 0xFF0000
                }]
            })
        });
        
        if (!response.ok) {
            console.error('Failed to send error to Discord:', await response.text());
        }
    } catch (e) {
        console.error('Failed to report error:', e);
    }
}
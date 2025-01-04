const { GoogleAuth } = require('google-auth-library');

async function getAccessToken() {
    try {
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/chromewebstore']
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        if (!token || !token.token) {
            throw new Error('No token received from Google Auth');
        }
        process.stdout.write(token.token);
    } catch (error) {
        console.error('Error getting access token:', error);
        process.exit(1);
    }
}

getAccessToken();
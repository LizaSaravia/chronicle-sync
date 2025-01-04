const { GoogleAuth } = require('google-auth-library');

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/chromewebstore']
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  console.log(token.token);
}

getAccessToken().catch(console.error);
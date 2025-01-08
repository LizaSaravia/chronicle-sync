describe('Worker Health Check', () => {
  const STAGING_URL = 'https://api-staging.chroniclesync.xyz';
  const PROD_URL = 'https://api.chroniclesync.xyz';

  async function checkHealth(url) {
    const response = await fetch(`${url}/health`);
    const data = await response.json();
    return { response, data };
  }

  test('staging health check returns healthy status', async () => {
    const { response, data } = await checkHealth(STAGING_URL);
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services).toEqual({
      d1: 'ok',
      kv: 'ok',
      r2: 'ok'
    });
  });

  test('production health check returns healthy status', async () => {
    const { response, data } = await checkHealth(PROD_URL);
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services).toEqual({
      d1: 'ok',
      kv: 'ok',
      r2: 'ok'
    });
  });
});
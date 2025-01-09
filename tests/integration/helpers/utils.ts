export async function login(page, username, password) {
    await page.goto('http://localhost:3000/login'); // Replace with login URL
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
  }
/* Utility function for logging in a user.
 * This function encapsulates the login workflow to make tests more reusable and concise.
 *
 * @param page - The Playwright page object.
 * @param username - The username to log in with.
 * @param password - The password to log in with.
 */
export async function login(page, username, password) {
  await page.goto('http://localhost:3000/login'); //replace with actual endpoint
  await page.fill('#username', username); // replace selector
  await page.fill('#password', password); // replace selector
  await page.click('button[type="submit"]'); // replace selector
}

const TOKEN_KEY = "chronicle_auth_token";
const GROUP_ID_KEY = "chronicle_group_id";

export class AuthService {
  static getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  static getGroupId() {
    return localStorage.getItem(GROUP_ID_KEY);
  }

  static setAuth(token, groupId) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(GROUP_ID_KEY, groupId);
  }

  static clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GROUP_ID_KEY);
  }

  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  }
}

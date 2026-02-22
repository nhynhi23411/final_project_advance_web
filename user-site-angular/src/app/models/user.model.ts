export interface User {
  id: string;
  name?: string;
  email: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

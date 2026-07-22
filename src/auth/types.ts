export type Role = "Operations Manager" | "Direct Remit Officer" | "Credit to Account Officer";

export interface AuthUser {
  id: string;
  email: string; // username stored as email
  role: Role;
  // Additional user metadata can be added here as needed
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
}

export interface LoginCredentials {
  username: string; // treated as email for Supabase auth
  password: string;
}

import type { User, UserCreateInput, UserUpdateInput } from "../types/user";

let users: User[] = [];

const cloneUser = (user: User): User => ({ ...user });

const createId = () => {
  return crypto.randomUUID();
};

const timestamp = () => {
  return new Date().toISOString();
};

export async function listUsers(): Promise<User[]> {
  return users.map(cloneUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const user = users.find((item) => item.id === id);
  return user ? cloneUser(user) : null;
}

export async function createUser(input: UserCreateInput): Promise<User> {
  const now = timestamp();
  const user: User = {
    ...input,
    id: createId(),
    failedLoginAttempts: 0,
    passwordChangedAt: null,
    lastLoginAt: null,
    createdAt: now,
    lastUpdatedAt: now,
  };

  users = [...users, user];
  return cloneUser(user);
}

export async function updateUser(id: string, input: UserUpdateInput): Promise<User | null> {
  const existingUser = users.find((item) => item.id === id);

  if (!existingUser) {
    return null;
  }

  const updatedUser: User = {
    ...existingUser,
    ...input,
    id: existingUser.id,
    createdBy: existingUser.createdBy,
    createdAt: existingUser.createdAt,
    lastUpdatedAt: timestamp(),
  };

  users = users.map((item) => (item.id === id ? updatedUser : item));
  return cloneUser(updatedUser);
}

export async function setUserLocked(id: string, accountLocked: boolean, lastUpdatedBy: string): Promise<User | null> {
  return updateUser(id, { accountLocked, lastUpdatedBy });
}

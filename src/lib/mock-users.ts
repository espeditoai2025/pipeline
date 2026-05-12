import { hashSync, compareSync } from "bcryptjs";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

// Pre-seeded demo account — email: demo@pipely.it  password: demo1234
const DEMO_USER: MockUser = {
  id: "user-demo",
  name: "Demo User",
  email: "demo@pipely.it",
  passwordHash: hashSync("demo1234", 10),
  role: "OWNER",
  organizationId: "org-demo",
  organizationName: "Pipely Demo",
};

const users: MockUser[] = [DEMO_USER];

export function findUserByEmail(email: string): MockUser | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(data: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}): MockUser {
  const user: MockUser = {
    id: `user-${Date.now()}`,
    name: data.name,
    email: data.email,
    passwordHash: hashSync(data.password, 10),
    role: "OWNER",
    organizationId: `org-${Date.now()}`,
    organizationName: data.organizationName,
  };
  users.push(user);
  return user;
}

export function verifyPassword(plain: string, hash: string): boolean {
  return compareSync(plain, hash);
}

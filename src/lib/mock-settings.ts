export type Session = {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
};

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export type Invoice = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  downloadUrl: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "SALES" | "VIEWER";
  avatar: string | null;
  joinedAt: string;
  lastLogin: string | null;
};

export const MOCK_SESSIONS: Session[] = [
  { id: "s-1", device: "MacBook Pro", browser: "Chrome 124", ip: "192.168.1.10", location: "Milano, IT", lastActive: new Date().toISOString(), isCurrent: true },
  { id: "s-2", device: "iPhone 15 Pro", browser: "Safari 17", ip: "10.0.0.5", location: "Roma, IT", lastActive: new Date(Date.now() - 2 * 3600_000).toISOString(), isCurrent: false },
  { id: "s-3", device: "Windows PC", browser: "Edge 123", ip: "85.42.11.33", location: "Torino, IT", lastActive: new Date(Date.now() - 24 * 3600_000).toISOString(), isCurrent: false },
];

export const MOCK_API_KEYS: ApiKey[] = [
  { id: "key-1", name: "Integrazione Zapier", prefix: "crm_live_aB3x", scopes: ["deals:read", "contacts:read"], lastUsed: new Date(Date.now() - 3600_000).toISOString(), createdAt: "2024-02-10T10:00:00Z", expiresAt: null },
  { id: "key-2", name: "Webhook produzione", prefix: "crm_live_kZ9y", scopes: ["deals:write", "contacts:write", "activities:write"], lastUsed: new Date(Date.now() - 86400_000 * 3).toISOString(), createdAt: "2024-03-01T10:00:00Z", expiresAt: "2025-03-01T00:00:00Z" },
  { id: "key-3", name: "Test locale", prefix: "crm_test_tY2z", scopes: ["deals:read"], lastUsed: null, createdAt: "2024-04-15T10:00:00Z", expiresAt: null },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: "inv-001", date: "2025-04-01", description: "Piano Pro — Aprile 2025", amount: 79, currency: "EUR", status: "paid", downloadUrl: "#" },
  { id: "inv-002", date: "2025-03-01", description: "Piano Pro — Marzo 2025",  amount: 79, currency: "EUR", status: "paid", downloadUrl: "#" },
  { id: "inv-003", date: "2025-02-01", description: "Piano Pro — Febbraio 2025", amount: 79, currency: "EUR", status: "paid", downloadUrl: "#" },
  { id: "inv-004", date: "2025-01-01", description: "Piano Starter — Gennaio 2025", amount: 29, currency: "EUR", status: "paid", downloadUrl: "#" },
];

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: "u-1", name: "Mario Rossi", email: "mario@acme.com", role: "ADMIN", avatar: null, joinedAt: "2024-01-01T00:00:00Z", lastLogin: new Date().toISOString() },
  { id: "u-2", name: "Giulia Bianchi", email: "giulia@acme.com", role: "MANAGER", avatar: null, joinedAt: "2024-02-15T00:00:00Z", lastLogin: new Date(Date.now() - 3600_000).toISOString() },
  { id: "u-3", name: "Luca Verdi", email: "luca@acme.com", role: "SALES", avatar: null, joinedAt: "2024-03-10T00:00:00Z", lastLogin: new Date(Date.now() - 86400_000).toISOString() },
  { id: "u-4", name: "Anna Ferrari", email: "anna@acme.com", role: "SALES", avatar: null, joinedAt: "2024-04-01T00:00:00Z", lastLogin: new Date(Date.now() - 86400_000 * 2).toISOString() },
  { id: "u-5", name: "Roberto Esposito", email: "roberto@acme.com", role: "VIEWER", avatar: null, joinedAt: "2024-05-20T00:00:00Z", lastLogin: new Date(Date.now() - 86400_000 * 5).toISOString() },
];

export const USAGE = {
  deals:    { used: 47,   limit: 100 },
  contacts: { used: 183,  limit: 500 },
  storage:  { used: 2.4,  limit: 5,   unit: "GB" },
  emails:   { used: 1240, limit: 5000 },
  automations: { used: 5, limit: 10 },
};

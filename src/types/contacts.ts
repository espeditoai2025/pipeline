export type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  description: string | null;
  linkedinUrl: string | null;
  referentName: string | null;
  referentRole: string | null;
  referentEmail: string | null;
  referentPhone: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { contacts: number; deals: number };
};

export type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  organizationId: string;
  ownerId: string;
  owner: { id: string; name: string | null; email: string };
  companyId: string | null;
  company: Pick<Company, "id" | "name"> | null;
  createdAt: string;
  updatedAt: string;
  _count?: { deals: number };
};

export type LeadStatus = "NEW" | "WORKING" | "NURTURING" | "CONVERTED" | "DISQUALIFIED";

export type Lead = {
  id: string;
  title: string;
  source: string | null;
  score: number;
  status: LeadStatus;
  data: Record<string, unknown>;
  organizationId: string;
  convertedDealId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactFilters = {
  search?: string;
  companyId?: string;
  ownerId?: string;
};

export type CompanyFilters = {
  search?: string;
  industry?: string;
};

export type LeadFilters = {
  search?: string;
  status?: LeadStatus;
  source?: string;
};

export type ImportRow = Record<string, string>;

export type DuplicateGroup = {
  key: string;
  contacts: Contact[];
};

export type LeadCandidateStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeadFinderSearchStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export type LeadCandidate = {
  id: string;
  organizationId: string;
  searchId: string;
  companyName: string;
  website: string | null;
  sector: string | null;
  location: string | null;
  companySize: string | null;
  contactName: string | null;
  contactRole: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  // Campi CCIAA da FatturatoItalia
  piva: string | null;
  ateco: string | null;
  nDipendenti: string | null;
  formaGiuridica: string | null;
  annoFondazione: string | null;
  score: number;
  source: string;
  motivation: string | null;
  status: LeadCandidateStatus;
  leadId: string | null;
  createdAt: string;
};

export type LeadFinderSearch = {
  id: string;
  organizationId: string;
  name: string;
  sector: string | null;
  location: string | null;
  companySize: string | null;
  keywords: string | null;
  idealCustomer: string | null;
  maxResults: number;
  status: LeadFinderSearchStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  candidates?: LeadCandidate[];
};

export type LeadFinderSearchInput = {
  name: string;
  sector?: string;
  location?: string;
  companySize?: string;
  keywords?: string;
  idealCustomer?: string;
  maxResults?: number;
};

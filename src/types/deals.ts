export type DealStatus = "OPEN" | "WON" | "LOST" | "DELETED";

export type DealOwner = {
  id: string;
  name: string | null;
  email: string;
};

export type DealContact = {
  id: string;
  firstName: string;
  lastName: string | null;
};

export type DealCompany = {
  id: string;
  name: string;
};

export type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: DealStatus;
  expectedClose: string | null;
  closedAt: string | null;
  lostReason: string | null;
  stageId: string;
  pipelineId: string;
  ownerId: string;
  owner: DealOwner;
  contact: DealContact | null;
  company: DealCompany | null;
  createdAt: string;
  updatedAt: string;
  /** Days the deal has been in current stage — computed server-side */
  daysInStage: number;
};

export type Stage = {
  id: string;
  name: string;
  position: number;
  probability: number;
  rotting: number | null;
  deals: Deal[];
  totalValue: number;
};

export type Pipeline = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
};

export type DealFilters = {
  ownerId?: string;
  stageId?: string;
  minValue?: number;
  maxValue?: number;
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
};

export type CreateDealInput = {
  title: string;
  value: number;
  currency: string;
  stageId: string;
  pipelineId: string;
  expectedClose?: string;
  contactId?: string;
  companyId?: string;
};

export type UpdateDealInput = Partial<CreateDealInput> & {
  status?: DealStatus;
  lostReason?: string;
};

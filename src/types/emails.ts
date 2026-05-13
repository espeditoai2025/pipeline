export type EmailStatus = "SENT" | "DRAFT" | "RECEIVED";
export type TrackingStatus = "NONE" | "SENT" | "OPENED" | "CLICKED";

export type EmailMessage = {
  id: string;
  threadId: string;
  subject: string;
  body: string;
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  status: EmailStatus;
  tracking: TrackingStatus;
  openedAt: string | null;
  clickedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  dealId: string | null;
  dealTitle: string | null;
  contactId: string | null;
  contactName: string | null;
};

export type EmailThread = {
  id: string;
  subject: string;
  participants: string[];
  lastMessageAt: string;
  messages: EmailMessage[];
  dealId: string | null;
  dealTitle: string | null;
  contactId: string | null;
  contactName: string | null;
  unreadCount: number;
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ComposeData = {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  templateId?: string;
  dealId?: string;
  contactId?: string;
};

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED";

export type EmailListContact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  unsubscribed: boolean;
  createdAt: string;
};

export type EmailList = {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EmailListDetail = EmailList & {
  contacts: EmailListContact[];
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  body: string;
  fromName: string | null;
  listId: string;
  listName: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  createdAt: string;
  updatedAt: string;
};

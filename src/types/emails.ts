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

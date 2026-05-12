export type ActivityType = "CALL" | "MEETING" | "EMAIL" | "TASK" | "DEADLINE" | "LUNCH";

export type Activity = {
  id: string;
  type: ActivityType;
  subject: string;
  notes: string | null;
  dueDate: string | null;
  completedAt: string | null;
  duration: number | null;
  organizationId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  dealId: string | null;
  dealTitle: string | null;
  contactId: string | null;
  contactName: string | null;
  createdAt: string;
};

export type ActivityFilters = {
  type?: ActivityType;
  completed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  dealId?: string;
  contactId?: string;
};

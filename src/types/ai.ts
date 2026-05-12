export type AIRole = "user" | "assistant";

export type AIMessage = {
  id: string;
  role: AIRole;
  content: string;
  createdAt: string;
};

export type AIInsightSeverity = "info" | "warning" | "danger" | "success";

export type AIInsight = {
  id: string;
  severity: AIInsightSeverity;
  title: string;
  body: string;
  action?: { label: string; href: string };
};

export type AIEmailDraft = {
  subject: string;
  body: string;
};

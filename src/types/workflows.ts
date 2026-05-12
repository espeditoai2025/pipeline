// ---- Triggers ----

export type TriggerType =
  | "DEAL_CREATED"
  | "DEAL_STAGE_CHANGED"
  | "DEAL_WON"
  | "DEAL_LOST"
  | "CONTACT_CREATED"
  | "ACTIVITY_OVERDUE"
  | "LEAD_CREATED"
  | "DEAL_VALUE_CHANGED";

export type TriggerConfig = {
  type: TriggerType;
  // optional filter fields
  stageId?: string;        // for DEAL_STAGE_CHANGED
  fromStageId?: string;
  toStageId?: string;
  minValue?: number;       // for DEAL_VALUE_CHANGED
};

// ---- Actions ----

export type ActionType =
  | "SEND_EMAIL"
  | "CREATE_ACTIVITY"
  | "UPDATE_DEAL_STAGE"
  | "ASSIGN_OWNER"
  | "SEND_NOTIFICATION"
  | "WAIT";

export type ActionConfig =
  | { type: "SEND_EMAIL"; templateId: string; to: "contact" | "owner" | string }
  | { type: "CREATE_ACTIVITY"; activityType: string; subject: string; dueDays: number }
  | { type: "UPDATE_DEAL_STAGE"; stageId: string }
  | { type: "ASSIGN_OWNER"; userId: string }
  | { type: "SEND_NOTIFICATION"; message: string }
  | { type: "WAIT"; days: number };

// ---- Workflow ----

export type WorkflowStep = {
  id: string;
  action: ActionConfig;
  delayDays?: number;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: TriggerConfig;
  steps: WorkflowStep[];
  organizationId: string;
  executionCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---- Execution log ----

export type LogStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export type WorkflowLog = {
  id: string;
  workflowId: string;
  workflowName: string;
  status: LogStatus;
  trigger: string;
  entityType: "deal" | "contact" | "activity" | "lead";
  entityId: string;
  entityLabel: string;
  stepsExecuted: number;
  error: string | null;
  executedAt: string;
};

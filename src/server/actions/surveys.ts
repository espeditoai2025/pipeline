"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type SurveyListItem = {
  id: string;
  title: string;
  isActive: boolean;
  questionsCount: number;
  responsesCount: number;
  createdAt: Date;
};

export type SurveyDetail = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  questions: {
    id: string;
    text: string;
    type: string;
    options: string[] | null;
    required: boolean;
    position: number;
  }[];
};

export type SurveyResults = {
  survey: { id: string; title: string; questionsCount: number };
  totalResponses: number;
  answers: Record<string, { question: string; type: string; values: (string | number)[] }>;
};

// ── CRUD Surveys ─────────────────────────────────────────────────────────────

export async function getSurveys(): Promise<SurveyListItem[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const surveys = await db.survey.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { questions: true, responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return surveys.map((s) => ({
    id: s.id,
    title: s.title,
    isActive: s.isActive,
    questionsCount: s._count.questions,
    responsesCount: s._count.responses,
    createdAt: s.createdAt,
  }));
}

export async function createSurvey(data: {
  title: string;
  description?: string;
  questions: { text: string; type: string; options?: string[]; required?: boolean }[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false, error: "Non autenticato" };

  const survey = await db.survey.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      organizationId: orgId,
      questions: {
        create: data.questions.map((q, i) => ({
          text: q.text,
          type: q.type,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options: (q.options ?? undefined) as any,
          required: q.required ?? false,
          position: i,
        })),
      },
    },
  });

  return { success: true, id: survey.id };
}

export async function deleteSurvey(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false };

  await db.survey.deleteMany({ where: { id, organizationId: orgId } });
  return { success: true };
}

export async function toggleSurvey(id: string, isActive: boolean): Promise<{ success: boolean }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false };

  await db.survey.updateMany({ where: { id, organizationId: orgId }, data: { isActive } });
  return { success: true };
}

export async function getSurveyResults(id: string): Promise<SurveyResults | null> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const survey = await db.survey.findFirst({
    where: { id, organizationId: orgId },
    include: {
      questions: { orderBy: { position: "asc" } },
      responses: true,
    },
  });

  if (!survey) return null;

  const answers: Record<string, { question: string; type: string; values: (string | number)[] }> = {};
  for (const q of survey.questions) {
    answers[q.id] = { question: q.text, type: q.type, values: [] };
  }

  for (const resp of survey.responses) {
    const data = resp.answers as Record<string, string | number>;
    for (const [qId, value] of Object.entries(data)) {
      if (answers[qId]) {
        answers[qId].values.push(value);
      }
    }
  }

  return {
    survey: { id: survey.id, title: survey.title, questionsCount: survey.questions.length },
    totalResponses: survey.responses.length,
    answers,
  };
}

// ── Public: get survey + submit response ─────────────────────────────────────

export async function getPublicSurvey(id: string): Promise<SurveyDetail | null> {
  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { position: "asc" } },
    },
  });

  if (!survey || !survey.isActive) return null;

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    isActive: survey.isActive,
    questions: survey.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options as string[] | null,
      required: q.required,
      position: q.position,
    })),
  };
}

export async function submitSurveyResponse(data: {
  surveyId: string;
  answers: Record<string, string | number>;
  respondent?: string;
}): Promise<{ success: boolean; error?: string }> {
  const survey = await db.survey.findUnique({ where: { id: data.surveyId } });
  if (!survey || !survey.isActive) return { success: false, error: "Sondaggio non trovato" };

  await db.surveyResponse.create({
    data: {
      surveyId: data.surveyId,
      answers: data.answers,
      respondent: data.respondent ?? null,
    },
  });

  return { success: true };
}

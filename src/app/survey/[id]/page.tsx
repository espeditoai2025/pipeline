import { notFound } from "next/navigation";
import { getPublicSurvey } from "@/server/actions/surveys";
import { SurveyForm } from "@/components/surveys/SurveyForm";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const survey = await getPublicSurvey(id);
  if (!survey) return { title: "Sondaggio non trovato" };
  return { title: survey.title, description: survey.description ?? "Compila il sondaggio" };
}

export default async function SurveyPage({ params }: Props) {
  const { id } = await params;
  const survey = await getPublicSurvey(id);
  if (!survey) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 dark:text-gray-300 mt-1">{survey.description}</p>
          )}
        </div>
        <SurveyForm survey={survey} />
      </div>
    </div>
  );
}

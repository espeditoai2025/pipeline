import { notFound } from "next/navigation";
import { getPublicBookingPage } from "@/server/actions/bookings";
import { BookingWidget } from "@/components/bookings/BookingWidget";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicBookingPage(slug);
  if (!page) return { title: "Pagina non trovata" };
  return {
    title: `Prenota - ${page.title}`,
    description: page.description ?? `Prenota un appuntamento con ${page.userName}`,
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublicBookingPage(slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
          {page.description && (
            <p className="text-gray-600 dark:text-gray-300 mt-1">{page.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            con {page.userName} · {page.duration} min
          </p>
        </div>
        <BookingWidget slug={page.slug} duration={page.duration} maxDaysAhead={page.maxDaysAhead} />
      </div>
    </div>
  );
}

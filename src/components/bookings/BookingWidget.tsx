"use client";

import { useState } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { getAvailableSlots, createBooking, type TimeSlot } from "@/server/actions/bookings";

type Props = {
  slug: string;
  duration: number;
  maxDaysAhead: number;
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export function BookingWidget({ slug, duration, maxDaysAhead }: Props) {
  const [step, setStep] = useState<"date" | "time" | "form" | "done">("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const maxDate = new Date(today.getTime() + maxDaysAhead * 86400_000);

  async function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setLoading(true);
    setError(null);
    try {
      const available = await getAvailableSlots(slug, dateStr);
      setSlots(available);
      setStep("time");
    } catch {
      setError("Errore nel caricamento degli slot");
    }
    setLoading(false);
  }

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);

    const result = await createBooking({
      slug,
      guestName: name,
      guestEmail: email,
      guestPhone: phone || undefined,
      notes: notes || undefined,
      startTime: selectedSlot.start,
    });

    if (result.success) {
      setStep("done");
    } else {
      setError(result.error ?? "Errore nella prenotazione");
    }
    setSubmitting(false);
  }

  // Calendar rendering
  function renderCalendar() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    let startDow = firstDay.getDay() - 1; // Monday = 0
    if (startDow < 0) startDow = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

    const todayStr = formatDate(today);
    const maxStr = formatDate(maxDate);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
              else setViewMonth(viewMonth - 1);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{MONTHS_IT[viewMonth]} {viewYear}</span>
          <button
            onClick={() => {
              if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
              else setViewMonth(viewMonth + 1);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS_IT.map((d) => (
            <div key={d} className="text-[10px] font-medium text-gray-400 py-1">{d}</div>
          ))}
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isDisabled = dateStr < todayStr || dateStr > maxStr;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                disabled={isDisabled}
                onClick={() => handleDateSelect(dateStr)}
                className={`
                  h-9 w-9 mx-auto rounded-full text-sm transition-colors
                  ${isDisabled ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"}
                  ${isSelected ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  ${isToday && !isSelected ? "ring-1 ring-blue-400" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === "done") {
    const dt = selectedSlot ? new Date(selectedSlot.start) : null;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Prenotazione confermata!</h2>
        {dt && (
          <p className="text-gray-600 dark:text-gray-300">
            {dt.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} alle{" "}
            {dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-2">Riceverai una conferma via email</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {step === "date" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Scegli una data</span>
          </div>
          {renderCalendar()}
        </>
      )}

      {step === "time" && (
        <>
          <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
            <ChevronLeft className="h-3 w-3" /> Cambia data
          </button>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              {selectedDate && new Date(selectedDate + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              {" "}· {duration} min
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nessuno slot disponibile per questa data</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
              {slots.map((slot) => {
                const t = new Date(slot.start);
                return (
                  <button
                    key={slot.start}
                    onClick={() => handleSlotSelect(slot)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    {t.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {step === "form" && (
        <>
          <button onClick={() => setStep("time")} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
            <ChevronLeft className="h-3 w-3" /> Cambia orario
          </button>
          {selectedSlot && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
              <p className="font-medium">
                {new Date(selectedSlot.start).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-blue-600">
                {new Date(selectedSlot.start).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                {" - "}
                {new Date(selectedSlot.end).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Nome *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Il tuo nome"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Email *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@esempio.it"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Telefono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+39 333 1234567"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Note</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Di cosa vuoi parlare?"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma prenotazione"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

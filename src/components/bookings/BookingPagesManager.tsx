"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, ExternalLink, Copy, Loader2, ToggleLeft, ToggleRight, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getBookingPages, createBookingPage, deleteBookingPage, updateBookingPage,
  getUpcomingBookings, cancelBooking,
  type BookingPageItem, type BookingItem,
} from "@/server/actions/bookings";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

export function BookingPagesManager() {
  const [pages, setPages] = useState<BookingPageItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    Promise.all([getBookingPages(), getUpcomingBookings()]).then(([p, b]) => {
      setPages(p);
      setBookings(b);
      setLoading(false);
    });
  }, []);

  function autoSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const result = await createBookingPage({ title, slug, duration });
    if (result.success) {
      toast.success("Pagina di prenotazione creata");
      setShowForm(false);
      setTitle("");
      setSlug("");
      setDuration(30);
      const updated = await getBookingPages();
      setPages(updated);
    } else {
      toast.error(result.error ?? "Errore");
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    await deleteBookingPage(id);
    setPages(pages.filter((p) => p.id !== id));
    toast.success("Pagina eliminata");
  }

  async function handleToggle(id: string, current: boolean) {
    await updateBookingPage(id, { isActive: !current });
    setPages(pages.map((p) => (p.id === id ? { ...p, isActive: !current } : p)));
  }

  async function handleCancel(id: string) {
    await cancelBooking(id);
    setBookings(bookings.filter((b) => b.id !== id));
    toast.success("Prenotazione cancellata");
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiato!");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--crm-neutral-400)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking Pages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--crm-primary)]" />
            Pagine di prenotazione
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--crm-primary)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Nuova
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-4 p-4 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10 space-y-3">
            <div>
              <label className="text-xs font-medium">Titolo</label>
              <input
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSlug(autoSlug(e.target.value)); }}
                className={inputCls}
                placeholder="es. Consulenza Gratuita"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Slug (URL)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--crm-neutral-400)]">/book/</span>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={inputCls}
                  placeholder="consulenza-gratuita"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Durata (minuti)</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[var(--crm-primary)] text-white text-sm font-medium disabled:opacity-50">
                {creating ? "Creazione..." : "Crea pagina"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--crm-neutral-500)]">
                Annulla
              </button>
            </div>
          </form>
        )}

        {pages.length === 0 ? (
          <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">
            Nessuna pagina di prenotazione. Crea la prima per ricevere appuntamenti!
          </p>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{page.title}</p>
                    {!page.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500">
                        Disattiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--crm-neutral-400)] mt-0.5">
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {page.duration} min</span>
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {page.bookingsCount} prenotazioni</span>
                    <span>/book/{page.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleToggle(page.id, page.isActive)} title={page.isActive ? "Disattiva" : "Attiva"}>
                    {page.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <button onClick={() => copyLink(page.slug)} className="p-1.5 rounded hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5" title="Copia link">
                    <Copy className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" />
                  </button>
                  <a href={`/book/${page.slug}`} target="_blank" className="p-1.5 rounded hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5" title="Apri">
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" />
                  </a>
                  <button onClick={() => handleDelete(page.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Elimina">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Bookings */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-green-500" />
          Prossimi appuntamenti
        </h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">
            Nessun appuntamento in programma
          </p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10"
              >
                <div>
                  <p className="text-sm font-medium">{b.guestName}</p>
                  <p className="text-[10px] text-[var(--crm-neutral-400)]">
                    {b.guestEmail} · {b.bookingPageTitle}
                  </p>
                  <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">
                    {new Date(b.startTime).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                    {" "}
                    {new Date(b.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(b.endTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(b.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Cancella
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

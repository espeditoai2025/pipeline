import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ enabled: true, send: vi.fn() }));
vi.mock("@/lib/resend", () => ({ isEmailEnabled: () => state.enabled }));
vi.mock("@/lib/mailer", () => ({ sendPlatformMail: state.send }));
import { submitContactForm } from "@/server/actions/contact-form";

const input = { name: "Anna", email: "anna@esempio.it", subject: "info", message: "Vorrei informazioni su Pipely.", privacy: true };

beforeEach(() => {
  state.enabled = true;
  state.send.mockReset();
  state.send.mockResolvedValue({ ok: true, via: "resend" });
});

it("recapita il modulo a info e permette di rispondere al visitatore", async () => {
  expect(await submitContactForm(input)).toEqual({ success: true });
  expect(state.send).toHaveBeenNthCalledWith(1, "modulo-contatti", expect.objectContaining({ to: "info@pipely.it", replyTo: input.email }));
  expect(state.send).toHaveBeenNthCalledWith(2, "modulo-contatti-conferma", expect.objectContaining({ to: input.email, html: expect.stringContaining("mailto:info@pipely.it") }));
});

it("non conferma un messaggio non inviato se manca Resend", async () => {
  state.enabled = false;
  expect(await submitContactForm(input)).toMatchObject({ success: false, error: expect.stringContaining("info@pipely.it") });
  expect(state.send).not.toHaveBeenCalled();
});

it("segnala il rifiuto dell'invio al supporto senza spedire la conferma", async () => {
  state.send.mockResolvedValueOnce({ ok: false, error: "provider rifiuta" });
  expect(await submitContactForm(input)).toMatchObject({ success: false });
  expect(state.send).toHaveBeenCalledTimes(1);
});

it("conserva l'esito positivo se fallisce solo la conferma di cortesia", async () => {
  state.send.mockResolvedValueOnce({ ok: true, via: "resend" }).mockResolvedValueOnce({ ok: false, error: "provider rifiuta" });
  expect(await submitContactForm(input)).toEqual({ success: true });
});

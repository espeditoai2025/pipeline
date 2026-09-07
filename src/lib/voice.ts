export const MAX_VOICE_BYTES = 3 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 120;
export const VOICE_STORAGE_BYTES = 50 * 1024 * 1024;
export const voiceMimeTypes: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
};
export type VoiceNoteSummary = {
  id: string; title: string; mimeType: string; duration: number; transcript: string;
  dealId: string | null; contactId: string | null; authorId: string; createdAt: string;
};
export function matchesAudioSignature(bytes: Uint8Array, mime: string) {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.length < 12) return false;
  if (mime === "audio/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mime === "audio/mp4") return ascii(4, 4) === "ftyp";
  if (mime === "audio/ogg") return ascii(0, 4) === "OggS";
  if (mime === "audio/mpeg") return ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0);
  return (mime === "audio/wav" || mime === "audio/x-wav") && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE";
}

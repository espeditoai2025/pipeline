import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "it";
  const validLocale = ["it", "en"].includes(locale) ? locale : "it";

  const messages = (await import(`./${validLocale}.json`)) as { default: Record<string, unknown> };

  return {
    locale: validLocale,
    messages: messages.default,
  };
});

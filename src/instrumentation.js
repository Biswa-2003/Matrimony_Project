// Next.js instrumentation: record server-side request errors for the admin "Insights → Health" view.
export function register() {}

export async function onRequestError(error, request, context) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/error-log");
  await logError(`server:${context?.routeType || "route"}`, error?.message || String(error), {
    path: request?.path,
    digest: error?.digest,
  });
}

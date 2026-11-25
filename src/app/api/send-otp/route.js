// Legacy path kept for old clients. It now uses the hardened sender
// (rate limited per IP and per email, never logs the code outside development).
export const dynamic = "force-dynamic";
export { POST } from "../auth/send-otp/route";

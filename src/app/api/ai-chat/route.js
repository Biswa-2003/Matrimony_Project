// Legacy endpoint kept for old clients: it now answers with the live, data-backed
// assistant instead of the old hard-coded replies (which had outdated plan prices).
export const dynamic = 'force-dynamic';
export { POST } from '../assistant/route';

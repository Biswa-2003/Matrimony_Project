export const resolvePhoto = (p) => {
    const fallback = '/uploads/default.jpg';
    if (!p) return fallback;
    if (typeof p !== 'string') return fallback;
    if (p.startsWith('blob:') || p.startsWith('data:')) return p;
    return p.startsWith('/uploads/') ? p : `/uploads/${p}`;
};

export const timeAgo = (iso) => {
    if (!iso) return 'just now';
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (days > 1) return `${days} days ago`;
    if (days === 1) return '1 day ago';
    if (hrs >= 1) return `${hrs} hours ago`;
    if (mins >= 1) return `${mins} minutes ago`;
    return 'just now';
};

export const safeJson = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        console.error('Bad JSON from', res.url, 'status', res.status, 'body', text.slice(0, 200));
        return {};
    }
};

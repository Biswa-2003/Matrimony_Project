
const rateLimitMap = new Map();

export function rateLimit(ip, limit = 5, windowMs = 60 * 1000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    const requestTimestamps = rateLimitMap.get(ip) || [];

    // Filter out timestamps outside the window
    const requestsInWindow = requestTimestamps.filter(timestamp => timestamp > windowStart);

    if (requestsInWindow.length >= limit) {
        return false; // Limit exceeded
    }

    requestsInWindow.push(now);
    rateLimitMap.set(ip, requestsInWindow);

    return true; // Request allowed
}

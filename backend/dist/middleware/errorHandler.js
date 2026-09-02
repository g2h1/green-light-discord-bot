import { ZodError } from 'zod';
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export function notFoundHandler(_req, res) {
    res.status(404).json({ message: 'Not found' });
}
export function errorHandler(err, _req, res, _next) {
    if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message });
        return;
    }
    if (err instanceof ZodError) {
        res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid request' });
        return;
    }
    // Errors with a numeric `status` (e.g. DiscordApiError) map straight through.
    if (err instanceof Error && 'status' in err && typeof err.status === 'number') {
        const status = err.status;
        if (status >= 400 && status < 500) {
            res.status(status).json({ message: err.message });
            return;
        }
    }
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
}

import { createApp } from "../server/_core/app";

// Vercel forwards /api/* here; the function must not open a listening port.
export default createApp();

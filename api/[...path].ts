import { createApp } from "../server/_core/app";

// Vercel invokes Express per request; the function must not open a listening port.
export default createApp();

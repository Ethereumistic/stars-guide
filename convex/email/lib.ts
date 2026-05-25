import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = "stars.guide <hello@stars.guide>";

export const resend = new Resend(RESEND_API_KEY);
export { FROM_EMAIL };
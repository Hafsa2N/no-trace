import { Resend } from "resend";
import nodemailer from "nodemailer";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Gmail SMTP: the fallback that actually works without owning a domain.
// Resend's free tier can only deliver to the account owner's own inbox
// until a domain is verified via DNS — useless for reaching real students
// without one. A Gmail account + an "app password" (not the account
// password) can send to any recipient with no domain required at all.
const gmailTransport =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null;

export async function sendOtpEmail(to: string, code: string) {
  const subject = "Your feedback verification code";
  const text = `Your one-time code is ${code}. It expires in 5 minutes. This code only verifies your eligibility to submit feedback — it is never stored alongside your response.`;

  if (resend) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to,
      subject,
      text,
    });
    return;
  }

  if (gmailTransport) {
    await gmailTransport.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
    });
    return;
  }

  // Local dev fallback so you can test the flow with no email provider at all.
  console.log(`[dev] OTP for ${to}: ${code}`);
}

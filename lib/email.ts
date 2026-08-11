import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOtpEmail(to: string, code: string) {
  if (!resend) {
    // Local dev fallback so you can test the flow without a Resend key.
    console.log(`[dev] OTP for ${to}: ${code}`);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to,
    subject: "Your feedback verification code",
    text: `Your one-time code is ${code}. It expires in 5 minutes. This code only verifies your eligibility to submit feedback — it is never stored alongside your response.`,
  });
}

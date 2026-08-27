const nodemailer = require("nodemailer");

let transporter = null;

async function initTransporter() {
  if (transporter) return transporter;

  // Use real SMTP credentials if provided in .env
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_SECURE === "true" || true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback to Ethereal Email for development if no real credentials are provided
  console.warn(
    "⚠️ No SMTP_USER or SMTP_PASS found in .env. Falling back to Ethereal Email for testing."
  );
  let account = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  return transporter;
}

/**
 * Send an email with a 6-digit OTP
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} purpose - "Signup" or "Password Reset"
 */
async function sendOtpEmail(to, otp, purpose) {
  // During automated tests, we might want to skip actually sending emails
  // and just resolve, but for now we'll let Ethereal handle it or mock it in tests.
  if (process.env.NODE_ENV === "test" && !process.env.TEST_EMAIL) {
    return null; // Skip in tests unless explicitly enabled
  }

  const tp = await initTransporter();

  const subject =
    purpose === "Signup"
      ? "Verify your account - Task Manager"
      : "Reset your password - Task Manager";

  const text =
    purpose === "Signup"
      ? `Welcome to Task Manager! Your verification code is: ${otp}\n\nThis code will expire in 15 minutes.`
      : `You requested a password reset. Your reset code is: ${otp}\n\nThis code will expire in 15 minutes.`;

  const info = await tp.sendMail({
    from: '"Task Manager" <noreply@taskmanager.local>',
    to,
    subject,
    text,
  });

  console.log(`\n======================================`);
  console.log(`✉️ Email sent to ${to} [${purpose}]`);
  console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  console.log(`======================================\n`);

  return info;
}

module.exports = {
  sendOtpEmail,
};

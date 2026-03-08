const { Resend } = require('resend');

const sendEmail = async (options) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in environment variables.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'OneElixir <onboarding@resend.dev>',
      to: options.email,
      subject: options.subject,
      html: options.html,
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Resend error:", error);
    throw error;
  }
};

module.exports = sendEmail;
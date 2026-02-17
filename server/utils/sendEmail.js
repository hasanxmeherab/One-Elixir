const { Resend } = require('resend');

const sendEmail = async (options) => {
  // Initialize INSIDE the function to ensure the API key is loaded from process.env
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in environment variables.");
  }

  try {
    await resend.emails.send({
      from: 'OneElixir <onboarding@resend.dev>',
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
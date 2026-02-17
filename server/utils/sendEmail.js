const { Resend } = require('resend');

// Initialize Resend with your API Key from Render Environment Variables
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const { data, error } = await resend.emails.send({
      /* IMPORTANT: On the Resend Free Tier, you MUST use 'onboarding@resend.dev' 
         as the 'from' address until you verify your own domain.
      */
      from: 'OneElixir <onboarding@resend.dev>',
      to: options.email,
      subject: options.subject,
      html: options.html, // This sends your luxury HTML template
      text: options.message, // Plain text fallback
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw new Error(error.message);
    }

    console.log("Email sent successfully! ID:", data.id);
  } catch (err) {
    console.error("Email Service Error:", err);
    throw new Error("Failed to send email via API.");
  }
};

module.exports = sendEmail;
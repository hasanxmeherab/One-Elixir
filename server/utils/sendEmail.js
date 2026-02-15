const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Or your preferred service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use an "App Password" if using Gmail
    },
  });

  const mailOptions = {
    from: 'OneElixir <no-reply@oneelixir.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: `<b>${options.message}</b>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
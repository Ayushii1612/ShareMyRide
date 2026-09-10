const nodemailer = require('nodemailer');

const buildResetLink = (resetToken) => `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(resetToken)}`;

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = buildResetLink(resetToken);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return {
      sent: false,
      resetLink,
      message: 'Email service is not configured in this environment. Use the reset link below for local testing.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset your CarPooling password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="margin-bottom: 16px; color: #1f2937;">Reset your password</h2>
          <p style="color: #374151; line-height: 1.6;">We received a request to reset your CarPooling password.</p>
          <p style="color: #374151; line-height: 1.6;">Click the button below to set a new password:</p>
          <div style="margin: 24px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { sent: true, resetLink };
  } catch (error) {
    console.error('Password reset email failed:', error?.message || error);
    return {
      sent: false,
      resetLink,
      message: 'Unable to send reset email right now. Use the reset link below for local testing.',
    };
  }
};

module.exports = { sendPasswordResetEmail, buildResetLink };

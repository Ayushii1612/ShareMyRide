const nodemailer = require('nodemailer');

const buildResetLink = (resetToken) => `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(resetToken)}`;

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = buildResetLink(resetToken);

  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '');

  if (!emailUser || !emailPass) {
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
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `CarPooling <${emailUser}>`,
      to: email,
      subject: 'Reset your CarPooling password',
      text: `Hello,\n\nWe received a request to reset your CarPooling password.\n\nPlease use the link below to set a new password:\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="margin-bottom: 16px; color: #1f2937;">Reset your password</h2>
          <p style="color: #374151; line-height: 1.6;">We received a request to reset your CarPooling password.</p>
          <p style="color: #374151; line-height: 1.6;">Click the link below to set a new password:</p>
          <div style="margin: 24px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; background: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">Or copy and paste this URL into your browser:</p>
          <p style="color: #2563eb; font-size: 13px; word-break: break-all;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { sent: true, resetLink };
  } catch (error) {
    console.error('Password reset email failed:', error?.message || error);
    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      console.error('--> Gmail SMTP Authentication Error (535 Bad Credentials). Ensure EMAIL_USER is correct and EMAIL_PASS is an active Google App Password from https://myaccount.google.com/apppasswords');
    }
    return {
      sent: false,
      resetLink,
      message: 'Unable to send reset email right now. Use the reset link below for local testing.',
    };
  }
};

module.exports = { sendPasswordResetEmail, buildResetLink };

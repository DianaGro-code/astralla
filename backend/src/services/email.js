import nodemailer from 'nodemailer';

const FROM    = process.env.SMTP_FROM || 'Astralla <noreply@astralla.com>';
const APP_URL = process.env.APP_URL   || 'https://astralla-production.up.railway.app';

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(email, rawToken) {
  const resetUrl = `${APP_URL}/auth?mode=reset&token=${rawToken}`;

  const transporter = createTransport();
  await transporter.sendMail({
    from: FROM,
    to:   email,
    subject: 'Reset your Astralla password',
    text: [
      'You requested a password reset for your Astralla account.',
      '',
      'Open this link to set a new password (expires in 1 hour):',
      resetUrl,
      '',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#090E18;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090E18;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0E1520;border:1px solid rgba(201,169,110,0.12);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <span style="font-family:Georgia,serif;font-size:20px;color:#C9A96E;letter-spacing:0.05em;">✦ Astralla</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <h2 style="font-family:Georgia,serif;font-size:24px;color:#F0EBE3;margin:0 0 12px;">Reset your password</h2>
              <p style="font-size:14px;color:#94A3B8;line-height:1.7;margin:0 0 28px;">
                We received a request to reset the password for your Astralla account.
                Click the button below — this link expires in <strong style="color:#E2D9C8;">1 hour</strong>.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#C9A96E;color:#090E18;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                Reset my password →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px;">
              <p style="font-size:12px;color:#4A5568;line-height:1.6;margin:0;">
                If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
                Or copy this link into your browser:<br>
                <span style="color:#C9A96E;word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

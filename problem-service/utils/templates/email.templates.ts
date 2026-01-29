interface OtpEmailParams {
  userName: string;
  otp: string;
  expiresInMinutes: number;
  type: "VERIFY_EMAIL" | "RESET_PASSWORD";
}

export function getOtpEmailTemplate(params: OtpEmailParams): string {
  const { userName, otp, expiresInMinutes, type } = params;

  const title =
    type === "VERIFY_EMAIL" ? "Verify Your Email" : "Reset Your Password";
  const heading =
    type === "VERIFY_EMAIL"
      ? "Welcome to Codexa! 🚀"
      : "Password Reset Request";
  const description =
    type === "VERIFY_EMAIL"
      ? "Thank you for signing up! Please use the following OTP to verify your email address."
      : "We received a request to reset your password. Use the OTP below to proceed.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 16px;
    }
    .description {
      color: #666;
      font-size: 15px;
      margin-bottom: 30px;
    }
    .otp-container {
      background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin-bottom: 30px;
    }
    .otp-label {
      color: #666;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #667eea;
      font-family: 'Courier New', monospace;
    }
    .expiry-notice {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 30px;
    }
    .expiry-notice p {
      color: #856404;
      font-size: 14px;
    }
    .warning {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .warning p {
      color: #666;
      font-size: 13px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      color: #999;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .footer .brand {
      color: #667eea;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Codexa</h1>
      <p>Your Coding Journey Starts Here</p>
    </div>
    <div class="content">
      <p class="greeting">Hi ${userName},</p>
      <p class="description">${heading}<br><br>${description}</p>
      
      <div class="otp-container">
        <p class="otp-label">Your Verification Code</p>
        <p class="otp-code">${otp}</p>
      </div>
      
      <div class="expiry-notice">
        <p>⏰ This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      </div>
      
      <div class="warning">
        <p>🔒 If you didn't request this code, please ignore this email. Someone might have entered your email address by mistake.</p>
      </div>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@codexa.com" style="color: #667eea;">support@codexa.com</a></p>
      <p>&copy; ${new Date().getFullYear()} <span class="brand">Codexa</span>. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

interface WelcomeEmailParams {
  userName: string;
}

export function getWelcomeEmailTemplate(params: WelcomeEmailParams): string {
  const { userName } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Codexa</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 50px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 22px;
      color: #333;
      margin-bottom: 20px;
    }
    .description {
      color: #666;
      font-size: 15px;
      margin-bottom: 30px;
    }
    .features {
      margin-bottom: 30px;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .feature-icon {
      font-size: 24px;
      margin-right: 16px;
    }
    .feature-text h3 {
      color: #333;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .feature-text p {
      color: #666;
      font-size: 14px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      color: #999;
      font-size: 13px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Codexa!</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello ${userName}!</p>
      <p class="description">
        Your email has been verified and your account is now active. 
        We're thrilled to have you join our community of coders!
      </p>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">💻</span>
          <div class="feature-text">
            <h3>Practice Problems</h3>
            <p>Solve coding challenges across various difficulty levels</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon">📊</span>
          <div class="feature-text">
            <h3>Track Progress</h3>
            <p>Monitor your improvement with detailed statistics</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon">🏆</span>
          <div class="feature-text">
            <h3>Compete & Learn</h3>
            <p>Participate in contests and learn from the community</p>
          </div>
        </div>
      </div>
      
      <center>
        <a href="https://codexa.com/dashboard" class="cta-button">Start Coding →</a>
      </center>
    </div>
    <div class="footer">
      <p>Happy Coding! 🚀</p>
      <p>&copy; ${new Date().getFullYear()} Codexa. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

interface LoginAlertEmailParams {
  userName: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export function getLoginAlertEmailTemplate(
  params: LoginAlertEmailParams,
): string {
  const { userName, ipAddress, userAgent, timestamp } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Login Alert</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .header {
      background: #28a745;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      margin: 0;
    }
    .content {
      padding: 30px;
    }
    .info-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: 600;
      color: #333;
      width: 100px;
    }
    .info-value {
      color: #666;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
    }
    .footer p {
      color: #999;
      font-size: 13px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 New Login Detected</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>We detected a new login to your Codexa account.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value">${timestamp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">IP Address:</span>
          <span class="info-value">${ipAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Device:</span>
          <span class="info-value">${userAgent}</span>
        </div>
      </div>
      
      <p>If this was you, no action is needed. If you didn't log in, please secure your account immediately.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Codexa. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

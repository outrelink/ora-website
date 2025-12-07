/**
 * Email Template Generator
 * Creates HTML email templates with ORA branding and logo
 */

/**
 * Generate HTML email template with ORA branding
 */
function generateEmailTemplate(options = {}) {
  const {
    subject = 'Email from ORA',
    message = '',
    displayName = 'Creator',
    logoUrl = 'https://myora.co/ora-logo.png', // You can host the logo and use the URL
    footerText = '© 2025 ORA. All rights reserved.',
    primaryColor = '#f97316', // Orange
    backgroundColor = '#ffffff',
    textColor = '#1e293b',
    replyTo = null
  } = options;

  // Replace {{displayName}} in message
  const personalizedMessage = message.replace(/\{\{displayName\}\}/g, displayName);

  // Convert line breaks to HTML
  const htmlMessage = personalizedMessage
    .split('\n')
    .map(line => {
      if (line.trim() === '') return '<br>';
      // Convert bullet points
      if (line.trim().startsWith('•')) {
        return `<li style="margin-bottom: 8px;">${line.trim().substring(1).trim()}</li>`;
      }
      return `<p style="margin: 0 0 12px 0; line-height: 1.6;">${line}</p>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px;">
                    
                    <!-- Header with ORA Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #ea580c 100%); padding: 40px 40px 30px 40px; text-align: center;">
                            <div style="display: inline-block; width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; padding: 15px; margin-bottom: 20px;">
                                <div style="font-family: 'Protos', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 600; color: ${primaryColor}; line-height: 1;">ORA</div>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 45px 40px;">
                            <div style="color: ${textColor}; font-size: 16px; line-height: 1.6;">
                                ${htmlMessage}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
                                <a href="https://myora.co" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Visit ORA</a> | 
                                <a href="https://myora.co/privacy-policy" style="color: #64748b; text-decoration: none;">Privacy Policy</a> | 
                                <a href="https://myora.co/terms-of-service" style="color: #64748b; text-decoration: none;">Terms of Service</a>
                            </p>
                            <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0 0;">${footerText}</p>
                            ${replyTo ? `<p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0 0;">Reply to this email if you have any questions.</p>` : ''}
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version (fallback)
 */
function generatePlainTextTemplate(options = {}) {
  const {
    message = '',
    displayName = 'Creator'
  } = options;

  return message.replace(/\{\{displayName\}\}/g, displayName);
}

module.exports = {
  generateEmailTemplate,
  generatePlainTextTemplate
};


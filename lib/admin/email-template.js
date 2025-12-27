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
    logoUrl = 'https://myora.co/adaptive-icon.png', // ORA app icon (adaptive-icon.png)
    footerText = '© 2025 ORA. All rights reserved.',
    primaryColor = '#f97316', // Orange
    backgroundColor = '#ffffff',
    textColor = '#1e293b',
    replyTo = null,
    appStoreUrl = null // App Store link URL
  } = options;

  // Replace {{displayName}} in message
  const personalizedMessage = message.replace(/\{\{displayName\}\}/g, displayName);

  // Convert line breaks to HTML with proper bullet point handling
  const lines = personalizedMessage.split('\n');
  let htmlMessage = '';
  let inBulletList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      if (inBulletList) {
        htmlMessage += '</ul>';
        inBulletList = false;
      }
      htmlMessage += '<br>';
    } else if (trimmedLine.startsWith('•')) {
      if (!inBulletList) {
        htmlMessage += '<ul style="margin: 12px 0; padding-left: 24px; list-style-type: disc;">';
        inBulletList = true;
      }
      const bulletText = trimmedLine.substring(1).trim();
      // Handle bold text in bullets
      const formattedText = bulletText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlMessage += `<li style="margin-bottom: 8px; line-height: 1.6;">${formattedText}</li>`;
      } else {
        if (inBulletList) {
          htmlMessage += '</ul>';
          inBulletList = false;
        }
        // Handle bold text first (before checking for App Store links)
        let processedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert App Store links: [App Store] or [Download on App Store]
        if (trimmedLine.includes('[App Store]') || trimmedLine.includes('[Download on App Store]')) {
          // Use Apple's official App Store badge - moved to after content
          // Skip this line, we'll add it at the end
          htmlMessage += ''; // Placeholder, will be added after content
        } else {
          htmlMessage += `<p style="margin: 0 0 12px 0; line-height: 1.6;">${processedLine}</p>`;
        }
      }
  }
  
  // Close any open bullet list
  if (inBulletList) {
    htmlMessage += '</ul>';
  }
  
  // Add App Store badge at the end if [App Store] was found
  const finalAppStoreUrl = appStoreUrl || 'https://apps.apple.com/us/app/my-ora/id6755090210';
  const appIdMatch = finalAppStoreUrl.match(/\/id(\d+)/);
  const appId = appIdMatch ? appIdMatch[1] : null;
  
  if (personalizedMessage.includes('[App Store]') || personalizedMessage.includes('[Download on App Store]')) {
    // Create a styled button that looks like the App Store badge with Apple logo
    // Use table layout for better email client compatibility
    htmlMessage += `<p style="margin: 30px 0 20px 0; text-align: center;">
      <a href="${finalAppStoreUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; background: #000000; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          <tr>
            <td style="padding: 12px 20px 12px 24px; text-align: center; vertical-align: middle;">
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; vertical-align: middle;">
                <path d="M13.5 0C12.3 0 11.4 0.3 10.5 1.2C9.6 2.1 9 3.3 9 4.5C9 5.7 9.6 6.6 10.5 7.5C11.4 8.4 12.3 8.7 13.5 8.7C14.7 8.7 15.6 8.4 16.5 7.5C17.4 6.6 18 5.4 18 4.2C18 3 17.4 2.1 16.5 1.2C15.6 0.3 14.7 0 13.5 0ZM9.9 9.9C8.4 11.4 6.3 12.3 4.5 12.3C2.7 12.3 1.2 11.4 0 9.9C-1.2 8.4 -1.8 6.3 -1.8 4.5C-1.8 2.7 -1.2 1.2 0 0C1.2 -1.2 2.7 -1.8 4.5 -1.8C6.3 -1.8 8.4 -1.2 9.9 0C11.4 1.2 12.3 2.7 12.3 4.5C12.3 6.3 11.4 8.4 9.9 9.9Z" fill="white"/>
                <path d="M4.5 9.9C3.3 9.9 2.4 9.6 1.5 8.7C0.6 7.8 0 6.6 0 5.4C0 4.2 0.6 3.3 1.5 2.4C2.4 1.5 3.3 1.2 4.5 1.2C5.7 1.2 6.6 1.5 7.5 2.4C8.4 3.3 9 4.5 9 5.7C9 6.9 8.4 7.8 7.5 8.7C6.6 9.6 5.7 9.9 4.5 9.9Z" fill="white"/>
              </svg>
            </td>
            <td style="padding: 12px 24px 12px 0; text-align: left; vertical-align: middle;">
              <span style="color: #ffffff; font-size: 15px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.3px; line-height: 1.4;">
                Download on the<br>App Store
              </span>
            </td>
          </tr>
        </table>
      </a>
    </p>`;
  }

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
                        <td style="background: linear-gradient(180deg, ${primaryColor} 0%, #ea580c 30%, #ffffff 100%); padding: 50px 40px 40px 40px; text-align: center;">
                            <div style="display: inline-block; width: 90px; height: 90px; background-color: #ffffff; border-radius: 18px; padding: 6px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; position: relative;">
                                <img src="${logoUrl}" alt="ORA" style="width: 100%; height: 100%; object-fit: contain; object-position: center; border-radius: 12px; transform: scale(2.2);" />
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


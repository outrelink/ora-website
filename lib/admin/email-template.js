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
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; vertical-align: middle;">
                <path d="M15.685 0C15.685 0 14.868 0.085 13.714 1.239C12.56 2.393 11.743 4.106 11.743 5.819C11.743 7.532 12.56 8.416 13.714 9.57C14.868 10.724 15.685 10.809 15.685 10.809C15.685 10.809 14.868 10.894 13.714 12.048C12.56 13.202 11.743 14.915 11.743 16.628C11.743 18.341 12.56 19.225 13.714 20.379C14.868 21.533 15.685 21.618 15.685 21.618C15.685 21.618 16.502 21.533 17.656 20.379C18.81 19.225 19.627 17.512 19.627 15.799C19.627 14.086 18.81 12.202 17.656 11.048C16.502 9.894 15.685 9.809 15.685 9.809C15.685 9.809 16.502 9.724 17.656 8.57C18.81 7.416 19.627 5.703 19.627 3.99C19.627 2.277 18.81 1.393 17.656 0.239C16.502 -0.915 15.685 0 15.685 0Z" fill="white"/>
                <path d="M8.315 0C8.315 0 7.498 0.085 6.344 1.239C5.19 2.393 4.373 4.106 4.373 5.819C4.373 7.532 5.19 8.416 6.344 9.57C7.498 10.724 8.315 10.809 8.315 10.809C8.315 10.809 7.498 10.894 6.344 12.048C5.19 13.202 4.373 14.915 4.373 16.628C4.373 18.341 5.19 19.225 6.344 20.379C7.498 21.533 8.315 21.618 8.315 21.618C8.315 21.618 9.132 21.533 10.286 20.379C11.44 19.225 12.257 17.512 12.257 15.799C12.257 14.086 11.44 12.202 10.286 11.048C9.132 9.894 8.315 9.809 8.315 9.809C8.315 9.809 9.132 9.724 10.286 8.57C11.44 7.416 12.257 5.703 12.257 3.99C12.257 2.277 11.44 1.393 10.286 0.239C9.132 -0.915 8.315 0 8.315 0Z" fill="white"/>
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


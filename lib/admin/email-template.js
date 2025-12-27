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
    // Use Apple's official App Store badge API
    // Format: https://tools.applemediaservices.com/api/badges/download-on-the-app-store/{badge-type}/{locale}?size={size}&releaseDate={date}
    const badgeUrl = appId 
      ? `https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=2024-01-01`
      : null;
    
    htmlMessage += `<p style="margin: 30px 0 20px 0; text-align: center;">
      <a href="${finalAppStoreUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
        ${badgeUrl ? `
        <img src="${badgeUrl}" 
             alt="Download on the App Store" 
             style="height: 60px; width: auto; max-width: 200px; display: block; margin: 0 auto; border: none;" 
             border="0">
        ` : `
        <span style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, ${primaryColor} 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
          Download on App Store
        </span>
        `}
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
                            <div style="display: inline-block; width: 110px; height: 110px; background-color: #ffffff; border-radius: 22px; padding: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; position: relative;">
                                <img src="${logoUrl}" alt="ORA" style="width: 100%; height: 100%; object-fit: contain; object-position: center; border-radius: 14px;" />
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


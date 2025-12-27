# Apple Logo PNG Setup

## Quick Setup

1. **Get a white Apple logo PNG:**
   - Download from: https://www.apple.com/ac/globalfooter/3/en_US/images/ac-footer/apple-logo-white.svg
   - Convert SVG to PNG (white, transparent background)
   - Or use an online converter: https://cloudconvert.com/svg-to-png
   - Size: 18x22 pixels (or larger, we'll scale it down)

2. **Save the file:**
   - Name it: `apple-logo.png`
   - Place it in: `/Users/zahra/ORA/ORA-website/` (root directory)
   - Make sure it's a white Apple logo on transparent background

3. **Deploy:**
   - The file will be accessible at: `https://myora.co/apple-logo.png`
   - After deployment, test: `curl -I https://myora.co/apple-logo.png`

## Alternative: Use Online Image

If you prefer not to host it yourself, you can use a CDN-hosted Apple logo:
- Example: Use a reliable CDN that hosts Apple logos
- Or use the emoji (🍎) which works everywhere

## File Requirements

- **Format:** PNG
- **Color:** White (#FFFFFF)
- **Background:** Transparent
- **Size:** 18x22 pixels (or larger, we'll scale in CSS)
- **File name:** `apple-logo.png`
- **Location:** Root of ORA-website directory


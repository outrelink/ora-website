# Influencer Outreach Tracker - Notion Table Template

Copy this structure into Notion to track your influencer email campaigns:

## Table Columns:

| Column Name | Type | Description |
|------------|------|-------------|
| **Name** | Title | Influencer's name |
| **Email** | Email | Contact email address |
| **Platform** | Select | Instagram, TikTok, YouTube, Twitter/X, Other |
| **Handle** | Text | @username or channel name |
| **Followers** | Number | Follower/subscriber count |
| **Niche** | Select | Fashion, Beauty, Tech, Lifestyle, Gaming, Business, Other |
| **Email Status** | Select | Not Sent, Sent, Opened, Replied, Bounced |
| **Email Sent Date** | Date | When you sent the email |
| **Response** | Select | No Response, Interested, Not Interested, Maybe Later, Requested Demo |
| **Response Date** | Date | When they responded |
| **App Download** | Select | Not Downloaded, Downloaded, Active User, Uninstalled |
| **Download Date** | Date | When they downloaded (if applicable) |
| **Trial Status** | Select | Not Started, Free Trial, Subscribed, Churned |
| **Priority** | Select | High, Medium, Low |
| **Notes** | Text | Any additional notes, conversation details, or follow-up reminders |
| **Follow-up Date** | Date | When to follow up (if needed) |
| **Campaign** | Select | Launch Campaign, Follow-up, Re-engagement |

## Suggested Select Options:

### Platform Options:
- Instagram
- TikTok
- YouTube
- Twitter/X
- LinkedIn
- Other

### Niche Options:
- Fashion
- Beauty
- Tech
- Lifestyle
- Gaming
- Business/Entrepreneurship
- Fitness
- Travel
- Food
- Other

### Email Status Options:
- Not Sent
- Sent
- Opened
- Clicked
- Replied
- Bounced
- Unsubscribed

### Response Options:
- No Response
- Interested
- Not Interested
- Maybe Later
- Requested Demo
- Asked Questions
- Referred Someone

### App Download Options:
- Not Downloaded
- Downloaded
- Active User
- Inactive User
- Uninstalled

### Trial Status Options:
- Not Started
- Free Trial
- Subscribed (Creator Essentials)
- Subscribed (Pro)
- Subscribed (Premium)
- Churned

### Priority Options:
- High (big following, perfect fit)
- Medium (good fit, decent following)
- Low (smaller following or less ideal fit)

### Campaign Options:
- Launch Campaign
- Follow-up
- Re-engagement
- Partnership Outreach

## Quick Setup Instructions:

1. Open Notion
2. Create a new database/table
3. Add each column with the specified type
4. For Select columns, add the options listed above
5. Start adding influencers and tracking your outreach!

## Tips for Using This Tracker:

- **Filter by Email Status** to see who you still need to contact
- **Sort by Priority** to focus on high-value influencers first
- **Use Follow-up Date** to set reminders for checking in
- **Track Response** to see which messaging works best
- **Monitor App Download** to measure campaign effectiveness
- **Add Notes** for personalization details (e.g., "Mentioned they struggle with contract negotiations")

## Sample Email Template Ideas:

You can also create a separate Notion page with email templates for:
- Initial outreach
- Follow-up (if no response)
- Thank you (after download)
- Re-engagement (for inactive users)

---

## 📱 App Store QR Code & Smart App Banner Setup

### Step 1: Get Your App Store URL

Once your app is approved and published on the App Store:

1. Go to **App Store Connect** → Your App → **App Information**
2. Find your **App Store ID** (it's a number like `1234567890`)
3. Your App Store URL will be: `https://apps.apple.com/app/id[YOUR_APP_ID]`
   - Example: `https://apps.apple.com/app/id1234567890`

**Alternative:** You can also use the bundle identifier format:
- `https://apps.apple.com/app/ora/id[YOUR_APP_ID]`

### Step 2: Create a QR Code

**Option A: Online QR Code Generator (Easiest)**
1. Go to any QR code generator (e.g., `https://www.qr-code-generator.com`, `https://qr.io`, or `https://www.qrcode-monkey.com`)
2. Enter your App Store URL
3. Customize the design (add ORA logo, colors, etc.)
4. Download as PNG or SVG
5. Add it to your website

**Option B: Use a Service with Analytics**
- **Bitly** or **TinyURL**: Create a short link, then generate QR code
- Track how many people scan it
- Example: `https://bit.ly/ora-app-store` → Generate QR code

### Step 3: Add Smart App Banner to Your Website

Add this code to your website's `<head>` section (in `index.html`):

```html
<!-- Smart App Banner for iOS -->
<meta name="apple-itunes-app" content="app-id=YOUR_APP_ID, app-argument=myora://">
```

**What this does:**
- Shows a banner at the top of your website on iOS devices
- When users tap it, it opens the App Store directly
- If they already have the app, it opens the app instead

**To add it:**
1. Open `ORA-website/index.html`
2. Find the `<head>` section
3. Add the meta tag above (replace `YOUR_APP_ID` with your actual App Store ID)
4. Deploy to Vercel

### Step 4: Add QR Code to Your Website

**Option A: Add to Homepage**
- Create a section with the QR code
- Add text like "Scan to download ORA on the App Store"
- Place it prominently (hero section, footer, or dedicated section)

**Option B: Create a Dedicated Download Page**
- Create `download.html` or `app.html`
- Show QR code for iOS and Android
- Add direct download buttons

### Step 5: Test It

1. **Test QR Code:**
   - Scan with your phone's camera
   - Should open App Store directly

2. **Test Smart App Banner:**
   - Visit your website on an iPhone/iPad
   - Should see a banner at the top
   - Tapping it should open App Store

### Example HTML for QR Code Section:

```html
<div class="qr-code-section">
  <h2>Download ORA</h2>
  <p>Scan the QR code to download ORA from the App Store</p>
  <img src="/qr-code-ora.png" alt="Download ORA QR Code" width="200" height="200">
  <p>
    <a href="https://apps.apple.com/app/idYOUR_APP_ID" target="_blank">
      Or click here to download
    </a>
  </p>
</div>
```

### Quick Checklist:

- [ ] Get App Store ID from App Store Connect (after approval)
- [ ] Create App Store URL: `https://apps.apple.com/app/id[YOUR_APP_ID]`
- [ ] Generate QR code using online tool
- [ ] Add Smart App Banner meta tag to website
- [ ] Add QR code image to website
- [ ] Test on iOS device
- [ ] Deploy to Vercel

### Pro Tips:

1. **Customize QR Code:** Add your ORA logo in the center for branding
2. **Track Scans:** Use a URL shortener with analytics to see how many people scan
3. **Multiple QR Codes:** Create different QR codes for different campaigns (track which works best)
4. **Landing Page:** Create a special landing page (`myora.co/app`) that shows the QR code and download options


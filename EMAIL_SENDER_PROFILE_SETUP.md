# Email Sender Profile & Avatar Setup

## What You're Asking About

The email "profile" or "avatar" is the picture that shows up next to your emails in Gmail, Outlook, and other email clients. This is the sender's profile image.

## How to Set Up Sender Avatar in Zoho Mail

### Step 1: Set Up Profile Picture in Zoho Account

1. **Go to Zoho Account Settings:**
   - Visit: https://accounts.zoho.com/home#profile
   - Or: https://mail.zoho.com → Settings → Profile

2. **Upload Profile Picture:**
   - Click on your profile picture/avatar
   - Upload `adaptive-icon.png` (your ORA logo)
   - Save changes

3. **Verify:**
   - Send a test email to yourself
   - Check if avatar appears in email client

### Step 2: Set Up Branded Email Account (Better Option)

For a more professional setup:

1. **Create Branded Email Account:**
   - In Zoho Mail, set up: `hello@myora.co` or `noreply@myora.co`
   - Upload ORA logo as profile picture for this account
   - Use this email for sending bulk emails

2. **Update Environment Variables:**
   - In Vercel, set `ZOHO_HELLO_EMAIL=hello@myora.co`
   - This email will be used for bulk emails
   - Make sure this account has the ORA logo as profile picture

### Step 3: Alternative - Use Gravatar (Universal)

Some email clients use Gravatar for sender avatars:

1. **Create Gravatar Account:**
   - Go to: https://gravatar.com
   - Sign up with your sending email address (e.g., `hello@myora.co`)
   - Upload `adaptive-icon.png` as your avatar
   - Set it as default

2. **Benefits:**
   - Works across many email clients
   - Gmail, Outlook, Apple Mail all support Gravatar
   - One-time setup

### Step 4: Update Email Headers (Advanced)

We can add email headers that some clients recognize:

```javascript
// In send-email.js, add to mailOptions:
headers: {
  'X-Sender-Avatar': 'https://myora.co/adaptive-icon.png',
  'List-Unsubscribe': '<mailto:unsubscribe@myora.co>',
}
```

However, this has limited support. The Zoho profile picture method is more reliable.

## Recommended Setup

**Best Approach:**
1. ✅ Upload ORA logo to Zoho account profile picture
2. ✅ Create branded email: `hello@myora.co`
3. ✅ Set ORA logo as profile picture for that email
4. ✅ Use Gravatar as backup (same email, same logo)
5. ✅ Set `ZOHO_HELLO_EMAIL=hello@myora.co` in Vercel

## Quick Checklist

- [ ] Deploy to Vercel (so adaptive-icon.png is accessible)
- [ ] Upload adaptive-icon.png to Zoho account profile
- [ ] Create hello@myora.co email in Zoho
- [ ] Set ORA logo as profile for hello@myora.co
- [ ] Create Gravatar account with hello@myora.co
- [ ] Upload ORA logo to Gravatar
- [ ] Test by sending email to yourself
- [ ] Verify avatar appears in Gmail/Outlook

## Testing

After setup:
1. Send test email from admin dashboard
2. Check email in Gmail (web or app)
3. Check email in Outlook
4. Verify ORA logo appears as sender avatar

## Notes

- **Gmail:** Uses Gravatar or Google account picture
- **Outlook:** Uses Microsoft account picture or Gravatar
- **Apple Mail:** Uses Gravatar or contact picture
- **Zoho Profile:** Works for Zoho Mail users
- **Gravatar:** Universal solution that works across most clients

The most reliable way is to set up Gravatar with your sending email address!


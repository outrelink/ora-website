# Zoho Mail Setup Guide

This guide will help you configure Zoho Mail to send emails from the ORA admin panel.

## Step 1: Enable 2-Factor Authentication (2FA)

1. Log in to your Zoho account
2. Go to **Account Settings** → **Security**
3. Enable **Two-Factor Authentication** if not already enabled

## Step 2: Generate App-Specific Password

**Method 1: Through My Account (Recommended)**

1. Log in to [Zoho Accounts](https://accounts.zoho.com/)
2. Click on your **profile picture/avatar** at the top-right corner
3. Select **"My Account"** from the dropdown menu
4. In the left-hand menu, click on **"Security"**
5. Scroll down to find **"App Passwords"** section
6. Click **"Generate New Password"** button
7. Enter a name for the app (e.g., "ORA Admin Panel")
8. Click **"Generate"**
9. **Copy the password immediately** - it's a 16-character password that you won't be able to see again!

**Method 2: Direct Link**

Try going directly to: https://accounts.zoho.com/home#security/app-passwords

**Method 3: Alternative Path**

If you can't find "App Passwords", try:
1. Go to **My Account** → **Security**
2. Look for **"Two-Factor Authentication"** section
3. Click on **"Manage"** or **"Settings"** next to 2FA
4. Look for **"App Passwords"** or **"Application-Specific Passwords"** option

**If App Passwords Still Not Available:**

Some Zoho accounts (especially newer ones or certain regions) may not have the App Passwords feature. In this case, you have two options:

1. **Use your regular Zoho password** (less secure, but works):
   - Set `ZOHO_PASSWORD` to your regular Zoho account password
   - Note: This is less secure and may not work if 2FA is strictly enforced

2. **Contact Zoho Support**:
   - They can help enable App Passwords for your account
   - Or provide guidance on alternative authentication methods

## Step 3: Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

### Required Variables:

- **ZOHO_EMAIL**: Your Zoho email address for SMTP authentication (e.g., `noreply@myora.co`)
- **ZOHO_PASSWORD**: The app-specific password you generated in Step 2

### Optional Variables:

- **ZOHO_FROM_EMAIL**: Email address to send emails from (defaults to ZOHO_EMAIL)
  - Use `support@myora.co` or `help@myora.co` for replyable support emails
  - Users will be able to reply to this address
  - Must be a valid email address in your Zoho account
- **ZOHO_HELLO_EMAIL**: Email address for bulk emails and general communications (optional)
  - Use `hello@myora.co` for bulk emails, newsletters, and general communications
  - If not set, bulk emails will use ZOHO_FROM_EMAIL
  - Must be a valid email address in your Zoho account

### Optional Variables (defaults provided):

- **ZOHO_SMTP_HOST**: 
  - `smtp.zoho.com` (default for US/Global accounts)
  - `smtppro.zoho.eu` (for EU accounts - auto-detected if email contains .eu)
  - You can also set this explicitly if auto-detection doesn't work
- **ZOHO_SMTP_PORT**: `587` (default, for TLS) or `465` (for SSL)

## Step 4: Deploy

After adding the environment variables, redeploy your project:

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

## Testing

1. Go to your admin panel
2. Click on any user's email or use the "Send Email" button
3. Fill in the email form and send a test email
4. Check if the email is received successfully

## Troubleshooting

### Can't Find App Passwords Section
- Make sure 2FA is fully enabled and verified (not just turned on)
- Try the direct link: https://accounts.zoho.com/home#security/app-passwords
- Check if your account type supports App Passwords (some free accounts may not have this feature)
- If using Zoho Mail for a custom domain, you may need to access it through the main Zoho Accounts portal, not the Mail interface
- As a temporary workaround, you can try using your regular password, but this is less secure

### "Authentication failed" error
- If using app-specific password: Make sure you copied the entire 16-character password correctly
- If using regular password: Make sure 2FA allows app passwords, or temporarily disable 2FA for SMTP access
- Verify that `ZOHO_EMAIL` and `ZOHO_PASSWORD` are set correctly in Vercel (no extra spaces)
- Try regenerating the app password if you suspect it was copied incorrectly
- Check that your Zoho account is not locked or suspended

### "Failed to connect to Zoho SMTP server" error
- Verify your Zoho account is active
- Check that your domain is properly configured in Zoho Mail
- Try using port `465` with SSL instead of `587` with TLS

### Email not received
- Check the recipient's spam folder
- Verify the "to" email address is correct
- Check Vercel function logs for detailed error messages

## SMTP Settings Reference

- **Host**: `smtp.zoho.com`
- **Port**: `587` (TLS) or `465` (SSL)
- **Security**: TLS/SSL required
- **Authentication**: Required (use app-specific password)

## Support

If you continue to have issues, check:
1. Vercel function logs for detailed error messages
2. Zoho Mail documentation: https://www.zoho.com/mail/help/zoho-smtp.html
3. Ensure your Zoho account has sending limits configured


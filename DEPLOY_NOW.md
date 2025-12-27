# 🚀 Deploy Changes to Vercel

## Current Status
❌ **Changes are NOT deployed yet** - They're only in your local files

## Quick Deploy (Choose One Method)

### Option 1: Deploy via Git (Recommended - Auto-deploy)

If your Vercel is connected to GitHub, just push:

```bash
cd /Users/zahra/ORA/ORA-website
git add .
git commit -m "Update email templates, App Store links, and website footer"
git push origin main
```

Vercel will automatically deploy! ✅

### Option 2: Deploy via Vercel CLI

```bash
cd /Users/zahra/ORA/ORA-website
vercel --prod
```

## Files That Need to Be Deployed

### Modified Files:
- ✅ `admin.html` - Live preview, App Store URL
- ✅ `index.html` - Footer updates
- ✅ `lib/admin/email-template.js` - Bold text, logo zoom, ombre header
- ✅ `lib/admin/send-email.js` - hello@myora.co for all emails
- ✅ `lib/admin/marketing.js` - hello@myora.co
- ✅ `api/supabase-webhook.js` - Email headers
- ✅ `subscribe.html` - Updates

### New Files:
- ✅ `adaptive-icon.png` - Your logo (needs to be deployed!)
- ✅ `lib/admin/app-store-launch-email.js` - Email template

## After Deployment

1. **Test Email:**
   - Go to https://myora.co/admin.html
   - Send test email
   - Check bold text, logo, App Store badge

2. **Test Website:**
   - Go to https://myora.co
   - Check footer for "Product" link
   - Check "Our Products" is on the right

3. **Test Logo:**
   - Go to https://myora.co/adaptive-icon.png
   - Should see your orange logo

## Quick Deploy Command

Run this now:

```bash
cd /Users/zahra/ORA/ORA-website && git add . && git commit -m "Deploy email updates and App Store integration" && git push origin main
```

Or if you prefer Vercel CLI:

```bash
cd /Users/zahra/ORA/ORA-website && vercel --prod
```

## ⚠️ Important

The `adaptive-icon.png` file MUST be deployed for the email logo to work!


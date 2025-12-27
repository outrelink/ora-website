# Gravatar Troubleshooting - Purple "O" Issue

## Why You're Seeing Purple "O" Instead of Orange Logo

The purple "O" is Gravatar's default placeholder. This means:

1. **Image not uploaded yet** - Most common reason
2. **Image not set as default** - You uploaded but didn't set it as default
3. **Email mismatch** - The email in Gravatar doesn't match your sending email
4. **Propagation delay** - Can take a few minutes to hours to update

## Quick Fix Steps

### Step 1: Verify Image is Uploaded
1. Go to https://gravatar.com
2. Log in
3. Check if you see your ORA logo in "My Gravatars"
4. If not, upload `adaptive-icon.png`

### Step 2: Set as Default
1. In Gravatar, find your uploaded image
2. Click on it
3. Make sure it's rated (G, PG, R, or X)
4. **IMPORTANT:** Click "Set as default" or drag it to the top
5. Save changes

### Step 3: Verify Email Matches
1. Check what email you used in Gravatar
2. Check your Vercel environment variables:
   - `ZOHO_HELLO_EMAIL` (for bulk emails)
   - `ZOHO_FROM_EMAIL` (for regular emails)
3. **They must match exactly!**

### Step 4: Wait for Propagation
- Gravatar updates can take:
  - **5-30 minutes** for most email clients
  - **Up to 24 hours** for some clients
  - Clear your email cache if needed

### Step 5: Test
1. Send test email to yourself
2. Check in Gmail/Outlook
3. If still showing "O", wait a bit longer

## Common Issues

### Issue: "I uploaded but it's still showing O"
**Solution:** Make sure you:
- Set it as **default** avatar
- Rated the image (G, PG, R, or X)
- Used the **exact same email** as your sending email

### Issue: "Email doesn't match"
**Solution:** 
- Create new Gravatar account with correct email
- Or add the email to existing Gravatar account
- Make sure it matches `ZOHO_HELLO_EMAIL` or `ZOHO_FROM_EMAIL`

### Issue: "Still purple after 24 hours"
**Solution:**
- Double-check email matches exactly
- Try clearing browser cache
- Test in different email client
- Verify image is set as default in Gravatar

## Quick Checklist

- [ ] Uploaded `adaptive-icon.png` to Gravatar
- [ ] Set image as **default** avatar
- [ ] Rated the image (G, PG, R, or X)
- [ ] Email in Gravatar matches `ZOHO_HELLO_EMAIL` exactly
- [ ] Waited at least 30 minutes
- [ ] Sent test email
- [ ] Checked in Gmail/Outlook

## Alternative: Use Orange Placeholder

If Gravatar still doesn't work, you can:
1. Go to Gravatar settings
2. Choose a default icon style
3. Some styles are orange/colored
4. Better than purple "O"!

But the best solution is to upload your actual logo and set it as default! 🎨


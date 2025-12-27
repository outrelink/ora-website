# App Store Link Generator

## How to Get Your App Store Link from App ID

If you have your **App ID** (the number), here's how to create the link:

### Format:
```
https://apps.apple.com/app/ora/id[YOUR_APP_ID]
```

### Example:
If your App ID is `1234567890`, your link would be:
```
https://apps.apple.com/app/ora/id1234567890
```

## Quick Steps:

1. **Get your App ID** from App Store Connect
2. **Replace `[YOUR_APP_ID]`** in the link above with your actual App ID
3. **Paste it** in the "App Store URL" field in admin dashboard

## In Admin Dashboard:

1. Go to **Bulk Email** tab
2. Click **"📱 Load App Store Launch Email"**
3. In the **App Store URL** field, paste:
   ```
   https://apps.apple.com/app/ora/id[YOUR_APP_ID]
   ```
4. Replace `[YOUR_APP_ID]` with your actual App ID number

## What It Will Look Like:

When you use `[App Store]` in your email message, it will automatically create:
- ✅ **Official Apple App Store badge** (if App ID is detected)
- ✅ **Professional download button** (if no App ID)
- ✅ **Direct link** to your app in the App Store
- ✅ **Opens in new tab** when clicked

## Testing:

1. Add your App Store URL with App ID
2. Use `[App Store]` in your email message
3. Check the **Live Preview** panel - you'll see the official Apple badge!
4. Send test email to yourself
5. Click the badge - should open App Store directly

## Notes:

- The badge uses Apple's official API
- Works on all email clients
- Looks professional (like other companies)
- Automatically detects App ID from URL


# Deploy ORA Website to Vercel

## Quick Deploy Steps

### Option 1: Deploy via Vercel CLI (Recommended)

```bash
cd /Users/zahra/ORA/ORA-website
vercel --prod
```

### Option 2: Deploy via GitHub (If Connected)

1. Push changes to GitHub
2. Vercel will auto-deploy
3. Or trigger manual deploy in Vercel dashboard

### Option 3: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your ORA project
3. Click **Deployments** tab
4. Click **Redeploy** on latest deployment
5. Or go to **Settings** → **Git** and trigger deploy

## Verify adaptive-icon.png is Accessible

After deployment, test the logo URL:

```bash
# Test in browser or curl
curl -I https://myora.co/adaptive-icon.png
```

Should return: `200 OK`

## Files That Need to Be Deployed

Make sure these files are in your repository:
- ✅ `adaptive-icon.png` (in ORA-website root)
- ✅ All email template files
- ✅ Admin dashboard files

## After Deployment

1. **Test Logo URL:**
   - Open: `https://myora.co/adaptive-icon.png`
   - Should see your orange brushstroke icon

2. **Test Email:**
   - Go to admin dashboard
   - Send test email to yourself
   - Check that logo appears in email header

3. **Verify Everything Works:**
   - Admin login works
   - Email sending works
   - Logo displays correctly

## Troubleshooting

### Logo Not Showing
- Check file exists: `ls -la adaptive-icon.png`
- Check file is committed to git
- Redeploy after adding file
- Clear browser cache

### Deployment Fails
- Check Vercel logs
- Verify all environment variables are set
- Check for build errors


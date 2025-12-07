# Welcome Email Setup Guide

This guide will help you set up automatic welcome emails when users sign up.

## Option 1: Database Trigger (Recommended)

### Step 1: Enable pg_net Extension

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Search for `pg_net` and enable it
4. If `pg_net` is not available, use Option 2 below

### Step 2: Run the SQL Migration

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the SQL from `supabase/migrations/add_welcome_email_trigger.sql`
3. **IMPORTANT:** Replace `https://your-vercel-url.vercel.app/api/supabase-webhook` with your actual Vercel URL
4. Run the SQL

### Step 3: Get Your Vercel URL

Your webhook URL should be:
```
https://your-project-name.vercel.app/api/supabase-webhook
```

You can find your exact URL in:
- Vercel Dashboard → Your Project → Settings → Domains
- Or use the production URL from your latest deployment

## Option 2: Manual Welcome Email (Alternative)

If database triggers don't work, you can send welcome emails manually from the admin panel:

1. Go to Admin Panel → Users
2. Find the new user
3. Click on their email address
4. Send a welcome email manually

## Option 3: Supabase Edge Function (Advanced)

If you prefer using Supabase Edge Functions:

1. Go to **Edge Functions** in Supabase Dashboard
2. Create a new function called `send-welcome-email`
3. Set it to trigger on `auth.users` INSERT events
4. The function will call your Zoho Mail API

## Testing

After setup:

1. Create a test user account
2. Check if welcome email is received
3. Check Vercel function logs if email doesn't arrive:
   - Vercel Dashboard → Deployments → Latest → Functions → View Logs

## Troubleshooting

### Email not sending
- Check Vercel function logs for errors
- Verify `ZOHO_EMAIL` and `ZOHO_PASSWORD` are set in Vercel
- Make sure `ZOHO_FROM_EMAIL` is set (defaults to `ZOHO_EMAIL`)

### Trigger not firing
- Verify the trigger was created: Check Database → Triggers
- Make sure `pg_net` extension is enabled
- Check Supabase logs for errors

### Webhook URL incorrect
- Make sure you replaced the placeholder URL with your actual Vercel URL
- The URL should be: `https://your-project.vercel.app/api/supabase-webhook`


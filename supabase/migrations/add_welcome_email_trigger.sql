-- Create a function to send welcome email via webhook
-- This function will be called when a new user is created

-- First, enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://myora.co/api/supabase-webhook';
  payload JSONB;
BEGIN
  -- Only send for new users (not updates)
  IF TG_OP = 'INSERT' THEN
    -- Build payload
    payload := jsonb_build_object(
      'type', 'user.created',
      'record', jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'raw_user_meta_data', COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      ),
      'user', jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'user_metadata', COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      )
    );

    -- Call webhook asynchronously using pg_net extension if available
    -- Otherwise, we'll use a simpler approach
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := payload::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- Note: You may need to enable this in Supabase dashboard
-- Go to Database → Extensions → Enable pg_net if not already enabled

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_send_welcome_email ON auth.users;

-- Create trigger
CREATE TRIGGER trigger_send_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();


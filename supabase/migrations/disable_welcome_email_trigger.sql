-- Disable automatic welcome email trigger
-- Welcome emails will now be sent from the admin panel

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_send_welcome_email ON auth.users;

-- Drop the function (optional - you can keep it if you want)
-- DROP FUNCTION IF EXISTS send_welcome_email();


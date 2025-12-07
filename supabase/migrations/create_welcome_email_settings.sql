-- Create table for welcome email settings
-- This allows the admin panel to manage welcome email template and auto-send settings

CREATE TABLE IF NOT EXISTS welcome_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT 'Welcome to ORA!',
  message TEXT NOT NULL,
  auto_send BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default welcome email template
INSERT INTO welcome_email_settings (subject, message, auto_send)
VALUES (
  'Welcome to ORA!',
  'Welcome to ORA, {{displayName}}!

Thank you for joining ORA. We''re here to help you manage your creator business and ensure you get paid fairly for your work.

Here''s what you can do with ORA:

• Calculate your rates with our pricing calculator
• Track your deals and payments
• Generate professional quotes and media kits
• Analyze contracts before signing
• Manage your brand partnerships

If you have any questions, feel free to reach out to us.

Best regards,
The ORA Team

---
© 2025 ORA. All rights reserved.
Visit us at https://myora.co',
  true
)
ON CONFLICT DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE welcome_email_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write (for admin panel)
CREATE POLICY "Service role can manage welcome email settings"
  ON welcome_email_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);


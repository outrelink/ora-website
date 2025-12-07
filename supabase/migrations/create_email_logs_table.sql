-- Create email_logs table to track all sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  message_html TEXT,
  email_type TEXT NOT NULL, -- 'individual', 'welcome', 'bulk', 'marketing'
  recipient_type TEXT, -- 'all', 'subscribed', 'free', 'custom' (for bulk emails)
  recipient_count INTEGER DEFAULT 1, -- Number of recipients (1 for individual, >1 for bulk)
  use_html_template BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by TEXT, -- Admin user identifier
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  metadata JSONB, -- Additional metadata (user_id, plan_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (for admin panel)
CREATE POLICY "Service role can manage email logs"
  ON email_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE email_logs IS 'Logs of all emails sent from the admin panel';


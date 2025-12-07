const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    console.error('Supabase credentials missing for waitlist endpoint');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { email } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const metadata = {
      user_agent: req.headers['user-agent'] || null,
      referer: req.headers['referer'] || req.headers['referrer'] || null,
    };

    const { error } = await supabase
      .from('waitlist_signups')
      .insert({
        email: normalizedEmail,
        source: 'website',
        metadata,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // Unique violation
      if (error.code === '23505') {
        return res.status(200).json({
          success: true,
          message: 'You are already on the waitlist!',
        });
      }

      console.error('Waitlist insert error:', error);
      return res.status(500).json({ error: 'Unable to save your email. Please try again later.' });
    }

    return res.status(200).json({
      success: true,
      message: 'You are on the waitlist! We\'ll be in touch soon.',
    });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return res.status(500).json({ error: 'Unexpected server error. Please try again.' });
  }
};


const D24_SUPABASE_URL = 'https://qnyzgbsrtnmylrqptgwo.supabase.co';
const D24_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HvIxbIWb5fHWXsm1PjbEcA_YA_lGbqe';

if (!window.supabase?.createClient) {
  throw new Error('Supabase client failed to load. Check your internet connection and reload the page.');
}

const d24Supabase = window.supabase.createClient(
  D24_SUPABASE_URL,
  D24_SUPABASE_PUBLISHABLE_KEY
);

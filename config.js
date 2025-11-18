const SUPABASE_URL = 'https://edtkpiybplwcnxerixem.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdGtwaXlicGx3Y254ZXJpeGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODEzNDYsImV4cCI6MjA3ODk1NzM0Nn0.Q7Eb_4uGfwUXZAUUbDW-hcA-DARHqtwh1cfQ4ynofow';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };

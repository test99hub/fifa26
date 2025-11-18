const SUPABASE_URL = 'https://wqtvjnkixggpswqvyuaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdHZqbmtpeGdncHN3cXZ5dWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4MzMwNzEsImV4cCI6MjA0NzQwOTA3MX0.xYlWkxJQOkXjYxfV5cQZOdL7gN6mD-0K8L3u5pXH2I4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };

const supabaseUrl = "https://idlihjucxernlbwkndca.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkbGloanVjeGVybmxid2tuZGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTc0NDAsImV4cCI6MjA5NjIzMzQ0MH0.dlbkCbpin2GhnJQgZurgUa0KZqeZx7P3pDukd1ZMFYk";
window.bingoCloud = window.supabase?.createClient(supabaseUrl, supabaseAnonKey) || null;

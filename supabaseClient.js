import { createClient } from "@supabase/supabase-js";

// ใช้เฉพาะ anon public key เท่านั้น ห้ามใช้ service_role / secret key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      // เมื่อมีคนกดเพิ่มเพื่อน (follow) หรือพิมพ์ข้อความเข้าหาส่วนตัว
      if (event.type === 'follow' || event.type === 'message') {
        const userId = event.source?.userId;
        if (userId) {
          // บันทึก User ID ลงตาราง line_users อัตโนมัติ (ถ้ามีอยู่แล้วจะไม่บันทึกซ้ำ)
          await supabase
            .from('line_users')
            .upsert({ user_id: userId }, { onConflict: 'user_id' });
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

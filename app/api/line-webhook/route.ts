import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    // 1. ถ้าเป็นการยิง Verify จาก LINE (events จะเป็นอาเรย์ว่าง []) ให้คืนค่า 200 OK ทันที
    if (events.length === 0) {
      return NextResponse.json({ status: 'verified' }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 2. ถ้ามี Event เพิ่มเพื่อนหรือข้อความยิงเข้ามา ค่อยส่งไปบันทึกลง Supabase
    if (supabaseUrl && supabaseServiceKey) {
      for (const event of events) {
        if (event.type === 'follow' || event.type === 'message') {
          const userId = event.source?.userId;
          if (userId) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/line_users`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify({ user_id: userId }),
              });
            } catch (dbError) {
              console.error('Supabase Error:', dbError);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    // ดัก Error ทั้งหมดเพื่อส่ง 200 กลับหา LINE เสมอ
    return NextResponse.json({ status: 'success', error: error.message }, { status: 200 });
  }
}

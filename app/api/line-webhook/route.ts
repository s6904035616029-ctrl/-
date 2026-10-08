import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ทำงานเมื่อมี Key ครบถ้วน
    if (supabaseUrl && supabaseServiceKey && events.length > 0) {
      for (const event of events) {
        if (event.type === 'follow' || event.type === 'message') {
          const userId = event.source?.userId;
          if (userId) {
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
          }
        }
      }
    }

    // คืนค่า 200 OK กลับไปให้ LINE เสมอเพื่อให้อนุมัติการ Verify
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    // ป้องกันไม่ให้ส่ง 401 หรือ 500 ออกไปหา LINE
    return NextResponse.json({ status: 'success', message: error.message }, { status: 200 });
  }
}

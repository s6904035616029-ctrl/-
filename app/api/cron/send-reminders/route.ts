import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseServiceKey || !lineAccessToken) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const now = new Date().toISOString();

    // 1. ดึงข้อมูลนัดหมายที่ถึงเวลาแจ้งเตือนแล้ว และยังไม่ได้ส่งเตือน
    const response = await fetch(
      `${supabaseUrl}/rest/v1/appointments?notify_at=lte.${now}&is_notified=eq.false`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const appointments = await response.json();

    for (const item of appointments) {
      // 2. ยิง Push Message หา LINE User รายบุคคล
      const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineAccessToken}`,
        },
        body: JSON.stringify({
          to: item.user_id,
          messages: [
            {
              type: 'text',
              text: `⏰ แจ้งเตือนนัดหมาย/ทานยา:\n📌 ${item.title}`,
            },
          ],
        }),
      });

      // 3. ปรับสถานะ is_notified เป็น true เพื่อไม่ให้ส่งซ้ำ
      if (pushRes.ok) {
        await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ is_notified: true }),
        });
      }
    }

    return NextResponse.json({ status: 'success', sentCount: appointments.length }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    for (const event of events) {
      if (event.type === 'follow' || event.type === 'message') {
        const userId = event.source?.userId;
        if (userId) {
          // ยิงเข้า Supabase REST API โดยตรงเพื่อความเสถียรสูงสุด
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

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Prisma client ne global scope ma rakhiye jethi connection reuse thay
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const phone = message.from;
      console.log("Processing message from:", phone);

      // 1. DATABASE SAVE
      try {
        // Upsert logic with timeout
        await Promise.race([
          prisma.customer.upsert({
            where: { phone: phone },
            update: { name: "WhatsApp Active" },
            create: { phone: phone, name: "New WhatsApp Lead" }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 5000))
        ]);
        console.log("✅ DB SUCCESS");
      } catch (dbError: any) {
        console.error("❌ DATABASE ERROR:", dbError.message);
        // Database fail thay to pan reply to javoj joie, etle ahiya stop nahi kariye
      }

      // 2. WHATSAPP REPLY
      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_ID;

      const whatsappRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: "Namaste! Tamara solar quotation mate amara expert sampark karse." }
        }),
      });

      const waData = await whatsappRes.json();
      console.log("WhatsApp Status:", whatsappRes.status);
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('hub.verify_token') === 'MY_SOLAR_TOKEN') {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Error', { status: 403 });
}
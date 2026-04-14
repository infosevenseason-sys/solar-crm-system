import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  console.log("Webhook received!");
  try {
    const body = await req.json();
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const phone = message.from;

      // 1. DATABASE SAVE (With Force Connect & Detailed Error)
      try {
        console.log("Attempting DB connection...");
        await prisma.$connect(); // Force connection
        
        const result = await prisma.customer.upsert({
          where: { phone: phone },
          update: { name: "WhatsApp Active" },
          create: { phone: phone, name: "New WhatsApp Lead" }
        });
        
        console.log("✅ DB SUCCESS:", result);
      } catch (dbError: any) {
        // Aa line tamane sachi error batavse logs ma
        console.error("❌ DATABASE FAIL:", dbError.message || dbError);
      } finally {
        await prisma.$disconnect();
      }

      // 2. WHATSAPP REPLY (Aa perfect chale j che)
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
          text: { body: "Namaste! Solar CRM ma tamaru swagat che." }
        }),
      });

      const waData = await whatsappRes.json();
      console.log("WhatsApp API Status:", whatsappRes.status, waData);
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('hub.verify_token') === 'MY_SOLAR_TOKEN') {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Error', { status: 403 });
}
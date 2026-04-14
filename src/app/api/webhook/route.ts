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

      // 1. DATABASE SAVE (Separate Try-Catch)
      try {
        await prisma.customer.upsert({
          where: { phone: phone },
          update: { name: "Active User" },
          create: { phone: phone, name: "WhatsApp Lead" }
        });
        console.log("DB Success for:", phone);
      } catch (dbError) {
        console.error("DATABASE FAIL BUT CONTINUING:", dbError);
      }

      // 2. WHATSAPP REPLY (Aa javuj joie)
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
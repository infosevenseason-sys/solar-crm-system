import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// WhatsApp Verify karva mate (GET method)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Aa token tame Meta Developer portal ma nakhsho e j hovo joie
  if (mode === 'subscribe' && token === 'MY_SOLAR_TOKEN') {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Error', { status: 403 });
}

// WhatsApp Message ave tyare (POST method)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const phone = message.from; // Customer no number
      const text = message.text?.body; // Message no text

      // Database ma entry save karo
      await prisma.customer.upsert({
        where: { phone: phone },
        update: { name: "WhatsApp Lead" }, // Jo number hoy to update karo
        create: {
          phone: phone,
          name: "New WhatsApp Lead",
        },
      });
      console.log(`New lead saved: ${phone}`);
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    return new NextResponse('Error', { status: 500 });
  }
}
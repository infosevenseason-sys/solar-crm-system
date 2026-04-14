import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. WhatsApp Webhook Verification (Meta mate)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Aa 'MY_SOLAR_TOKEN' tame Meta Dashboard na Configuration ma verify token ma nakhsho
  if (mode === 'subscribe' && token === 'MY_SOLAR_TOKEN') {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Verification Failed', { status: 403 });
}

// 2. Incoming WhatsApp Message Handling
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // WhatsApp message ni details kadhvi
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const customerPhone = message.from; // Customer no WhatsApp number
      const customerText = message.text.body; // Customer e moklelo message

      // Step A: Database (Supabase) ma entry save/update karo
      await prisma.customer.upsert({
        where: { phone: customerPhone },
        update: { 
          // Jo customer already hoy to update karo
          name: "Active WhatsApp Lead" 
        },
        create: {
          phone: customerPhone,
          name: "New WhatsApp Lead",
        },
      });

      console.log(`Lead Captured: ${customerPhone}`);

      // Step B: Automatic WhatsApp Reply moklo
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_ID;

      if (accessToken && phoneId) {
        await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: customerPhone,
            type: "text",
            text: { 
              body: "Namaste! 🙏 Solar CRM ma tamaru swagat che. Amara solar expert jald thi tamaro sampark karse." 
            },
          }),
        });
        console.log("Reply sent successfully!");
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
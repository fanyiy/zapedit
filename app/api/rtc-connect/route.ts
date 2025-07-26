export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    const body = await req.text();
    const url = new URL('https://api.openai.com/v1/realtime');
    url.searchParams.set('model', 'gpt-4o-realtime-preview-2024-12-17');
    url.searchParams.set('instructions', 'You are an AI image editing assistant with voice capabilities. You can see and edit the user\'s current image using the available tools. Be conversational and helpful.');
    url.searchParams.set('voice', 'ash');

    const response = await fetch(url.toString(), {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/sdp',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(`OpenAI API error: ${response.status} - ${error}`, { status: response.status });
    }

    const sdp = await response.text();
    return new Response(sdp, {
      headers: {
        'Content-Type': 'application/sdp',
      },
    });
  } catch (error) {
    console.error('RTC connection error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
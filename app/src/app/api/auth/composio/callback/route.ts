import { NextRequest, NextResponse } from 'next/server';

// Composio redirects back here after OAuth completion.
// We just redirect the user back to the connections page with a success indicator.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const toolkit = searchParams.get('toolkit') || 'unknown';

  // Composio handles the token exchange internally.
  // By the time we get this callback, the connection should be ACTIVE
  // (or will become ACTIVE shortly -- the frontend polls for status).
  return NextResponse.redirect(
    `${origin}/settings/connections?composio_connected=${toolkit}`
  );
}

/**
 * Debug SECRET_HASH calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, clientId, clientSecret } = body;

    if (!username || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'username, clientId, and clientSecret are required' },
        { status: 400 }
      );
    }

    // Generate SECRET_HASH with correct formula
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', clientSecret); // clientSecret is the KEY
    hmac.update(message); // username + clientId is the MESSAGE
    const secretHash = hmac.digest('base64');

    return NextResponse.json({
      type: 'success',
      data: {
        username,
        clientId,
        message,
        secretHash,
        hashLength: secretHash.length
      }
    });
  } catch (error) {
    console.error('Debug secret hash error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        type: 'error'
      },
      { status: 500 }
    );
  }
}

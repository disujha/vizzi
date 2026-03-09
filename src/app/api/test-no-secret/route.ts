/**
 * Test Cognito without SECRET_HASH to isolate the issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, clientId, useSecretHash } = body;

    if (!username || !clientId) {
      return NextResponse.json(
        { error: 'username and clientId are required' },
        { status: 400 }
      );
    }

    const client = new CognitoIdentityProviderClient({
      region: 'us-east-1'
    });

    // Test without SECRET_HASH first
    const params: any = {
      AuthFlow: 'CUSTOM_AUTH' as const,
      ClientId: clientId,
      AuthParameters: {
        USERNAME: username
      }
    };

    // Add SECRET_HASH if requested
    if (useSecretHash) {
      const crypto = require('crypto');
      const clientSecret = '6r4ihia5ehfefpgc8nfmi50cdv--1772967046211';
      const message = username + clientId;
      const hmac = crypto.createHmac('sha256', clientSecret);
      hmac.update(message);
      const secretHash = hmac.digest('base64');
      
      params.AuthParameters.SECRET_HASH = secretHash;
    }

    const command = new InitiateAuthCommand(params);
    const response = await client.send(command);

    return NextResponse.json({
      type: 'success',
      message: 'Cognito call successful',
      useSecretHash,
      response: {
        ChallengeName: response.ChallengeName,
        Session: response.Session,
        hasAuthenticationResult: !!response.AuthenticationResult
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      type: 'error',
      message: 'Cognito call failed',
      error: {
        name: error.name,
        message: error.message,
        code: error.__type
      }
    });
  }
}

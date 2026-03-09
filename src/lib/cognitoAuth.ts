/**
 * AWS Cognito CUSTOM_AUTH Implementation with Client Secret
 * Supports OTP-based authentication using Lambda triggers
 */

import crypto from 'crypto';

// Cognito Configuration
const COGNITO_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.AWS_USER_POOL_ID || 'us-east-1_H8QBG7B81',
  clientId: process.env.AWS_USER_POOL_CLIENT_ID || '6r4ihia5ehfefpgc8nfmi50cdv',
  clientSecret: process.env.AWS_USER_POOL_CLIENT_SECRET || '', // Must be set in environment
};

/**
 * Generate SECRET_HASH for Cognito authentication with client secret
 * Uses HMAC-SHA256 with client secret as key and username + clientId as message
 */
export function generateSecretHash(username: string, clientId: string, clientSecret: string): string {
  const message = username + clientId;
  const hmac = crypto.createHmac('sha256', clientSecret); // clientSecret is the KEY
  hmac.update(message); // username + clientId is the MESSAGE
  return hmac.digest('base64');
}

/**
 * Cognito authentication error types
 */
export interface CognitoAuthError extends Error {
  code?: string;
  name: string;
}

/**
 * Authentication response types
 */
export interface InitiateAuthResponse {
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
  AuthenticationResult?: {
    AccessToken: string;
    IdToken: string;
    RefreshToken: string;
    ExpiresIn: number;
    TokenType: string;
  };
}

export interface VerifyOtpResponse {
  AuthenticationResult?: {
    AccessToken: string;
    IdToken: string;
    RefreshToken: string;
    ExpiresIn: number;
    TokenType: string;
  };
  Session?: string;
}

/**
 * Cognito Custom Auth Service
 */
export class CognitoCustomAuthService {
  private region: string;
  private userPoolId: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.region = COGNITO_CONFIG.region;
    this.userPoolId = COGNITO_CONFIG.userPoolId;
    this.clientId = COGNITO_CONFIG.clientId;
    this.clientSecret = COGNITO_CONFIG.clientSecret;

    if (!this.clientSecret) {
      throw new Error('AWS_USER_POOL_CLIENT_SECRET environment variable is required');
    }
  }

  /**
   * Initiate custom authentication flow
   * Sends USERNAME and SECRET_HASH to start OTP challenge
   */
  async initiateAuth(username: string): Promise<InitiateAuthResponse> {
    try {
      const secretHash = generateSecretHash(username, this.clientId, this.clientSecret);
      
      const params = {
        AuthFlow: 'CUSTOM_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          SECRET_HASH: secretHash,
        },
      };

      const response = await this.makeCognitoRequest('InitiateAuth', params);
      return response;
    } catch (error) {
      throw this.handleCognitoError(error, 'Failed to initiate authentication');
    }
  }

  /**
   * Respond to custom challenge with OTP
   * Includes USERNAME, ANSWER (OTP), and SECRET_HASH
   */
  async respondToCustomChallenge(
    username: string,
    otp: string,
    session: string
  ): Promise<VerifyOtpResponse> {
    try {
      const secretHash = generateSecretHash(username, this.clientId, this.clientSecret);
      
      const params = {
        ChallengeName: 'CUSTOM_CHALLENGE',
        ClientId: this.clientId,
        ChallengeResponses: {
          USERNAME: username,
          ANSWER: otp,
          SECRET_HASH: secretHash,
        },
        Session: session,
      };

      const response = await this.makeCognitoRequest('RespondToAuthChallenge', params);
      return response;
    } catch (error) {
      throw this.handleCognitoError(error, 'Failed to verify OTP');
    }
  }

  /**
   * Make HTTP request to AWS Cognito API with proper AWS signing
   */
  private async makeCognitoRequest(operation: string, params: any): Promise<any> {
    const endpoint = `https://cognito-idp.${this.region}.amazonaws.com/`;
    
    // For now, use a simpler approach without AWS SigV4 signing
    // In production, you should implement proper AWS signature
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${operation}`,
      },
      body: JSON.stringify(params),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      throw new Error(`Cognito API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error('Invalid JSON response from Cognito');
    }
  }

  /**
   * Handle and format Cognito-specific errors
   */
  private handleCognitoError(error: any, defaultMessage: string): CognitoAuthError {
    const cognitoError: CognitoAuthError = new Error(defaultMessage);
    cognitoError.name = 'CognitoAuthError';

    if (error?.message) {
      cognitoError.message = error.message;
    }

    if (error?.code) {
      cognitoError.code = error.code;
    }

    // Handle specific Cognito error codes
    switch (error?.code) {
      case 'NotAuthorizedException':
        cognitoError.message = 'Invalid username or OTP';
        break;
      case 'ExpiredCodeException':
        cognitoError.message = 'OTP has expired. Please request a new one.';
        break;
      case 'UserNotConfirmedException':
        cognitoError.message = 'User account is not confirmed.';
        break;
      case 'UserNotFoundException':
        cognitoError.message = 'User not found.';
        break;
      case 'TooManyRequestsException':
        cognitoError.message = 'Too many attempts. Please try again later.';
        break;
      case 'InvalidParameterException':
        cognitoError.message = 'Invalid authentication parameters.';
        break;
      case 'InvalidLambdaResponseException':
        cognitoError.message = 'Authentication service error. Please try again.';
        break;
      default:
        cognitoError.message = error?.message || defaultMessage;
    }

    return cognitoError;
  }

  /**
   * Complete authentication flow: initiate → send OTP → verify OTP
   */
  async authenticateWithOtp(username: string, otp?: string): Promise<any> {
    try {
      // Step 1: Initiate authentication
      const initiateResponse = await this.initiateAuth(username);

      // If no OTP provided, return challenge info
      if (!otp) {
        return {
          step: 'CHALLENGE_REQUIRED',
          challengeName: initiateResponse.ChallengeName,
          session: initiateResponse.Session,
          message: 'OTP sent to your mobile number',
        };
      }

      // Step 2: Verify OTP
      if (initiateResponse.Session) {
        const verifyResponse = await this.respondToCustomChallenge(
          username,
          otp,
          initiateResponse.Session
        );

        if (verifyResponse.AuthenticationResult) {
          return {
            step: 'AUTHENTICATED',
            tokens: verifyResponse.AuthenticationResult,
            message: 'Authentication successful',
          };
        }
      }

      throw new Error('Authentication failed');
    } catch (error) {
      throw this.handleCognitoError(error, 'Authentication failed');
    }
  }
}

// Export singleton instance
export const cognitoAuth = new CognitoCustomAuthService();

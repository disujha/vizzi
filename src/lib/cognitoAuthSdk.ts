/**
 * AWS Cognito CUSTOM_AUTH Implementation using AWS SDK
 * Supports OTP-based authentication using Lambda triggers
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from '@aws-sdk/client-cognito-identity-provider';
import crypto from "crypto";

// Cognito Configuration
// Note: Using NEXT_PUBLIC_ prefix to avoid AWS Amplify's reserved "AWS_" prefix restriction
const COGNITO_CONFIG = {
  region: process.env.COGNITO_REGION || process.env.AWS_REGION || 'ap-south-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID || process.env.AWS_USER_POOL_ID || 'ap-south-1_0byWYlztF',
  clientId: process.env.COGNITO_CLIENT_ID || process.env.AWS_USER_POOL_CLIENT_ID || '6r4ihia5ehfefpgc8nfmi50cdv',
  clientSecret: process.env.COGNITO_CLIENT_SECRET || process.env.AWS_USER_POOL_CLIENT_SECRET || '', // Must be set in environment
};

export function generateSecretHash(username: string, clientId: string, clientSecret: string): string {
  return crypto
    .createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
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
  ChallengeName?: string | undefined;
  Session?: string | undefined;
  ChallengeParameters?: Record<string, string> | undefined;
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  } | undefined;
}

export interface VerifyOtpResponse {
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  } | undefined;
  Session?: string | undefined;
}

/**
 * Cognito Custom Auth Service using AWS SDK
 */
export class CognitoCustomAuthService {
  private client: CognitoIdentityProviderClient;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = COGNITO_CONFIG.clientId;
    this.clientSecret = COGNITO_CONFIG.clientSecret;

    // Client secret is optional - only needed for confidential clients
    // Public clients (like mobile/web apps) don't need a secret
    console.log('Cognito client initialized:', {
      clientId: this.clientId,
      hasSecret: !!this.clientSecret,
      region: COGNITO_CONFIG.region
    });

    // Initialize Cognito client with credentials
    const clientConfig: any = {
      region: COGNITO_CONFIG.region,
    };

    // Add credentials if available (required for Cognito operations)
    const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.client = new CognitoIdentityProviderClient(clientConfig);
  }

  /**
   * Initiate custom authentication flow
   * Sends USERNAME and optionally SECRET_HASH to start OTP challenge
   */
  async initiateAuth(username: string): Promise<InitiateAuthResponse> {
    try {
      const authParameters: Record<string, string> = {
        USERNAME: username,
      };

      // Only add SECRET_HASH if client secret is configured
      if (this.clientSecret) {
        authParameters.SECRET_HASH = generateSecretHash(username, this.clientId, this.clientSecret);
      }
      
      const command = new InitiateAuthCommand({
        AuthFlow: 'CUSTOM_AUTH',
        ClientId: this.clientId,
        AuthParameters: authParameters,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw this.handleCognitoError(error, 'Failed to initiate authentication');
    }
  }

  /**
   * Respond to custom challenge with OTP
   * Includes USERNAME, ANSWER (OTP), and optionally SECRET_HASH
   */
  async respondToCustomChallenge(
    username: string,
    otp: string,
    session: string
  ): Promise<VerifyOtpResponse> {
    try {
      const challengeResponses: Record<string, string> = {
        USERNAME: username,
        ANSWER: otp,
      };

      // Only add SECRET_HASH if client secret is configured
      if (this.clientSecret) {
        challengeResponses.SECRET_HASH = generateSecretHash(username, this.clientId, this.clientSecret);
      }
      
      const command = new RespondToAuthChallengeCommand({
        ChallengeName: 'CUSTOM_CHALLENGE',
        ClientId: this.clientId,
        ChallengeResponses: challengeResponses,
        Session: session,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw this.handleCognitoError(error, 'Failed to verify OTP');
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

    if (error?.name) {
      cognitoError.code = error.name;
    }

    // Handle specific Cognito error codes
    switch (error?.name) {
      case 'NotAuthorizedException':
        cognitoError.message = 'Invalid username, OTP, or secret hash';
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

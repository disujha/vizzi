import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

let configured = false;

export function configureAmplify() {
    if (configured) return;
    
    // Use API_KEY for public access since Cognito tokens aren't available
    // The schema supports both API_KEY and Cognito authentication
    // If API_KEY doesn't work, the app falls back to localStorage/Firebase
    Amplify.configure({
        API: {
            GraphQL: {
                endpoint: outputs.data.url,
                region: outputs.data.aws_region,
                defaultAuthMode: "apiKey",
                apiKey: outputs.data.api_key,
            },
        },
        Auth: {
            Cognito: {
                userPoolId: outputs.auth.user_pool_id,
                userPoolClientId: outputs.auth.user_pool_client_id,
                identityPoolId: outputs.auth.identity_pool_id,
            },
        },
    }, {
        ssr: true
    });
    
    configured = true;
    console.log("[Amplify] Configured with API_KEY auth mode");
}

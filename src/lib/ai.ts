import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Bedrock configuration
// Note: Using BEDROCK_ prefix to avoid AWS Amplify's reserved "AWS_" prefix restriction
const bedrockConfig: ConstructorParameters<typeof BedrockRuntimeClient>[0] = {
    region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "ap-south-1",
};

const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

if (accessKeyId && secretAccessKey) {
    bedrockConfig.credentials = {
        accessKeyId,
        secretAccessKey,
    };
}

const client = new BedrockRuntimeClient(bedrockConfig);

export async function generateAIContent(prompt: string) {
    try {
        const input = {
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 500,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            }),
        };

        const command = new InvokeModelCommand(input);
        const response = await client.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        return result.content[0].text;
    } catch (error) {
        console.error("Bedrock AI Error:", error);
        return null;
    }
}

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockConfig: ConstructorParameters<typeof BedrockRuntimeClient>[0] = {
    region: process.env.AWS_REGION || "ap-south-1",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    bedrockConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
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

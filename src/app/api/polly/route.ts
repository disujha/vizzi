import { NextRequest, NextResponse } from "next/server";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const pollyConfig: ConstructorParameters<typeof PollyClient>[0] = {
    region: process.env.AWS_REGION || "ap-south-1",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    pollyConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const pollyClient = new PollyClient(pollyConfig);

export async function POST(req: NextRequest) {
    try {
        const { text, voiceId = "Aditi", languageCode } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const command = new SynthesizeSpeechCommand({
            Text: text,
            OutputFormat: "mp3",
            VoiceId: voiceId,
            LanguageCode: languageCode || undefined,
        });

        const response = await pollyClient.send(command);

        if (!response.AudioStream) {
            throw new Error("Failed to generate audio stream");
        }

        // Convert the stream to a buffer
        const audioBuffer = await response.AudioStream.transformToByteArray();

        return new NextResponse(Buffer.from(audioBuffer), {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
            },
        });
    } catch (error: unknown) {
        const e = error as { message?: string };
        console.error("Polly Error:", error);
        return NextResponse.json({ error: e.message || "Failed to synthesize speech" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai";

export async function POST(req: Request) {
    try {
        const { prompt, type } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Add context based on type if needed
        let fullPrompt = prompt;
        if (type === "operational_suggestion") {
            fullPrompt = `As a clinic operations expert, analyze this queue data and provide one short, actionable suggestion (max 15 words) for the doctor: ${prompt}`;
        } else if (type === "kiosk_message") {
            fullPrompt = `Generate a friendly, reassuring 1-sentence queue message for a patient based on this: ${prompt}`;
        } else if (type === "analytics_insight") {
            fullPrompt = `Summarize these clinic operational patterns in 3 bullet points: ${prompt}`;
        }

        const content = await generateAIContent(fullPrompt);
        return NextResponse.json({ content });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

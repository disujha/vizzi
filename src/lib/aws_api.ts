/**
 * Utility for interacting with AWS API Gateway for AI Kiosk check-ins.
 */

const API_ENDPOINT = "https://your-api-gateway-id.execute-api.region.amazonaws.com/prod/check-in";

export type AiCheckInPayload = {
    clinicId: string;
    name: string;
    mobile: string;
    complaint: string;
    doctorId?: string;
    doctorPrefix?: string;
};

export async function submitAiCheckIn(payload: AiCheckInPayload) {
    const IS_DEV = typeof window !== "undefined" && (window.location.hostname === "localhost" || process.env.NODE_ENV === "development");

    if (IS_DEV || API_ENDPOINT.includes("your-api-gateway-id")) {
        console.warn("[AI API] Using mock response (Development Mode or Missing Endpoint)");
        return new Promise((resolve) => {
            setTimeout(() => {
                // Use the provided doctorPrefix, or fallback to the hardcoded 'B' for Dr. Banerjee, or default to 'A'
                let prefix = payload.doctorPrefix || "A";

                // Keep the legacy mock logic for specific doctor ID if prefix not provided
                if (!payload.doctorPrefix && payload.doctorId && payload.doctorId.includes('i08nq2a')) {
                    prefix = "B";
                }

                console.log("[AI API] Using prefix:", prefix, "for doctor:", payload.doctorId);

                resolve({
                    id: `ai-${Date.now()}`,
                    tokenNumber: `${prefix}0${Math.floor(Math.random() * 9) + 1}`,
                    message: "Welcome! You have been checked in by Vizzi AI Assistant."
                });
            }, 1500);
        });
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to submit check-in");
        }

        return await response.json();
    } catch (error) {
        console.error("AI Check-in submission error:", error);
        throw error;
    }
}

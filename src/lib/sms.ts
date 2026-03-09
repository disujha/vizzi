/**
 * SMS Utility using MSG91 for Vizzi AI Kiosk.
 */

const TEMPLATE_TOKEN = "69873367b696d612ef021945"; // For sending token
const TEMPLATE_CALL = "6987340cf7ee6b1663361ec4";  // For calling specific token on turn

export type SmsPayload = {
    mobile: string;
    token?: string;
    name?: string;
    clinicName?: string;
    otp?: string;
    enabled?: boolean;
};

/**
 * Sends a token confirmation SMS via MSG91.
 */
export async function sendTokenSms(payload: SmsPayload) {
    return triggerMsg91(TEMPLATE_TOKEN, payload);
}

/**
 * Sends a turn-calling SMS via MSG91.
 */
export async function sendCallSms(payload: SmsPayload) {
    return triggerMsg91(TEMPLATE_CALL, payload);
}

/**
 * Sends a verification OTP via MSG91.
 */
export async function sendOtpSms(mobile: string) {
    try {
        const response = await fetch("/api/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "sendOtp",
                mobile
            })
        });
        const result = await response.json();
        if (!response.ok) {
            return {
                type: "error",
                message: result?.error || result?.message || `OTP send failed (${response.status})`,
            };
        }
        return result;
    } catch (error) {
        console.error("[SMS] OTP send error:", error);
        return { type: "error", message: "Failed to send OTP" };
    }
}

/**
 * Verifies an OTP via MSG91.
 */
export async function verifyOtpSms(mobile: string, otp: string) {
    try {
        const response = await fetch("/api/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "verifyOtp",
                mobile,
                otp
            })
        });
        const result = await response.json();
        if (!response.ok) {
            return {
                type: "error",
                message: result?.error || result?.message || `OTP verify failed (${response.status})`,
            };
        }
        return result;
    } catch (error) {
        console.error("[SMS] OTP verify error:", error);
        return { type: "error", message: "Failed to verify OTP" };
    }
}

async function triggerMsg91(templateId: string, payload: SmsPayload) {
    try {
        // Non-OTP notification flows follow clinic setting (explicitly enabled).
        const isEnabled = payload.enabled ?? false;

        if (!isEnabled) {
            console.warn(`[SMS] Skipped: Alerts are disabled for ${payload.mobile}`);
            return { type: "skipped", message: "SMS alerts are disabled in settings" };
        }

        // Clean to digits only, then prepend country code 91 if not already present
        const cleanMobile = payload.mobile.replace(/\D/g, "");
        const finalMobile = cleanMobile.startsWith("91") && cleanMobile.length === 12
            ? cleanMobile
            : `91${cleanMobile}`;

        // Use server-side API route to avoid CORS
        const response = await fetch("/api/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                templateId,
                mobile: finalMobile,
                var1: payload.token || "",
                var2: payload.clinicName || "Vizzi AI"
            })
        });

        const result = await response.json();
        console.log(`[SMS] Triggered template ${templateId} for ${finalMobile}:`, result);
        return result;
    } catch (error) {
        console.error("[SMS] Error triggering MSG91:", error);
        return { type: "error", message: "Failed to send SMS" };
    }
}

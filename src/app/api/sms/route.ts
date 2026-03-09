import { NextRequest, NextResponse } from "next/server";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const TEMPLATE_OTP = process.env.MSG91_TEMPLATE_OTP || "";

const normalizeMobile = (mobile: string) => {
    const cleanMobile = mobile.replace(/\D/g, "");
    return cleanMobile.startsWith("91") && cleanMobile.length === 12
        ? cleanMobile
        : `91${cleanMobile}`;
};

export async function POST(req: NextRequest) {
    try {
        if (!MSG91_AUTH_KEY) {
            return NextResponse.json({ error: "Server missing MSG91_AUTH_KEY" }, { status: 500 });
        }
        const { action = "flow", templateId, mobile, var1, var2, otp } = await req.json();

        if (!mobile) {
            return NextResponse.json({ error: "mobile is required" }, { status: 400 });
        }

        const finalMobile = normalizeMobile(mobile);

        if (action === "sendOtp") {
            if (!TEMPLATE_OTP) {
                return NextResponse.json({ error: "Server missing MSG91_TEMPLATE_OTP" }, { status: 500 });
            }
            const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${TEMPLATE_OTP}&mobile=${finalMobile}&authkey=${MSG91_AUTH_KEY}`, {
                method: "POST",
            });
            const result = await response.json();
            return NextResponse.json(result, { status: response.ok ? 200 : response.status });
        }

        if (action === "verifyOtp") {
            if (!otp) {
                return NextResponse.json({ error: "otp is required for verifyOtp" }, { status: 400 });
            }
            const response = await fetch(`https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${finalMobile}&authkey=${MSG91_AUTH_KEY}`, {
                method: "GET",
            });
            const result = await response.json();
            return NextResponse.json(result, { status: response.ok ? 200 : response.status });
        }

        if (!templateId) {
            return NextResponse.json({ error: "templateId is required for flow action" }, { status: 400 });
        }

        const response = await fetch("https://control.msg91.com/api/v5/flow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authkey": MSG91_AUTH_KEY
            },
            body: JSON.stringify({
                template_id: templateId,
                recipients: [
                    {
                        mobiles: finalMobile,
                        var1: var1 || "",
                        var2: var2 || "Vizzi AI"
                    }
                ]
            })
        });

        const result = await response.json();
        console.log(`[SMS API] SUCCESS: template=${templateId} mobile=${finalMobile}`, {
            status: response.status,
            result
        });
        return NextResponse.json(result);
    } catch (error: unknown) {
        const e = error as { message?: string; stack?: string };
        console.error("[SMS API] CRITICAL ERROR:", {
            message: e.message,
            stack: e.stack
        });
        return NextResponse.json({ error: e.message || "Failed to send SMS" }, { status: 500 });
    }
}

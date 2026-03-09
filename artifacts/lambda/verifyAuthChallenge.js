/**
 * Verify Auth Challenge - Handle User Existence Check
 */
const https = require("https");

exports.handler = async (event) => {
  console.log("=== VERIFY AUTH CHALLENGE ===");
  console.log("Event:", JSON.stringify(event, null, 2));
  console.log("User exists:", !event.request.userNotFound);

  const userAnswer = event.request.challengeAnswer;
  const expectedOtp = event.request.privateChallengeParameters?.otp;
  const userExists = event.request.privateChallengeParameters?.userExists;

  console.log("User OTP:", userAnswer);
  console.log("Expected OTP:", expectedOtp);
  console.log("User exists flag:", userExists);

  if (!expectedOtp) {
    console.log("ERROR: No OTP found in privateChallengeParameters");
    event.response.answerCorrect = false;
    return event;
  }

  // If user doesn't exist, always reject
  if (userExists === false) {
    console.log("User does not exist - rejecting verification");
    event.response.answerCorrect = false;
    return event;
  }

  if (expectedOtp === "MSG91_GENERATED") {
    console.log("Using MSG91 verification API");
    
    try {
      // Extract phone number from user attributes
      let mobile = event.request.userAttributes?.phone_number || event.userName;
      
      // Format mobile for MSG91
      if (!mobile.startsWith('91')) {
        mobile = mobile.startsWith('+91') ? mobile.substring(1) : `91${mobile}`;
      }
      
      const isVerified = await verifyOtpViaMsg91(mobile, userAnswer);
      event.response.answerCorrect = isVerified;
      console.log("MSG91 verification result:", isVerified);
    } catch (error) {
      console.error("MSG91 verification error:", error);
      event.response.answerCorrect = false;
    }
    
  } else if (expectedOtp === "USER_NOT_FOUND") {
    console.log("User not found - rejecting verification");
    event.response.answerCorrect = false;
    return event;
    
  } else {
    console.log("Using local verification");
    event.response.answerCorrect = userAnswer === expectedOtp;
    console.log("Local verification result:", event.response.answerCorrect);
  }

  console.log("Final answerCorrect:", event.response.answerCorrect);
  console.log("=== END VERIFY AUTH CHALLENGE ===");
  return event;
};

/**
 * Verify OTP via MSG91 API
 */
async function verifyOtpViaMsg91(mobile, otp) {
  const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;

  const verifyUrl = `https://api.msg91.com/api/v5/otp/verify?mobile=${mobile}&otp=${otp}&authkey=${MSG91_AUTH_KEY}`;

  console.log("MSG91 Verify URL:", verifyUrl);

  return new Promise((resolve, reject) => {
    const req = https.request(verifyUrl, res => {
      let body = "";

      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        console.log("MSG91 verify response:", body);
        
        try {
          const response = JSON.parse(body);
          const isValid = response.type === "success";
          console.log("MSG91 verification success:", isValid, response);
          resolve(isValid);
        } catch (parseError) {
          console.error("Failed to parse MSG91 verify response:", parseError);
          reject(parseError);
        }
      });
    });

    req.on("error", err => {
      console.error("MSG91 verify error:", err);
      reject(err);
    });

    req.end();
  });
}

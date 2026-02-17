import crypto from "crypto";

export default function generateEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    rawToken: token,
    hashedToken: crypto
      .createHash("sha256")
      .update(token)
      .digest("hex"),
    expires: Date.now() + 10 * 60 * 1000, 
  };
};

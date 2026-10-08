const crypto = require("crypto");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    console.error("RAZORPAY_KEY_SECRET is missing.");
    return json(500, { error: "Payment verification is not configured." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json(400, { error: "Missing payment verification fields." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const provided = Buffer.from(razorpay_signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return json(400, { success: false, error: "Payment signature verification failed." });
    }

    return json(200, {
      success: true,
      razorpay_order_id,
      razorpay_payment_id,
    });
  } catch (error) {
    console.error("Razorpay verify-payment error:", error);
    return json(400, { success: false, error: "Invalid verification request." });
  }
};

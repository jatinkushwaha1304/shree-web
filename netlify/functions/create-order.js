const Razorpay = require("razorpay");

const PRICE_PER_UNIT = 1500;
const DISCOUNT_CODES = {
  SAVE100: 100,
  KARTIKEY100: 100,
  KARISHMA100: 100,
  RITU100: 100,
};

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

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Razorpay environment variables are missing.");
    return json(500, { error: "Payment service is not configured." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const quantity = Number(body.quantity);
    const promoCode = String(body.promoCode || "").trim().toUpperCase();

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return json(400, { error: "Invalid quantity." });
    }

    const discount = DISCOUNT_CODES[promoCode] || 0;
    const totalRupees = PRICE_PER_UNIT * quantity - discount;
    const amount = Math.round(totalRupees * 100);

    if (!Number.isInteger(amount) || amount < 100) {
      return json(400, { error: "Amount must be at least ₹1." });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `sj_${Date.now()}`,
      notes: {
        product: "Diacare Powder - 300G",
        quantity: String(quantity),
        promoCode,
      },
    });

    return json(200, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error);

    if (error && (error.statusCode === 401 || error.statusCode === 403)) {
      return json(401, { error: "Razorpay authentication failed." });
    }

    return json(500, { error: "Unable to create Razorpay order." });
  }
};

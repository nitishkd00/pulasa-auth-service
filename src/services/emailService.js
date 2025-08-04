const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({
  region: "ap-south-1", // Mumbai region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Send email using Amazon SES
 */
const sendEmail = async (to, subject, body) => {
  const emailParams = {
    Source: "noreply@pulasa.com", // your verified SES email
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Text: {
          Data: body,
        },
        Html: {
          Data: body.replace(/\n/g, '<br>'), // Convert newlines to HTML breaks
        },
      },
    },
  };

  try {
    const result = await sesClient.send(new SendEmailCommand(emailParams));
    console.log("📧 Email sent successfully:", result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw err;
  }
};

/**
 * Send order status update email
 */
const sendOrderStatusUpdateEmail = async (userEmail, orderNumber, statusLabel, orderDetails) => {
  const subject = `📦 Order Status Update - Order #${orderNumber}`;
  
  const body = `
Dear Valued Customer,

Your order status has been updated!

Order Details:
• Order Number: ${orderNumber}
• New Status: ${statusLabel}
• Updated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${getStatusSpecificMessage(statusLabel)}

Order Summary:
${formatOrderDetails(orderDetails)}

Track Your Order:
You can track your order status anytime by logging into your Pulasa account.

Need Help?
If you have any questions about your order, please contact our customer support.

Thank you for choosing Pulasa!

Best regards,
The Pulasa Team
noreply@pulasa.com

---
This is an automated message. Please do not reply to this email.
  `.trim();

  try {
    return await sendEmail(userEmail, subject, body);
  } catch (error) {
    console.error('❌ Failed to send order status update email:', error);
    throw error;
  }
};

/**
 * Get status-specific message
 */
const getStatusSpecificMessage = (statusLabel) => {
  const messages = {
    'Order Raised': 'Your order has been successfully placed and is being processed.',
    'Order Confirmed': 'Your order has been confirmed and is being prepared for packaging.',
    'Order Packed': 'Your order has been carefully packed and is ready for shipping.',
    'Order Shipped': 'Your order is on its way! You will receive tracking details soon.',
    'Order Delivered': 'Your order has been successfully delivered. Enjoy your Pulasa products!',
    'Order Cancelled': 'Your order has been cancelled. If you have any questions, please contact support.'
  };
  
  return messages[statusLabel] || 'Your order status has been updated.';
};

/**
 * Format order details for email
 */
const formatOrderDetails = (orderDetails) => {
  if (!orderDetails || !orderDetails.products) {
    return '• Order details not available';
  }

  let productsText = '';
  
  // Handle both string and array formats
  let products = orderDetails.products;
  if (typeof products === 'string') {
    try {
      products = JSON.parse(products);
    } catch (error) {
      console.error('Failed to parse products string:', error);
      return '• Order details not available';
    }
  }

  if (Array.isArray(products)) {
    products.forEach((product, index) => {
      productsText += `• ${product.name} - Quantity: ${product.quantity} - Price: ₹${product.price}\n`;
    });
  }

  return productsText || '• Order details not available';
};

module.exports = {
  sendEmail,
  sendOrderStatusUpdateEmail
}; 
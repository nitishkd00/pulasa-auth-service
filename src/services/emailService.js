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
const sendEmail = async (to, subject, body, htmlBody = null) => {
  const emailParams = {
    Source: "noreply@pulasa.com", // your verified SES email
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Text: {
          Data: body,
          Charset: 'UTF-8'
        },
        Html: {
          Data: htmlBody || body.replace(/\n/g, '<br>'), // Use HTML body if provided
          Charset: 'UTF-8'
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
 * Create modern HTML email template
 */
const createHtmlEmail = (userName, orderNumber, statusLabel, orderDetails) => {
  // Your actual Pulasa logo URL
  const logoUrl = 'https://res.cloudinary.com/ddw4avyim/image/upload/v1752650318/WhatsApp_Image_2025-07-16_at_12.47.22_PM_1_eab8kb.jpg';
  const currentDate = new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Pulasa brand colors (matching your app)
  const statusColor = {
    'Order Raised': '#3b82f6',      // Blue-500
    'Order Confirmed': '#10b981',   // Emerald-500
    'Order Packed': '#f59e0b',      // Amber-500
    'Order Shipped': '#8b5cf6',     // Violet-500
    'Order Delivered': '#059669',   // Emerald-600
    'Order Cancelled': '#ef4444'    // Red-500
  };

  const statusBgColor = {
    'Order Raised': '#eff6ff',      // Blue-50
    'Order Confirmed': '#ecfdf5',   // Emerald-50
    'Order Packed': '#fffbeb',      // Amber-50
    'Order Shipped': '#f5f3ff',     // Violet-50
    'Order Delivered': '#ecfdf5',   // Emerald-50
    'Order Cancelled': '#fef2f2'    // Red-50
  };

  const color = statusColor[statusLabel] || '#1e40af';
  const bgColor = statusBgColor[statusLabel] || '#dbeafe';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Update</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center; }
        .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; filter: brightness(0) invert(1); margin-bottom: 15px; }
        .header h1 { color: white; font-size: 24px; font-weight: 600; margin-bottom: 5px; }
        .header p { color: rgba(255,255,255,0.9); font-size: 16px; }
        .content { padding: 30px 20px; }
        .status-card { background: ${bgColor}; border-left: 4px solid ${color}; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
        .status-badge { display: inline-block; background: ${color}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
        .status-title { font-size: 20px; font-weight: 600; color: #1F2937; margin-bottom: 8px; }
        .status-message { color: #6B7280; font-size: 16px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 15px; display: flex; align-items: center; }
        .section-title::before { content: "📋"; margin-right: 8px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
        .detail-label { font-weight: 500; color: #6B7280; }
        .detail-value { font-weight: 600; color: #1F2937; }
        .product-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .product-name { font-weight: 600; color: #1F2937; margin-bottom: 5px; }
        .product-details { display: flex; justify-content: space-between; color: #6B7280; font-size: 14px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .divider { height: 1px; background: #E5E7EB; margin: 30px 0; }
        .contact-info { text-align: center; margin: 20px 0; }
        .contact-link { color: #3b82f6; text-decoration: none; margin: 0 15px; }
        .footer { background: #1F2937; color: white; padding: 20px; text-align: center; font-size: 14px; }
        .footer a { color: #9CA3AF; text-decoration: none; }
        @media (max-width: 600px) {
            .container { margin: 0; }
            .content { padding: 20px 15px; }
            .header { padding: 20px 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${logoUrl}" alt="Pulasa Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="logo-text" style="display: none; font-size: 32px; font-weight: bold; color: white; margin-bottom: 15px;">🐠 PULASA</div>
            <h1>Order Status Update</h1>
            <p>Stay updated with your order progress</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Status Card -->
            <div class="status-card">
                <div class="status-badge">${statusLabel}</div>
                <div class="status-title">${statusLabel === 'Order Cancelled' ? '⚠️ Order Update' : '🎉 Great News!'}</div>
                <div class="status-message">${getStatusSpecificMessage(statusLabel)}</div>
            </div>

            <!-- Order Details -->
            <div class="section">
                <div class="section-title">Order Details</div>
                <div class="detail-row">
                    <span class="detail-label">Order Number:</span>
                    <span class="detail-value">${orderNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Updated On:</span>
                    <span class="detail-value">${currentDate}</span>
                </div>
            </div>

            <!-- Products -->
            <div class="section">
                <div class="section-title" style="content: '🛒';">Your Order</div>
                ${formatOrderDetailsHtml(orderDetails)}
            </div>

            <!-- CTA -->
            <div style="text-align: center;">
                <a href="https://pulasa.com" class="cta-button">Track Your Order</a>
            </div>

            <div class="divider"></div>

            <!-- Contact Info -->
            <div class="contact-info">
                <p style="margin-bottom: 15px; color: #6B7280;">Need Help?</p>
                <a href="mailto:support@pulasa.com" class="contact-link">📧 Email Support</a>
                <a href="tel:+919035151944" class="contact-link" style="text-decoration: none; cursor: pointer;">📞 Call Us (+91 90351 51944)</a>
            </div>

            <p style="text-align: center; color: #6B7280; margin-top: 20px;">
                Thank you for choosing Pulasa! 🐠
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Track your order at <a href="https://pulasa.com">pulasa.com</a></p>
            <p>© 2025 Pulasa. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Format order details for HTML
 */
const formatOrderDetailsHtml = (orderDetails) => {
  if (!orderDetails || !orderDetails.products) return '<p>No product details available</p>';
  
  let products = orderDetails.products;
  if (typeof products === 'string') {
    try {
      products = JSON.parse(products);
    } catch (error) {
      return '<p>Error parsing product details</p>';
    }
  }

  if (!Array.isArray(products)) {
    products = [products];
  }

  return products.map(product => `
    <div class="product-card">
      <div class="product-name">${product.name || 'Product'}</div>
      <table style="width: 100%; margin-top: 12px; border-collapse: collapse;">
        <tr>
          <td style="font-weight: 500; color: #6B7280; padding: 4px 0;">Quantity: ${product.quantity || 1}</td>
          <td style="font-weight: 600; color: #1F2937; padding: 4px 0; text-align: right;">₹${product.price || 0}</td>
        </tr>
      </table>
    </div>
  `).join('');
};

/**
 * Send order status update email
 */
const sendOrderStatusUpdateEmail = async (userEmail, orderNumber, statusLabel, orderDetails) => {
  const subject = `🐠 Pulasa Fish Order [#${orderNumber}] - ${statusLabel}`;
  
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
You can track your order status anytime by logging into your Pulasa account at pulasa.com.

Need Help?
If you have any questions about your order, please contact our customer support.

Thank you for choosing Pulasa!

Best regards,
The Pulasa Team
noreply@pulasa.com

---
This is an automated message. Please do not reply to this email.
  `.trim();

  const htmlBody = createHtmlEmail('Customer', orderNumber, statusLabel, orderDetails);

  try {
    return await sendEmail(userEmail, subject, body, htmlBody);
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
    'Order Cancelled': 'We\'re sorry, but your order has been cancelled. If you have any questions or concerns, please contact our customer support team.'
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

/**
 * Send OTP email for verification
 */
const sendOtpEmail = async (to, otp) => {
  const subject = 'Pulasa Email Verification - Your OTP Code';
  const body = `Your OTP code for Pulasa email verification is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;
  const htmlBody = `<p>Your OTP code for Pulasa email verification is: <b>${otp}</b></p><p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>`;

  try {
    return await sendEmail(to, subject, body, htmlBody);
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendOrderStatusUpdateEmail,
  sendOtpEmail,
  createHtmlEmail,
  formatOrderDetailsHtml
}; 
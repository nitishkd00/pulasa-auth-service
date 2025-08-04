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
const sendEmail = async (to, subject, body, htmlBody) => {
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
          Data: htmlBody || body.replace(/\n/g, '<br>'), // Use HTML body if provided
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

  const htmlBody = createHtmlEmail(userEmail, orderNumber, statusLabel, orderDetails);

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

/**
 * Create modern HTML email template
 */
const createHtmlEmail = (userEmail, orderNumber, statusLabel, orderDetails) => {
  const logoUrl = "https://res.cloudinary.com/ddw4avyim/image/upload/v1752650318/WhatsApp_Image_2025-07-16_at_12.47.22_PM_1_eab8kb.jpg";
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Update</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            text-align: center;
            color: white;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 15px;
            display: block;
            border: 3px solid rgba(255,255,255,0.3);
        }
        
        .header-title {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        
        .content {
            padding: 30px 20px;
        }
        
        .status-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 25px;
        }
        
        .status-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            margin: 10px 0;
            border: 1px solid rgba(255,255,255,0.3);
        }
        
        .order-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .order-number {
            color: #667eea;
            font-weight: 600;
        }
        
        .product-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .product-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .product-details {
            color: #6c757d;
            font-size: 14px;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: transform 0.2s;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #dee2e6, transparent);
            margin: 30px 0;
        }
        
        .social-links {
            margin-top: 15px;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header {
                padding: 20px 15px;
            }
            
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="Pulasa Logo" class="logo">
            <h1 class="header-title">Order Status Update</h1>
        </div>
        
        <div class="content">
            <div class="status-card">
                <h2 style="margin: 0 0 15px 0; font-size: 20px;">🎉 Great News!</h2>
                <div class="status-badge">${statusLabel}</div>
                <p style="margin: 15px 0 0 0; opacity: 0.9;">${getStatusSpecificMessage(statusLabel)}</p>
            </div>
            
            <div class="order-details">
                <h3 style="margin: 0 0 20px 0; color: #2c3e50;">📋 Order Details</h3>
                <p><strong>Order Number:</strong> <span class="order-number">${orderNumber}</span></p>
                <p><strong>Updated On:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
            
            <div class="order-details">
                <h3 style="margin: 0 0 20px 0; color: #2c3e50;">🛒 Your Order</h3>
                ${formatOrderDetailsHtml(orderDetails)}
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="https://pulasa.com" class="button">📱 Track Your Order</a>
            </div>
            
            <div class="divider"></div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 15px 0;"><strong>Need Help?</strong></p>
                <p style="margin: 0; color: #666;">We're here to help! Contact our support team</p>
                <div class="social-links">
                    <a href="mailto:support@pulasa.com">📧 Email Support</a>
                    <a href="tel:+919035151944">📞 Call Us</a>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 12px;">
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #2c3e50;">Thank you for choosing <span style="color: #667eea;">Pulasa</span>! 🐠</p>
            </div>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0; font-size: 14px;">Track your order anytime at <a href="https://pulasa.com">pulasa.com</a></p>
            <p style="margin: 0 0 15px 0; font-size: 12px; opacity: 0.8;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 0; font-size: 12px; opacity: 0.8;">&copy; 2025 Pulasa. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Format order details for HTML email
 */
const formatOrderDetailsHtml = (orderDetails) => {
  if (!orderDetails || !orderDetails.products) {
    return '<p style="color: #6c757d;">Order details not available</p>';
  }

  let productsHtml = '';
  
  // Handle both string and array formats
  let products = orderDetails.products;
  if (typeof products === 'string') {
    try {
      products = JSON.parse(products);
    } catch (error) {
      console.error('Failed to parse products string:', error);
      return '<p style="color: #6c757d;">Order details not available</p>';
    }
  }

  if (Array.isArray(products)) {
    products.forEach((product, index) => {
      productsHtml += `
        <div class="product-card">
          <div class="product-name">${product.name}</div>
          <div class="product-details">Quantity: ${product.quantity} • Price: ₹${product.price}</div>
        </div>
      `;
    });
  }

  return productsHtml || '<p style="color: #6c757d;">Order details not available</p>';
};

module.exports = {
  sendEmail,
  sendOrderStatusUpdateEmail,
  createHtmlEmail,
  formatOrderDetailsHtml
}; 
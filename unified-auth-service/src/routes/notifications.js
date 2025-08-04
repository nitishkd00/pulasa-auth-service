const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { sendOrderStatusUpdateEmail } = require('../services/emailService');

const router = express.Router();

console.log('📧 Notification routes loaded');

// Simple test route without any dependencies
router.get('/test', (req, res) => {
  console.log('📧 Test route hit');
  res.json({ success: true, message: 'Notification routes are working' });
});

// Simple test POST route without authentication
router.post('/test', (req, res) => {
  console.log('📧 Test POST route hit');
  res.json({ success: true, message: 'Notification POST routes are working', body: req.body });
});

// Create notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, type, title, message, orderId, orderNumber, userEmail, orderDetails } = req.body;

    console.log('📧 Creating notification - FULL REQUEST:', {
      userId,
      type,
      title,
      message,
      orderId,
      orderNumber,
      userEmail: userEmail ? 'PRESENT' : 'MISSING',
      orderDetails: orderDetails ? 'PRESENT' : 'MISSING',
      createdBy: req.user?.email,
      bodyKeys: Object.keys(req.body)
    });

    // Save notification to database
    const notification = new Notification({
      user_id: userId,
      type: type || 'order_status_update',
      title,
      message,
      order_id: orderId,
      order_number: orderNumber,
      read: false
    });

    await notification.save();

    console.log('✅ Notification saved to database:', notification);

    // Send email notification for order status updates
    let emailResult = null;
    if (type === 'order_status_update' && orderNumber) {
      try {
        // Try to get user email if not provided
        let emailToUse = userEmail;
        if (!emailToUse && userId) {
          const User = require('../models/User');
          const user = await User.findById(userId);
          if (user && user.email) {
            emailToUse = user.email;
            console.log('📧 Found user email from database:', emailToUse);
          }
        }

        // Try to get order details if not provided
        let orderDetailsToUse = orderDetails;
        if (!orderDetailsToUse && orderId) {
          const Order = require('../models/Order');
          const order = await Order.findById(orderId);
          if (order && order.products) {
            orderDetailsToUse = { products: order.products };
            console.log('📧 Found order details from database:', orderDetailsToUse);
          }
        }

        if (emailToUse) {
          // Extract status label from title (e.g., "📦 Order Status Updated: Order Confirmed" -> "Order Confirmed")
          const statusLabel = title.replace('📦 Order Status Updated: ', '');
          
          console.log('📧 Attempting to send email:', { emailToUse, orderNumber, statusLabel });
          
          emailResult = await sendOrderStatusUpdateEmail(emailToUse, orderNumber, statusLabel, orderDetailsToUse);
          console.log('📧 Email notification sent successfully:', emailResult.messageId);
        } else {
          console.log('⚠️ Email not sent - no user email found');
          emailResult = { success: false, error: 'No user email found' };
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the entire request if email fails
        emailResult = { success: false, error: emailError.message };
      }
    } else {
      console.log('⚠️ Email not sent - missing parameters:', { type, orderNumber: !!orderNumber });
    }

    res.json({
      success: true,
      notification: {
        id: notification._id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        orderId: notification.order_id,
        orderNumber: notification.order_number,
        read: notification.read,
        createdAt: notification.created_at
      },
      emailSent: emailResult?.success || false,
      emailMessageId: emailResult?.messageId
    });
  } catch (error) {
    console.error('❌ Create notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📧 Fetching notifications for user:', req.user?.email);

    // Get notifications for the current user
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(50);

    const formattedNotifications = notifications.map(notification => ({
      id: notification._id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      orderId: notification.order_id,
      orderNumber: notification.order_number,
      read: notification.read,
      createdAt: notification.created_at
    }));

    res.json({
      success: true,
      notifications: formattedNotifications
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📧 Marking notification as read:', { id, user: req.user?.email });

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true, updated_at: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        read: notification.read
      }
    });
  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
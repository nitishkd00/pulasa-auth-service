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
    console.log('🔍 EMAIL DEBUG - Starting email check:', { type, orderNumber, userId, orderId });
    
    if (type === 'order_status_update' && orderNumber) {
      console.log('✅ Email check passed - type and orderNumber present');
      try {
        // Try to get user email if not provided
        let emailToUse = userEmail;
        console.log('🔍 EMAIL DEBUG - Initial emailToUse:', emailToUse);
        
        if (!emailToUse && userId) {
          console.log('🔍 EMAIL DEBUG - userEmail is missing, looking up by userId:', userId);
          const User = require('../models/User');
          console.log('📧 Looking up user by ID:', userId);
          const user = await User.findById(userId);
          console.log('🔍 EMAIL DEBUG - User lookup result:', user ? 'User found' : 'User not found');
          
          if (user && user.email) {
            emailToUse = user.email;
            console.log('✅ EMAIL DEBUG - Found user email from database:', emailToUse);
          } else {
            console.log('❌ EMAIL DEBUG - User not found or no email for ID:', userId);
            // Try to find user by email if we have orderId
            if (orderId) {
              console.log('🔍 EMAIL DEBUG - Trying fallback: lookup user from orderId:', orderId);
              const Order = require('../models/Order');
              const order = await Order.findById(orderId);
              console.log('🔍 EMAIL DEBUG - Order lookup result:', order ? 'Order found' : 'Order not found');
              
              if (order && order.user_id) {
                console.log('📧 Trying to find user from order:', order.user_id);
                const orderUser = await User.findById(order.user_id);
                console.log('🔍 EMAIL DEBUG - Order user lookup result:', orderUser ? 'User found' : 'User not found');
                
                if (orderUser && orderUser.email) {
                  emailToUse = orderUser.email;
                  console.log('✅ EMAIL DEBUG - Found user email from order:', emailToUse);
                } else {
                  console.log('❌ EMAIL DEBUG - Order user not found or no email');
                }
              } else {
                console.log('❌ EMAIL DEBUG - Order not found or no user_id');
              }
            } else {
              console.log('❌ EMAIL DEBUG - No orderId provided for fallback');
            }
          }
        } else if (emailToUse) {
          console.log('✅ EMAIL DEBUG - userEmail was provided:', emailToUse);
        } else {
          console.log('❌ EMAIL DEBUG - No userId provided and no userEmail');
        }

        // Try to get order details if not provided
        let orderDetailsToUse = orderDetails;
        console.log('🔍 EMAIL DEBUG - Initial orderDetailsToUse:', orderDetailsToUse ? 'Present' : 'Missing');
        
        if (!orderDetailsToUse && orderId) {
          console.log('🔍 EMAIL DEBUG - orderDetails missing, looking up by orderId:', orderId);
          const Order = require('../models/Order');
          const order = await Order.findById(orderId);
          console.log('🔍 EMAIL DEBUG - Order lookup for details result:', order ? 'Order found' : 'Order not found');
          
          if (order && order.products) {
            orderDetailsToUse = { products: order.products };
            console.log('✅ EMAIL DEBUG - Found order details from database:', orderDetailsToUse);
          } else {
            console.log('❌ EMAIL DEBUG - Order not found or no products');
          }
        }

        console.log('🔍 EMAIL DEBUG - Final emailToUse:', emailToUse);
        console.log('🔍 EMAIL DEBUG - Final orderDetailsToUse:', orderDetailsToUse ? 'Present' : 'Missing');

        if (emailToUse) {
          // Extract status label from title (e.g., "📦 Order Status Updated: Order Confirmed" -> "Order Confirmed")
          const statusLabel = title.replace('📦 Order Status Updated: ', '');
          
          console.log('📧 Attempting to send email:', { emailToUse, orderNumber, statusLabel });
          
          emailResult = await sendOrderStatusUpdateEmail(emailToUse, orderNumber, statusLabel, orderDetailsToUse);
          console.log('✅ EMAIL DEBUG - Email sent successfully:', emailResult.messageId);
        } else {
          console.log('❌ EMAIL DEBUG - Email not sent - no user email found');
          emailResult = { success: false, error: 'No user email found' };
        }
      } catch (emailError) {
        console.error('❌ EMAIL DEBUG - Failed to send email notification:', emailError);
        // Don't fail the entire request if email fails
        emailResult = { success: false, error: emailError.message };
      }
    } else {
      console.log('❌ EMAIL DEBUG - Email not sent - missing parameters:', { type, orderNumber: !!orderNumber });
    }
    
    console.log('🔍 EMAIL DEBUG - Final emailResult:', emailResult);

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
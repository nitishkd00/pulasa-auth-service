const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');

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
    const { userId, type, title, message, orderId, orderNumber } = req.body;

    console.log('📧 Creating notification:', {
      userId,
      type,
      title,
      message,
      orderId,
      orderNumber,
      createdBy: req.user?.email
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
      }
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
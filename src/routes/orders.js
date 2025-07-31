const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const Counter = require('../models/Counter');

const router = express.Router();

// Get all orders (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      });
    }

    const orders = await Order.find({})
      .sort({ created_at: -1 });

    const formattedOrders = orders.map(order => ({
      id: order._id,
      user_id: order.user_id,
      amount: order.amount,
      order_number: order.order_number,
      products: order.products, // Now stored as array of product objects
      address: order.address,
      first_name: order.first_name,
      last_name: order.last_name,
      phone: order.phone,
      city: order.city,
      state: order.state,
      zip: order.zip,
      status: order.status,
      upi_reference: order.upi_reference,
      created_at: order.created_at,
      updated_at: order.updated_at
    }));

    res.json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id })
      .sort({ created_at: -1 });

    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is admin or the order owner
    if (!req.user.is_admin && order.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new order
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Creating order with data:', {
      user_id: req.user.id,
      amount: req.body.amount,
      products: req.body.products,
      address: req.body.address,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      upi_reference: req.body.upi_reference
    });

    const {
      amount,
      products,
      address,
      first_name,
      last_name,
      phone,
      city,
      state,
      zip,
      upi_reference
    } = req.body;

    // Validate required fields
    if (!amount || !products || !Array.isArray(products) || products.length === 0) {
      console.log('❌ Validation failed:', { amount, products });
      return res.status(400).json({
        success: false,
        error: 'Amount and products array are required'
      });
    }

    // Generate auto-incrementing order number with fallback
    let orderNumber;
    try {
      const counter = await Counter.findByIdAndUpdate(
        'orderNumber',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      orderNumber = `P${String(counter.seq).padStart(6, '0')}`;
    } catch (error) {
      console.log('⚠️ Counter failed, using fallback method');
      // Fallback: count existing orders and add 1
      const orderCount = await Order.countDocuments();
      orderNumber = `P${String(orderCount + 1).padStart(6, '0')}`;
    }
    console.log(`📝 Generated order number: ${orderNumber}`);

    const order = new Order({
      user_id: req.user.id,
      amount,
      order_number: orderNumber,
      products,
      address,
      first_name,
      last_name,
      phone,
      city,
      state,
      zip,
      upi_reference,
      status: 'pending'
    });

    console.log('💾 Saving order to database...');
    await order.save();
    console.log('✅ Order saved successfully:', order.order_number);

    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation failed: ' + Object.values(error.errors).map(e => e.message).join(', ');
    } else if (error.code === 11000) {
      errorMessage = 'Order number already exists';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Update order status (admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Status update request:', {
      orderId: req.params.id,
      status: req.body.status,
      user: req.user?.email,
      isAdmin: req.user?.is_admin
    });

    // Check if user is admin
    if (!req.user.is_admin) {
      console.log('❌ Non-admin user tried to update order status:', req.user.email);
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      });
    }

    const { status } = req.body;
    
    // Map old status values to new format
    const statusMapping = {
      'pending': 'order_raised',
      'confirmed': 'order_confirmed',
      'delivered': 'order_delivered',
      'rejected': 'order_cancelled',
      'completed': 'order_delivered'
    };
    
    const mappedStatus = statusMapping[status] || status;
    
    // Validate status values (accept both old and new formats)
    const validStatuses = [
      'order_raised', 'order_confirmed', 'order_packed', 'order_shipped', 'order_delivered', 'order_cancelled',
      'pending', 'confirmed', 'delivered', 'rejected', 'completed'
    ];
    console.log('🔍 Validating status:', { 
      originalStatus: status, 
      mappedStatus, 
      validStatuses, 
      isValid: validStatuses.includes(status) 
    });
    
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status provided:', status);
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: order_raised, order_confirmed, order_packed, order_shipped, order_delivered, order_cancelled'
      });
    }

    console.log('✅ Status validation passed, updating order with status:', mappedStatus);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: mappedStatus, updated_at: new Date() },
      { new: true }
    );

    console.log('📦 Order update result:', order ? 'Order found and updated' : 'Order not found');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Format the response to match the frontend expectations
    const formattedOrder = {
      id: order._id,
      user_id: order.user_id,
      mongo_user_id: order.mongo_user_id,
      amount: order.amount,
      order_number: order.order_number,
      products: order.products,
      address: order.address,
      first_name: order.first_name,
      last_name: order.last_name,
      phone: order.phone,
      city: order.city,
      state: order.state,
      zip: order.zip,
      status: order.status,
      upi_reference: order.upi_reference,
      created_at: order.created_at,
      updated_at: order.updated_at
    };

    console.log('✅ Order status updated successfully:', formattedOrder.status);

    res.json({
      success: true,
      order: formattedOrder
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
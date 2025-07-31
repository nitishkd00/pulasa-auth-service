const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const databaseBridge = require('../services/DatabaseBridge');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    // Validate credentials
    const validation = await databaseBridge.validateCredentials(email, password);

    if (!validation.success) {
      return res.status(401).json({
        success: false,
        error: validation.error
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: validation.user.id,
        email: validation.user.email,
        isAdmin: validation.user.is_admin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Login successful for: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: validation.user,
      tokens: {
        jwtToken: token,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { email, password, name, phone, address } = req.body;

    console.log(`📝 Registration attempt for: ${email}`);

    // Create user
    const result = await databaseBridge.createUser({
      email,
      password,
      name,
      phone,
      address
    });

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: result.error
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        isAdmin: result.user.is_admin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Registration successful for: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: result.user,
      tokens: {
        jwtToken: token,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.message === 'User already exists') {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Profile endpoint
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await databaseBridge.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Validate token endpoint
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await databaseBridge.getUserById(decoded.userId);

    if (!user) {
      return res.json({
        success: true,
        valid: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      valid: true,
      user
    });

  } catch (error) {
    console.error('❌ Token validation error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.json({
        success: true,
        valid: false,
        error: 'Invalid token'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Since we're using JWT, we don't need to do anything server-side
  // The client should remove the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'auth',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// OPTIONS handler for CORS preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

module.exports = router;

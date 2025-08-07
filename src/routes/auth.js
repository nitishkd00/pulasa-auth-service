const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const databaseBridge = require('../services/DatabaseBridge');
const OtpVerification = require('../models/OtpVerification');
const { sendOtpEmail } = require('../services/emailService');

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

    try {
      // Generate OTP for email verification
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Remove any previous OTPs for this email
      await OtpVerification.deleteMany({ email });
      
      // Store OTP
      await OtpVerification.create({ email, otp, expiresAt, verified: false });
      
      // Send OTP email
      await sendOtpEmail(email, otp);

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

      console.log(`✅ Registration successful for: ${email} (OTP sent)`);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        user: result.user,
        tokens: {
          jwtToken: token,
          tokenType: 'Bearer',
          expiresIn: '24h'
        },
        otpRequired: true
      });
    } catch (otpError) {
      console.error('❌ OTP creation/email error:', otpError);
      
      // If OTP creation fails, we should still allow the user to register
      // but without OTP verification for now
      const token = jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          isAdmin: result.user.is_admin
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ Registration successful for: ${email} (without OTP due to error)`);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Email verification will be available soon.',
        user: result.user,
        tokens: {
          jwtToken: token,
          tokenType: 'Bearer',
          expiresIn: '24h'
        },
        otpRequired: false
      });
    }

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

// Resend OTP endpoint
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail(),
  validateRequest
], async (req, res) => {
  try {
    const { email } = req.body;

    console.log(`📧 Resend OTP request for: ${email}`);

    // Check if user exists
    const user = await databaseBridge.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new OTP
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any previous OTPs for this email
    await OtpVerification.deleteMany({ email });
    
    // Store new OTP
    await OtpVerification.create({ email, otp, expiresAt, verified: false });
    
    // Send OTP email
    await sendOtpEmail(email, otp);

    console.log(`✅ OTP resent successfully for: ${email}`);

    res.json({
      success: true,
      message: 'OTP resent successfully'
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  validateRequest
], async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log(`🔐 OTP verification request for: ${email}`);

    // Find OTP record
    const otpRecord = await OtpVerification.findOne({ 
      email, 
      otp, 
      verified: false 
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP' 
      });
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP expired' 
      });
    }

    // Mark OTP as used
    otpRecord.verified = true;
    await otpRecord.save();

    // Update user verification status
    await databaseBridge.updateUserByEmail(email, { is_verified: true });

    console.log(`✅ OTP verified successfully for: ${email}`);

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get user by ID endpoint (for admin use)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`👤 Get user by ID: ${userId}, requested by: ${req.user?.email}`);

    // Only allow admins or the user themselves to get user details
    if (!req.user.is_admin && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const user = await databaseBridge.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('❌ Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
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

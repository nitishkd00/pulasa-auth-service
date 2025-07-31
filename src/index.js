const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { connectMongoDB, testMongoDBConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');

console.log('🔧 Loading notification routes...');
let notificationRoutes;
try {
  notificationRoutes = require('./routes/notifications');
  console.log('✅ Notification routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load notification routes:', error);
  // Create a fallback router
  const express = require('express');
  notificationRoutes = express.Router();
  notificationRoutes.get('/test', (req, res) => {
    res.json({ success: true, message: 'Fallback notification route' });
  });
}

const app = express();
const PORT = process.env.PORT || 6001;

// Debug logging
console.log('🔍 Environment Debug:');
console.log('📁 Current directory:', process.cwd());
console.log('🔧 PORT from env:', process.env.PORT);
console.log('🚀 Final PORT value:', PORT);
console.log('📄 .env file path:', require('path').resolve('.env'));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8080', 'http://localhost:3001', 'http://localhost:3000', 'http://localhost:8888'];

app.use(cors({
  origin: function (origin, callback) {
    console.log(`🌐 CORS request from origin: ${origin || 'null'}`);

    // Allow requests with no origin (like mobile apps, file://, or server-to-server)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }

    // Allow file:// protocol for testing tools
    if (origin.startsWith('file://')) {
      console.log('✅ CORS: Allowing file:// origin for testing tools');
      return callback(null, true);
    }

    // Allow localhost with any port for development
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      console.log('✅ CORS: Allowing localhost origin');
      return callback(null, true);
    }

    // Check allowed origins
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowing configured origin');
      return callback(null, true);
    }

    // Log rejected origins for debugging
    console.log(`❌ CORS: Rejecting origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'unified-auth-service'
  });
});

// Ping endpoint for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'pong', 
    timestamp: new Date().toISOString(),
    service: 'unified-auth-service'
  });
});

app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Debug middleware to log all registered routes
app.use((req, res, next) => {
  console.log('🔍 Request received:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl
  });
  next();
});

// Global OPTIONS handler for CORS preflight requests
app.options('*', (req, res) => {
  console.log('🌐 OPTIONS request received for:', req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Specific OPTIONS handler for auth routes
app.options('/api/auth/*', (req, res) => {
  console.log('🔐 OPTIONS request received for auth route:', req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Routes
console.log('🔧 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');
app.use('/api/orders', orderRoutes);
console.log('✅ Order routes registered');
app.use('/api/notifications', notificationRoutes);
console.log('✅ Notification routes registered');

// Log all registered routes for debugging
console.log('🔍 Registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  Router: ${middleware.regexp}`);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Pulasa Unified Authentication Service',
    version: '2.0.0',
    status: 'running',
    database: 'MongoDB Atlas (Unified)',
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      profile: 'GET /api/auth/profile',
      validate: 'POST /api/auth/validate',
      logout: 'POST /api/auth/logout',
      health: 'GET /api/auth/health',
      orders: 'GET /api/orders',
      notifications: 'POST /api/notifications'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'unified-auth-service',
    status: 'healthy',
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectMongoDB();
    await testMongoDBConnection();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Unified Auth Service running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: MongoDB Atlas (Unified)`);
      console.log(`🔗 Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

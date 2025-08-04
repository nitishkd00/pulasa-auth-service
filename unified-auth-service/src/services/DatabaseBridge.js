const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB-only database bridge service
class DatabaseBridge {
  constructor() {
    this.mongoose = mongoose;
  }

  // Get unified user from MongoDB
  async getUnifiedUser(email) {
    try {
      const user = await User.findOne({ email });
      return user ? user.toUnifiedUser() : null;
    } catch (error) {
      console.error('Error getting unified user:', error);
      return null;
    }
  }

  // Validate user credentials against MongoDB
  async validateCredentials(email, password) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return { success: false, error: 'Invalid password' };
      }

      return { 
        success: true, 
        user: user.toUnifiedUser() 
      };
    } catch (error) {
      console.error('Credential validation error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // Create new user in MongoDB
  async createUser(userData) {
    try {
      const { email, password, name, phone, address } = userData;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create new user
      const user = new User({
        email,
        password_hash: passwordHash,
        name,
        phone,
        address,
        is_admin: false,
        wallet_balance: 0.00,
        locked_amount: 0.00
      });

      await user.save();

      return { 
        success: true, 
        user: user.toUnifiedUser() 
      };
    } catch (error) {
      console.error('User creation error:', error);
      if (error.message === 'User already exists') {
        throw error;
      }
      throw new Error('Failed to create user');
    }
  }

  // Update user in MongoDB
  async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updated_at: new Date() },
        { new: true }
      );

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { 
        success: true, 
        user: user.toUnifiedUser() 
      };
    } catch (error) {
      console.error('User update error:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      return user ? user.toUnifiedUser() : null;
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email });
      return user ? user.toUnifiedUser() : null;
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }
}

module.exports = new DatabaseBridge();

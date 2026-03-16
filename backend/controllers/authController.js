const User = require('../models/User');
const { body, validationResult } = require('express-validator');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      // Validate
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields',
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
      });

      const token = user.getSignedJwtToken();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password',
        });
      }

      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isPasswordMatch = await user.matchPassword(password);

      if (!isPasswordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = user.getSignedJwtToken();

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFCMToken(req, res, next) {
    try {
      const { fcmToken, deviceName } = req.body;
      const userId = req.userId;

      if (!fcmToken) {
        return res.status(400).json({
          success: false,
          message: 'FCM token is required',
        });
      }

      const userService = require('../services/userService');
      const user = await userService.updateFCMToken(userId, fcmToken, deviceName);

      res.status(200).json({
        success: true,
        message: 'FCM token updated',
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.userId;
      const userService = require('../services/userService');
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.userId;
      const { name, notificationPreferences } = req.body;

      const userService = require('../services/userService');
      const user = await userService.updateUser(userId, {
        name,
        notificationPreferences,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

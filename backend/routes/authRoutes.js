import express from "express";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
};

router.post("/register", async(req, res) => {
    try {
    console.log("Register request received:", { email: req.body.email, username: req.body.username });
    
    const { email, username, password } = req.body;

    if (!username || !email || !password) {
      console.log("Missing fields in registration");
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      console.log("Password too short");
      return res.status(400).json({ message: "Password should be at least 6 characters long" });
    }

    if (username.length < 3) {
      console.log("Username too short");
      return res.status(400).json({ message: "Username should be at least 3 characters long" });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log("Database not connected for registration - using temporary auth");
      
      // Temporary registration when database is down
      const mockUser = {
        _id: "mockuser" + Date.now(),
        username: username,
        email: email,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString()
      };
      
      const token = generateToken(mockUser._id);
      
      return res.status(201).json({
        token,
        user: {
          id: mockUser._id,
          username: mockUser.username,
          email: mockUser.email,
          profileImage: mockUser.profileImage
        },
        note: "Temporary registration - database not connected"
      });
    }

    // check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log("Email already exists:", email);
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log("Username already exists:", username);
      return res.status(400).json({ message: "Username already exists" });
    }

    // get random avatar
    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const user = new User({
      email,
      username,
      password,
      profileImage,
    });

    await user.save();
    console.log("User created successfully:", username);

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage
      },
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    console.log("Login request received:", { email: req.body.email });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Missing fields in login");
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log("Database not connected for login - using temporary auth");
      
      // Temporary authentication when database is down
      if (email === "test@example.com" && password === "123456") {
        const mockUser = {
          _id: "mockuser123",
          username: "TestUser",
          email: "test@example.com",
          profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser",
          createdAt: new Date().toISOString()
        };
        
        const token = generateToken("mockuser123");
        
        return res.status(200).json({
          token,
          user: mockUser,
          note: "Temporary authentication - database not connected"
        });
      } else {
        return res.status(400).json({ 
          message: "Database connection error. For testing, use: email: test@example.com, password: 123456" 
        });
      }
    }

    // check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      console.log("Invalid password for user:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Login successful for user:", email);
    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
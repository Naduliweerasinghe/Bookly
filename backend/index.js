import express from "express";
import "dotenv/config";
import cors from "cors";

import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";

import { connectDB } from "./lib/db.js";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Server is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint to check books without auth (for debugging)
app.get('/api/books/test', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            // Database is connected, fetch real data
            const Book = (await import('./models/Book.model.js')).default;
            const books = await Book.find().populate("user", "username profileImage").limit(5);
            res.json({
                totalBooks: await Book.countDocuments(),
                books: books,
                message: 'Books fetched successfully from database'
            });
        } else {
            // Database not connected, return mock data
            const mockBooks = [
                {
                    _id: "mock1",
                    title: "The Great Gatsby",
                    caption: "A classic American novel about the Jazz Age and the American Dream.",
                    rating: 5,
                    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
                    user: {
                        username: "BookLover123",
                        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=BookLover123"
                    },
                    createdAt: new Date().toISOString()
                },
                {
                    _id: "mock2",
                    title: "To Kill a Mockingbird",
                    caption: "A powerful story of racial injustice and childhood innocence.",
                    rating: 4,
                    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
                    user: {
                        username: "ReadingFan",
                        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=ReadingFan"
                    },
                    createdAt: new Date().toISOString()
                }
            ];
            res.json({
                totalBooks: 2,
                books: mockBooks,
                message: 'Mock books (database not connected)'
            });
        }
    } catch (error) {
        console.error('Test books error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/auth',authRoutes);
app.use('/api/books',bookRoutes);


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server accessible at:`);
    console.log(`  - Local: http://localhost:${PORT}`);
    console.log(`  - Network: http://10.151.119.223:${PORT}`);
    connectDB();
});


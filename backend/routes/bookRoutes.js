import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.model.js";
import protectRoute from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const router = express.Router();

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, rating, image } = req.body;

    if (!image || !title || !caption || !rating) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // upload the image to cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url;

    // save to the database
    const newBook = new Book({
      title,
      caption,
      rating,
      image: imageUrl,
      user: req.user._id,
    });

    await newBook.save();

    res.status(201).json(newBook);
  } catch (error) {
    console.log("Error creating book", error);
    res.status(500).json({ message: error.message });
  }
});

// pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
  try {
    console.log("GET /books request received");
    console.log("Query params:", req.query);
    console.log("User:", req.user?.username);
    console.log("Database connection state:", mongoose.connection.readyState);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const skip = (page - 1) * limit;

    console.log(`Fetching books: page=${page}, limit=${limit}, skip=${skip}`);

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.log("Database not connected, returning mock data");
      
      // Return mock data when database is not connected
      const mockBooks = [
        {
          _id: "mock1",
          title: "The Great Gatsby",
          caption: "A classic American novel about the Jazz Age and the American Dream. This timeless story explores themes of wealth, love, and the corruption of the American Dream.",
          rating: 5,
          image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
          user: {
            _id: "mockuser1",
            username: "BookLover123",
            profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=BookLover123"
          },
          createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        },
        {
          _id: "mock2",
          title: "To Kill a Mockingbird",
          caption: "A powerful story of racial injustice and childhood innocence. Harper Lee's masterpiece continues to resonate with readers of all ages.",
          rating: 4,
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
          user: {
            _id: "mockuser2",
            username: "ReadingFan",
            profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=ReadingFan"
          },
          createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
        },
        {
          _id: "mock3",
          title: "1984",
          caption: "George Orwell's dystopian masterpiece about surveillance, control, and the nature of truth. More relevant today than ever before.",
          rating: 5,
          image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
          user: {
            _id: "mockuser3",
            username: "ClassicReader",
            profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=ClassicReader"
          },
          createdAt: new Date(Date.now() - 259200000).toISOString() // 3 days ago
        }
      ];

      const response = {
        books: mockBooks.slice(skip, skip + limit),
        currentPage: page,
        totalBooks: mockBooks.length,
        totalPages: Math.ceil(mockBooks.length / limit),
        note: "Mock data - database not connected"
      };

      res.json(response);
      return;
    }

    // Database is connected, fetch real data
    const books = await Book.find()
      .sort({ createdAt: -1 }) // desc
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage");

    const totalBooks = await Book.countDocuments();

    console.log(`Found ${books.length} books out of ${totalBooks} total`);

    const response = {
      books,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
    };

    res.json(response);
  } catch (error) {
    console.error("Error in get all books route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get recommended books by the logged in user
router.get("/user", protectRoute, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    console.error("Get user books error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // check if user is the creator of the book
    if (book.user.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "Unauthorized" });

    
    // delete image from cloduinary as well
    if (book.image && book.image.includes("cloudinary")) {
      try {
        const publicId = book.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.log("Error deleting image from cloudinary", deleteError);
      }
    }

    await book.deleteOne();

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.log("Error deleting book", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
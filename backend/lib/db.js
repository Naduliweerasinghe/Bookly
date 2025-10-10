import mongoose from "mongoose";

export const connectDB = async () => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        try {
            attempts++;
            console.log(`Attempting to connect to MongoDB... (attempt ${attempts}/${maxAttempts})`);
            console.log("MongoDB URL:", process.env.MONGO_URL?.replace(/:[^:@]*@/, ':***@')); // Hide password in logs
            
            const conn = await mongoose.connect(process.env.MONGO_URL, {
                serverSelectionTimeoutMS: 15000, // 15 seconds timeout
                socketTimeoutMS: 45000,
                family: 4, // Force IPv4
                bufferCommands: false
            });
            
            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
            console.log(`✅ Connected to database: ${conn.connection.name}`);
            return true;
        } catch (error) {
            console.log(`❌ MongoDB connection error (attempt ${attempts}):`, error.message);
            
            if (error.message.includes('ENOTFOUND')) {
                console.log("   - DNS resolution failed. This could be a network issue.");
                console.log("   - Try using a different network (mobile hotspot)");
                console.log("   - Check if your firewall is blocking MongoDB connections");
            }
            
            if (attempts < maxAttempts) {
                console.log(`   - Retrying in 3 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    
    console.log("❌ All MongoDB connection attempts failed. Server will continue running, but database operations will fail");
    return false;
}
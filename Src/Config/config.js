import mongoose from "mongoose";

const connectDb = async (req, res) => {
  const URI = process.env.PRODUCTION_DB_URI || "mongodb://localhost:27017/ProductService";
  try {
    mongoose.connect(URI, {
      connectTimeoutMS: 30000,
    });
    const db = mongoose.connection;
    db.on("error", (error) => {
      throw error;
    });
    db.once("open", () => {
      console.log("DB connected successfully :)");
    });
  } catch (error) {
    process.exit(-1);
    return res.status(500).json({
      success: true,
      message: "Error connecting database",
      error: error,
    });
  }
};

export default connectDb;

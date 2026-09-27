import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import documentRouter from "./routes/document.routes.js";
import chatRouter from "./routes/chat.routes.js";
import authRouter from "./routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/documents", documentRouter);
app.use("/api/chat", chatRouter);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    message: "CampusGPT Backend is running 🚀",
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
  });
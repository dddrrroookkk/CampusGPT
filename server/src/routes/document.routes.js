import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";

import { chunkText } from "../utils/chunkText.js";
import { generateEmbedding } from "../utils/embedding.js";
import Document from "../models/Document.js";

import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

// ======================================================
// POST /api/documents/upload
// Admin-only PDF upload
// ======================================================

router.post(
  "/upload",
  auth,
  admin,
  upload.single("pdf"),
  async (req, res) => {
    let parser;

    try {
      // ------------------------------------------------
      // 1. Check file
      // ------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a PDF file",
        });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          message: "Only PDF files are allowed",
        });
      }

      console.log(
        "Uploading document:",
        req.file.originalname
      );

      // ------------------------------------------------
      // 2. Create PDF parser
      // ------------------------------------------------

      parser = new PDFParse({
        data: req.file.buffer,
      });

      // ------------------------------------------------
      // 3. Extract PDF text
      // ------------------------------------------------

      const pdfData = await parser.getText();

      console.log(
        "PDF pages:",
        pdfData.numpages
      );

      // ------------------------------------------------
      // 4. Chunk text
      // ------------------------------------------------

      const chunks = chunkText(pdfData.text);

      console.log(
        "Total chunks:",
        chunks.length
      );

      // ------------------------------------------------
      // 5. Generate embeddings
      // ------------------------------------------------

      const documents = [];

      for (
        let chunkIndex = 0;
        chunkIndex < chunks.length;
        chunkIndex++
      ) {
        const chunk = chunks[chunkIndex];

        console.log(
          `Embedding chunk ${chunkIndex + 1}/${chunks.length}`
        );

        const embedding =
          await generateEmbedding(chunk);

        documents.push({
          documentName:
            req.file.originalname,

          text: chunk,

          embedding,

          metadata: {
            source:
              req.file.originalname,
          },
        });
      }

      // ------------------------------------------------
      // 6. Save to MongoDB
      // ------------------------------------------------

      if (documents.length > 0) {
        await Document.insertMany(documents);
      }

      console.log(
        "Documents saved to MongoDB ✅"
      );

      // ------------------------------------------------
      // 7. Response
      // ------------------------------------------------

      res.status(201).json({
        message:
          "PDF uploaded and processed successfully",

        fileName:
          req.file.originalname,

        pages:
          pdfData.numpages,

        chunks:
          documents.length,
      });
    } catch (error) {
      console.error(
        "PDF processing error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to process PDF",

        error:
          error.message,
      });
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }
  }
);

export default router;
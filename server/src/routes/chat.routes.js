import express from "express";
import { GoogleGenAI } from "@google/genai";
import { generateEmbedding } from "../utils/embedding.js";
import Document from "../models/Document.js";
import Chat from "../models/Chat.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// ======================================================
// POST /api/chat
// Ask question + save conversation
// ======================================================

router.post("/", auth, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    console.log("User question:", question);

    // --------------------------------------------------
    // 1. Initialize Gemini
    // --------------------------------------------------

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // --------------------------------------------------
    // 2. Generate question embedding
    // --------------------------------------------------

    const queryEmbedding = await generateEmbedding(question);

    console.log(
      "Query embedding generated:",
      queryEmbedding.length,
      "dimensions"
    );

    // --------------------------------------------------
    // 3. MongoDB Vector Search
    // --------------------------------------------------

    const relevantDocuments = await Document.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit: 5,
        },
      },
      {
        $project: {
          _id: 0,
          documentName: 1,
          text: 1,
          metadata: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    console.log(
      "Vector search results:",
      relevantDocuments.length
    );

    // --------------------------------------------------
    // 4. Similarity filtering
    // --------------------------------------------------

    const filteredDocuments = relevantDocuments.filter(
      (doc) => doc.score >= 0.6
    );

    console.log(
      "Results after similarity filtering:",
      filteredDocuments.length
    );

    // --------------------------------------------------
    // 5. No relevant information
    // --------------------------------------------------

    let answer;
    let sources = [];

    if (filteredDocuments.length === 0) {
      answer =
        "I couldn't find this information in the available campus documents.";
    } else {
      // ------------------------------------------------
      // 6. Build context
      // ------------------------------------------------

      const context = filteredDocuments
        .map(
          (doc, index) => `
SOURCE ${index + 1}

Document: ${doc.documentName}

Content:
${doc.text}
`
        )
        .join("\n-------------------------\n");

      // ------------------------------------------------
      // 7. Gemini
      // ------------------------------------------------

      const interaction = await ai.interactions.create({
        model:
          process.env.GEMINI_MODEL || "gemini-3.8-flash",

        system_instruction: `
You are CampusGPT, an AI assistant for campus-related information.

Answer the user's question using ONLY the provided context.

Rules:
- Do not invent information.
- Do not use outside knowledge.
- If the answer is not available in the context, say:
  "I couldn't find this information in the available campus documents."
- Keep answers clear and concise.
- Use the provided documents as the source of truth.
`,

        input: `
CONTEXT:

${context}

-------------------------

USER QUESTION:

${question}
`,
      });

      answer = interaction.output_text;

      console.log("Gemini answer generated ✅");

      // ------------------------------------------------
      // 8. Sources
      // ------------------------------------------------

      sources = filteredDocuments.map((doc) => ({
        documentName: doc.documentName,
        score: doc.score,
        source:
          doc.metadata?.source || doc.documentName,
      }));
    }

    // --------------------------------------------------
    // 9. Find user's chat
    // --------------------------------------------------

    let chat = await Chat.findOne({
      userId: req.user.userId,
    });

    // --------------------------------------------------
    // 10. Create chat if first message
    // --------------------------------------------------

    if (!chat) {
      chat = new Chat({
        userId: req.user.userId,
        messages: [],
      });
    }

    // --------------------------------------------------
    // 11. Save user message
    // --------------------------------------------------

    chat.messages.push({
      role: "user",
      content: question,
    });

    // --------------------------------------------------
    // 12. Save assistant message
    // --------------------------------------------------

    chat.messages.push({
      role: "assistant",
      content: answer,
      sources,
    });

    await chat.save();

    console.log("Chat history saved ✅");

    // --------------------------------------------------
    // 13. Response
    // --------------------------------------------------

    res.json({
      answer,
      sources,
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      message: "Failed to generate answer",
      error: error.message,
    });
  }
});

// ======================================================
// GET /api/chat/history
// Get logged-in user's chat history
// ======================================================

router.get("/history", auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      userId: req.user.userId,
    }).sort({ updatedAt: -1 });

    if (!chat) {
      return res.json({
        messages: [],
      });
    }

    res.json({
      messages: chat.messages,
    });
  } catch (error) {
    console.error("History error:", error);

    res.status(500).json({
      message: "Failed to load chat history",
      error: error.message,
    });
  }
});

export default router;
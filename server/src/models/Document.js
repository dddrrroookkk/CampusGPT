import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    documentName: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },

    metadata: {
      pageNumber: Number,
      source: String,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model("Document", documentSchema);

export default Document;
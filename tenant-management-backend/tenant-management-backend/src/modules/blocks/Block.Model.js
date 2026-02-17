import mongoose from "mongoose";
const blockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
  },
  { timestamps: true }
);
export const Block = mongoose.model("Block", blockSchema);

import { Block } from "./Block.Model.js";
import middleware from "../../middleware/auth.middleware.js";
import { protect } from "../../middleware/protect.js";
export default async function createBlock(req, res) {
  middleware(req, res, async () => {
    try {
      const name = " Narendra Block";
      const property = "693d7d94f82ef4b0c10062ec";
      const block = await Block.create({ name, property });
      res
        .status(201)
        .json({ success: true, message: "Block created successfully", block });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Block creation failed",
        error: error,
      });
    }
  });
}

import mongoose from "mongoose";
const propertySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String
  }, { timestamps: true });
  
  export default mongoose.model("Property", propertySchema);
  
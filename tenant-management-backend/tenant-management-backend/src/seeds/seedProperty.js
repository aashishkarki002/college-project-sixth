import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import Property from "../modules/tenant/Property.Model.js";
import Block from "../modules/tenant/Block.Model.js";
import InnerBlock from "../modules/tenant/InnerBlock.Model.js";
import { Unit } from "../modules/tenant/units/unit.model.js";

async function seedProperty() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    // Check if property already exists
    let property = await Property.findOne({ name: "sallyan house" });
    
    if (property) {
      console.log("⚠️  Property 'sallyan house' already exists — skipping");
      process.exit(0);
    }

    // Create Property
    property = await Property.create({
      name: "sallyan house",
      description: "Sallyan House Property"
    });
    console.log(`✅ Created property: ${property.name}`);

    // Create Blocks
    const birendraSadhan = await Block.create({
      name: "birendra sadhan",
      property: property._id
    });
    console.log(`✅ Created block: ${birendraSadhan.name}`);

    const narendraSadhan = await Block.create({
      name: "narendra sadhan",
      property: property._id
    });
    console.log(`✅ Created block: ${narendraSadhan.name}`);

    // Create Inner Blocks for birendra sadhan
    const sagarBlock = await InnerBlock.create({
      name: "sagar block",
      block: birendraSadhan._id,
      property: property._id
    });
    console.log(`✅ Created inner block: ${sagarBlock.name}`);

    const jyotiBlock = await InnerBlock.create({
      name: "jyoti block",
      block: birendraSadhan._id,
      property: property._id
    });
    console.log(`✅ Created inner block: ${jyotiBlock.name}`);

    // Create Inner Blocks for narendra sadhan
    const umangaBlock = await InnerBlock.create({
      name: "umanga block",
      block: narendraSadhan._id,
      property: property._id
    });
    console.log(`✅ Created inner block: ${umangaBlock.name}`);

    const sauryaBlock = await InnerBlock.create({
      name: "saurya block",
      block: narendraSadhan._id,
      property: property._id
    });
    console.log(`✅ Created inner block: ${sauryaBlock.name}`);

    // Create 8 units (distributed across the 4 inner blocks: 2 units per inner block)
    const innerBlocks = [sagarBlock, jyotiBlock, umangaBlock, sauryaBlock];
    const blocks = [birendraSadhan, birendraSadhan, narendraSadhan, narendraSadhan];
    
    for (let i = 0; i < 8; i++) {
      const unitNumber = i + 1;
      const innerBlockIndex = Math.floor(i / 2); // Distribute 2 units per inner block
      
      await Unit.create({
        name: `a${unitNumber}`,
        property: property._id,
        block: blocks[innerBlockIndex]._id,
        innerBlock: innerBlocks[innerBlockIndex]._id,
        isOccupied: false
      });
      console.log(`✅ Created unit: a${unitNumber}`);
    }

    console.log("🎉 Property seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedProperty();

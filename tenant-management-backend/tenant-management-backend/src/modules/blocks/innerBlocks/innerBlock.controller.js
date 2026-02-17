import InnerBlock from "./InnerBlock.Model.js";

export default async function createInnerBlock(req, res) {  
    try {
        const name = " Jyoti Block"
     const property = "693d7d94f82ef4b0c10062ec"
     const block = "693d7e32ca809ccf657dad0f"
     const pricePerSqft = 100;
        const innerBlock = await InnerBlock.create({ name, block, property, pricePerSqft });
       
        res.status(201).json({ success: true, message: "InnerBlock created successfully", innerBlock });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "InnerBlock creation failed", error: error });
    }
}

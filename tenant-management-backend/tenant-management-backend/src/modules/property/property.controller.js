import Property from "./Property.Model.js";

export default async function getProperty(req, res) {
  try {
    const data = await Property.aggregate([
      {
        $lookup: {
          from: "blocks",
          localField: "_id",
          foreignField: "property",
          as: "blocks"
        }
      },
      {
        $lookup: {
          from: "innerblocks",
          localField: "blocks._id",
          foreignField: "block",
          as: "innerBlocks"
        }
      },
      {
        $addFields: {
          blocks: {
            $map: {
              input: "$blocks",
              as: "block",
              in: {
                $mergeObjects: [
                  "$$block",
                  {
                    innerBlocks: {
                      $filter: {
                        input: "$innerBlocks",
                        as: "ib",
                        cond: { $eq: ["$$ib.block", "$$block._id"] }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $project: { innerBlocks: 0 } }
    ]);

    res.status(200).json({
      success: true,
      message: "Property fetched successfully",
      property: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Property fetching failed",
      error
    });
  }
}

/**
 * Get inner blocks for a selected block
 */
export const getInnerBlocksForBlock = (blockId, property) => {
  if (!blockId || !property || property.length === 0) return [];

  for (const propertyItem of property) {
    if (propertyItem.blocks && propertyItem.blocks.length > 0) {
      const selectedBlock = propertyItem.blocks.find(
        (block) => block._id === blockId,
      );
      if (selectedBlock && selectedBlock.innerBlocks) {
        return selectedBlock.innerBlocks;
      }
    }
  }
  return [];
};

/**
 * Get property ID from selected block
 */
export const getPropertyIdFromBlock = (blockId, property) => {
  if (!blockId || !property || property.length === 0) return null;

  for (const propertyItem of property) {
    if (propertyItem.blocks && propertyItem.blocks.length > 0) {
      const selectedBlock = propertyItem.blocks.find(
        (block) => block._id === blockId,
      );
      if (selectedBlock) {
        return propertyItem._id;
      }
    }
  }
  return null;
};

/**
 * Flatten all blocks from all properties
 */
export const getAllBlocks = (property) => {
  if (!property || property.length === 0) return [];

  return property.flatMap((propertyItem) => propertyItem.blocks || []);
};

/**
 * Get units for selected inner blocks
 */
export const getUnitsForInnerBlocks = (innerBlockIds, units) => {
  if (!innerBlockIds || innerBlockIds.length === 0 || !units) return [];

  // `units` come from the backend with `innerBlock` as an ObjectId,
  // not a populated document. Normalize all IDs to strings before comparing.
  const normalizedIds = innerBlockIds.map((id) => String(id));

  return units.filter((unit) => {
    if (!unit.innerBlock) return false;
    return normalizedIds.includes(String(unit.innerBlock));
  });
};

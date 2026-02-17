import adminModel from "../auth/admin.Model.js";
export const getStaffsService = async () => {
  try {
    const staffs = await adminModel
      .find({ role: "staff" })
      .select("name email phone role");
    return {
      success: true,
      message: "Staffs fetched successfully",
      data: staffs,
    };
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
};

export const updateStaffService = async (staffId, staffData) => {
  try {
    const staff = await adminModel.findByIdAndUpdate(staffId, staffData, {
      new: true,
    });
    return staff;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to update staff");
  }
};

export const deleteStaffService = async (staffId) => {
  try {
    const staff = await adminModel.findByIdAndDelete(staffId);
    return staff;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to delete staff");
  }
};

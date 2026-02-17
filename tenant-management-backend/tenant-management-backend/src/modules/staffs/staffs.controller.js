import { getStaffsService } from "./staffs.service.js";
import { updateStaffService } from "./staffs.service.js";
import { deleteStaffService } from "./staffs.service.js";
export const getStaffsController = async (req, res) => {
  try {
    const staffs = await getStaffsService();
    res.status(200).json({
      success: staffs.success,
      message: staffs.message,
      data: staffs.data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaffController = async (req, res) => {
  try {
    const staff = await updateStaffService(req.params.id, req.body);
    res.status(200).json({
      success: staff.success,
      message: "Staff updated successfully",
      data: staff.data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const deleteStaffController = async (req, res) => {
  try {
    const staff = await deleteStaffService(req.params.id);
    res.status(200).json({
      success: staff.success,
      message: staff.message,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: error.message, error: error });
  }
};

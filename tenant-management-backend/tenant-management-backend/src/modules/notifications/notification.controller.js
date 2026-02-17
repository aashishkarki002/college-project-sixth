import Notification from "./notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      admin: req.admin.id,
      isRead: false,
    })
      .populate("admin", "name email")
      .sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get notifications",
      error: error,
    });
  }
};
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany({}, { isRead: true });
    res
      .status(200)
      .json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error,
    });
  }
};
export const markNotificationAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
    });
    res
      .status(200)
      .json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error,
    });
  }
};

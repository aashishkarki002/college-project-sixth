export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // protect must run before this
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Admin not authenticated",
      });
    }

    const { role } = req.admin;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden - You do not have permission to perform this action",
      });
    }

    next();
  };
};

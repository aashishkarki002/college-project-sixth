import * as tenantService from "./tenant.service.js";

export const createTenant = async (req, res) => {
  const result = await tenantService.createTenant(
    req.body,
    req.files,
    req.admin?.id
  );
  const statusCode = result.statusCode ?? 500;
  if (result.success) {
    return res.status(statusCode).json({
      success: true,
      message: result.message,
      tenant: result.tenant,
    });
  }
  return res.status(statusCode).json({
    success: false,
    message: result.message,
    ...(result.error && { error: result.error }),
  });
};

export const getTenants = async (req, res) => {
  try {
    const tenants = await tenantService.getTenants();
    return res.status(200).json({ success: true, tenants });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching tenants",
      error,
    });
  }
};

export const getTenantById = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }
    return res.status(200).json({ success: true, tenant });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching tenant",
      error: error.message,
    });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const result = await tenantService.updateTenant(
      req.params.id,
      req.body,
      req.files
    );
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message,
      tenant: result.tenant,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error updating tenant",
      error: error.message,
    });
  }
};

export const deleteTenant = async (req, res) => {
  try {
    const result = await tenantService.deleteTenant(req.params.id);
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message,
      tenant: result.tenant,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error deleting tenant",
      error: error.message,
    });
  }
};

export const restoreTenant = async (req, res) => {
  try {
    const result = await tenantService.restoreTenant(req.params.id);
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message,
      tenant: result.tenant,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error restoring tenant",
      error: error.message,
    });
  }
};

export const searchTenants = async (req, res) => {
  try {
    const tenants = await tenantService.searchTenants(req.query);
    return res.status(200).json({ success: true, tenants });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error searching tenants",
      error: error.message,
    });
  }
};

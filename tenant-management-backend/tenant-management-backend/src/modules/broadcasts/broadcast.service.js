import { Tenant } from "../tenant/Tenant.Model.js";
import { sendEmail } from "../../config/nodemailer.js";

class BroadcastService {
  /**
   * Send broadcast email to tenants based on filters
   * @param {Object} filters - Filters to select tenants
   * @param {Object} emailContent - Email subject and body
   * @param {Object} options - Additional options
   * @returns {Object} Result with success status and details
   */
  async sendBroadcastEmail(filters = {}, emailContent, options = {}) {
    try {
      // Build query for filtering tenants
      const query = { isDeleted: false };

      // Apply filters
      if (filters.property) {
        query.property = filters.property;
      }

      if (filters.block) {
        query.block = filters.block;
      }

      if (filters.innerBlock) {
        query.innerBlock = filters.innerBlock;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      // Filter by specific tenant IDs if provided
      if (filters.tenantIds && Array.isArray(filters.tenantIds)) {
        query._id = { $in: filters.tenantIds };
      }

      // Filter by unit
      if (filters.unit) {
        query.units = filters.unit;
      }

      // Fetch tenants based on filters
      const tenants = await Tenant.find(query)
        .populate("property", "name")
        .populate("block", "name")
        .populate("innerBlock", "name")
        .populate("units", "name")
        .lean();

      if (tenants.length === 0) {
        return {
          success: false,
          message: "No tenants found matching the filters",
          sentCount: 0,
          failedCount: 0,
        };
      }

      // Validate email content
      if (!emailContent.subject || !emailContent.body) {
        throw new Error("Email subject and body are required");
      }

      const results = {
        sent: [],
        failed: [],
      };

      // Send emails to all filtered tenants
      const emailPromises = tenants.map(async (tenant) => {
        if (!tenant.email) {
          results.failed.push({
            tenantId: tenant._id,
            tenantName: tenant.name,
            reason: "No email address",
          });
          return;
        }

        try {
          // Personalize email content
          const personalizedBody = this.personalizeEmail(
            emailContent.body,
            tenant
          );

          await sendEmail({
            to: tenant.email,
            subject: emailContent.subject,
            html: personalizedBody,
          });

          results.sent.push({
            tenantId: tenant._id,
            tenantName: tenant.name,
            email: tenant.email,
          });
        } catch (error) {
          console.error(`Failed to send email to ${tenant.email}:`, error);
          results.failed.push({
            tenantId: tenant._id,
            tenantName: tenant.name,
            email: tenant.email,
            reason: error.message,
          });
        }
      });

      await Promise.all(emailPromises);

      return {
        success: true,
        message: `Broadcast email sent successfully`,
        totalTenants: tenants.length,
        sentCount: results.sent.length,
        failedCount: results.failed.length,
        details: {
          sent: results.sent,
          failed: results.failed,
        },
        filters: filters,
      };
    } catch (error) {
      console.error("Broadcast email failed:", error);
      throw error;
    }
  }

  /**
   * Personalize email content with tenant-specific data
   * @param {string} template - Email template with placeholders
   * @param {Object} tenant - Tenant data
   * @returns {string} Personalized email content
   */
  personalizeEmail(template, tenant) {
    let personalizedContent = template;

    // Replace placeholders with actual tenant data
    const replacements = {
      "{{tenantName}}": tenant.name || "Valued Tenant",
      "{{email}}": tenant.email || "",
      "{{phone}}": tenant.phone || "",
      "{{property}}": tenant.property?.name || "",
      "{{block}}": tenant.block?.name || "",
      "{{innerBlock}}": tenant.innerBlock?.name || "",
      "{{units}}": tenant.units?.map((u) => u.name).join(", ") || "",
      "{{totalRent}}": tenant.totalRent || 0,
      "{{securityDeposit}}": tenant.securityDeposit || 0,
    };

    Object.keys(replacements).forEach((placeholder) => {
      const regex = new RegExp(placeholder, "g");
      personalizedContent = personalizedContent.replace(
        regex,
        replacements[placeholder]
      );
    });

    return personalizedContent;
  }

  /**
   * Get tenant count by filters (for preview before sending)
   * @param {Object} filters - Filters to select tenants
   * @returns {Object} Count and tenant details
   */
  async getTenantCountByFilters(filters = {}) {
    try {
      const query = { isDeleted: false };

      if (filters.property) {
        query.property = filters.property;
      }

      if (filters.block) {
        query.block = filters.block;
      }

      if (filters.innerBlock) {
        query.innerBlock = filters.innerBlock;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.tenantIds && Array.isArray(filters.tenantIds)) {
        query._id = { $in: filters.tenantIds };
      }

      if (filters.unit) {
        query.units = filters.unit;
      }

      const tenants = await Tenant.find(query)
        .select("name email phone property block innerBlock units")
        .populate("property", "name")
        .populate("block", "name")
        .populate("innerBlock", "name")
        .populate("units", "name")
        .lean();

      const tenantsWithEmail = tenants.filter((t) => t.email);
      const tenantsWithoutEmail = tenants.filter((t) => !t.email);

      return {
        success: true,
        totalCount: tenants.length,
        withEmailCount: tenantsWithEmail.length,
        withoutEmailCount: tenantsWithoutEmail.length,
        tenants: tenants.map((t) => ({
          id: t._id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          property: t.property?.name,
          block: t.block?.name,
          innerBlock: t.innerBlock?.name,
          units: t.units?.map((u) => u.name).join(", "),
        })),
        tenantsWithoutEmail: tenantsWithoutEmail.map((t) => ({
          id: t._id,
          name: t.name,
        })),
      };
    } catch (error) {
      console.error("Failed to get tenant count:", error);
      throw error;
    }
  }
}

export const broadcastService = new BroadcastService();

import { broadcastService } from "./broadcast.service.js";

/**
 * Send broadcast email to tenants
 * POST /api/broadcast/send-email
 * Body: {
 *   filters: { property, block, innerBlock, status, tenantIds, unit },
 *   subject: "Email subject",
 *   body: "Email body with {{placeholders}}"
 * }
 */
export const sendBroadcastEmail = async (req, res) => {
  try {
    const { filters = {}, subject, body } = req.body;

    // Validate required fields
    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Subject and body are required",
      });
    }

    // Validate body length
    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Subject must be less than 200 characters",
      });
    }

    if (body.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Body must be less than 10000 characters",
      });
    }

    const result = await broadcastService.sendBroadcastEmail(
      filters,
      { subject, body },
      {}
    );

    if (result.totalTenants === 0) {
      return res.status(400).json({
        success: false,
        message: "No tenants found matching the filters",
        sentCount: 0,
        failedCount: 0,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in sendBroadcastEmail controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send broadcast email",
      error: error.message,
    });
  }
};

/**
 * Preview recipients before sending broadcast
 * POST /api/broadcast/preview-recipients
 * Body: {
 *   filters: { property, block, innerBlock, status, tenantIds, unit }
 * }
 */
export const previewRecipients = async (req, res) => {
  try {
    const { filters = {} } = req.body;

    const result = await broadcastService.getTenantCountByFilters(filters);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in previewRecipients controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to preview recipients",
      error: error.message,
    });
  }
};

/**
 * Get available placeholders for email templates
 * GET /api/broadcast/placeholders
 */
export const getPlaceholders = async (req, res) => {
  try {
    const placeholders = [
      {
        key: "{{tenantName}}",
        description: "Tenant's full name",
        example: "John Doe",
      },
      {
        key: "{{email}}",
        description: "Tenant's email address",
        example: "john@example.com",
      },
      {
        key: "{{phone}}",
        description: "Tenant's phone number",
        example: "+977-9812345678",
      },
      {
        key: "{{property}}",
        description: "Property name",
        example: "Sunrise Apartments",
      },
      {
        key: "{{block}}",
        description: "Block name",
        example: "Block A",
      },
      {
        key: "{{innerBlock}}",
        description: "Inner block name",
        example: "Floor 2",
      },
      {
        key: "{{units}}",
        description: "Comma-separated unit names",
        example: "A-201, A-202",
      },
      {
        key: "{{totalRent}}",
        description: "Total rent amount",
        example: "25000",
      },
      {
        key: "{{securityDeposit}}",
        description: "Security deposit amount",
        example: "50000",
      },
    ];

    res.status(200).json({
      success: true,
      placeholders,
      example: {
        subject: "Important Notice for {{tenantName}}",
        body: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Broadcast Message</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin:0; padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:20px auto; background-color:#ffffff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
    <tr>
      <td style="padding:20px;">
        <h2 style="color:#333333; font-size:24px; margin-bottom:10px;">Dear {{tenantName}},</h2>
        <p style="color:#555555; font-size:16px; line-height:1.5;">
          This is an important message regarding your tenancy at <strong>{{property}}</strong>.
        </p>
        <p style="color:#555555; font-size:16px; line-height:1.5;">
          Your unit: <strong>{{units}}</strong><br>
          Block: <strong>{{block}}</strong><br>
          Monthly Rent: <strong>Rs. {{totalRent}}</strong>
        </p>
        <p style="color:#555555; font-size:16px; line-height:1.5; margin-top:30px;">
          Best regards,<br>
          <strong>Management Team</strong>
        </p>
        <hr style="border:none; border-top:1px solid #e0e0e0; margin:20px 0;">
        <p style="color:#999999; font-size:12px; text-align:center;">
          If you have any questions, please contact us.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      },
    });
  } catch (error) {
    console.error("Error in getPlaceholders controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get placeholders",
      error: error.message,
    });
  }
};

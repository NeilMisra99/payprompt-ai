// Interface for individual line items
export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface InvoiceEmailTemplateProps {
  clientName: string;
  invoiceNumber: string;
  formattedDueDate: string;
  formattedTotal: string;
  companyName: string;
  items: InvoiceItem[]; // Add items array
  formattedSubtotal: string;
  formattedTax?: string; // Optional, only show if tax > 0
  formattedDiscount?: string; // Optional, only show if discount > 0
}

// Helper to format currency (can be moved to a shared util if needed)
function formatCurrency(amount: number): string {
  // Basic USD formatting, adjust as needed for locale/currency
  return `$${amount.toFixed(2)}`;
}

// Base HTML template with placeholders
const htmlTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
    {{PREVIEW_TEXT}}
    <div>
      <!-- Hidden spacer characters -->
       ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
    </div>
  </div>
  <body style='background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'>
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:100%;margin:0 auto;padding:20px 0 48px;width:580px">
      <tbody>
        <tr style="width:100%">
          <td>
            <h1 style="font-size:28px;font-weight:bold;margin-top:48px;margin-bottom:20px;color:#1f2937">
              Invoice {{INVOICE_NUMBER}} from {{COMPANY_NAME}}
            </h1>
            <p style="font-size:16px;line-height:1.6;color:#374151;margin-bottom:16px;margin-top:16px">
                Hi {{CLIENT_NAME}},
            </p>
             <p style="font-size:16px;line-height:1.6;color:#374151;margin-bottom:16px;margin-top:16px">
                Thank you for your business! Please find your invoice attached{{ATTACHMENT_NOTE}}.
                The details are summarized below.
            </p>
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#e5e7eb;margin:26px 0" />

            <!-- Invoice Items Table -->
            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">Items</h2>
            <table width="100%" style="border-collapse: collapse; margin-bottom: 26px;">
                <thead>
                <tr style="text-align: left; border-bottom: 1px solid #e5e7eb;">
                    <th style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 500;">Description</th>
                    <th style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 500; text-align: right;">Quantity</th>
                    <th style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 500; text-align: right;">Unit Price</th>
                    <th style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 500; text-align: right;">Amount</th>
                </tr>
                </thead>
                <tbody>
                {{INVOICE_ITEMS_ROWS}}
                </tbody>
            </table>

            <!-- Updated Invoice Summary Section (Right Aligned) -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 20px; margin-bottom: 26px;">
              <tbody>
                <tr>
                  <td style="width: 60%; padding-right: 10px;"></td> 
                  <td style="width: 40%;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tbody>
                             <tr>
                                <td style="font-size:14px; line-height:1.5; color:#374151; padding-bottom: 5px; text-align: left; white-space: nowrap;">
                                    Subtotal:
                                </td>
                                <td style="font-size:14px; line-height:1.5; color:#374151; padding-bottom: 5px; text-align: right; white-space: nowrap;">
                                    {{SUBTOTAL}}
                                </td>
                             </tr>
                             {{TAX_ROW}}
                             {{DISCOUNT_ROW}}
                             <tr style="border-top: 1px solid #e5e7eb; margin-top: 5px; padding-top: 5px;">
                                <td style="font-size:16px; line-height:1.6; color:#374151; padding-top: 8px; text-align: left; font-weight: bold; white-space: nowrap;">
                                    Total Amount Due:
                                </td>
                                <td style="font-size:16px; line-height:1.6; color:#374151; padding-top: 8px; text-align: right; font-weight: bold; white-space: nowrap;">
                                    {{TOTAL_AMOUNT}}
                                </td>
                             </tr>
                            <tr>
                                <td style="font-size:16px; line-height:1.6; color:#374151; padding-top: 8px; text-align: left; white-space: nowrap;">
                                    Due Date:
                                </td>
                                <td style="font-size:16px; line-height:1.6; color:#374151; padding-top: 8px; text-align: right; white-space: nowrap;">
                                    {{DUE_DATE}}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="clear: both;"></div> <!-- Clear float -->

            <!-- Contact Info -->
            <p style="font-size:16px;line-height:1.6;color:#374151;margin-bottom:16px;margin-top:26px">
              If you have any questions, please don't hesitate to contact us.
            </p>
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#e5e7eb;margin:26px 0" />
            <!-- Footer -->
            <p style="font-size:14px;line-height:1.5;color:#6b7280;margin-top:32px;margin-bottom:16px">
              Thank you,<br />
              The {{COMPANY_NAME}} Team
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

/**
 * Generates the HTML content for the new invoice email.
 *
 * @param props - The properties for the invoice email.
 * @returns The complete HTML string for the email.
 */
function InvoiceEmailTemplate({
  clientName,
  invoiceNumber,
  formattedDueDate,
  formattedTotal,
  companyName,
  items,
  formattedSubtotal,
  formattedTax,
  formattedDiscount,
}: InvoiceEmailTemplateProps): string {
  const previewText = `Your invoice #${invoiceNumber} from ${companyName} is ready. Amount due: ${formattedTotal}`;

  // Generate HTML rows for invoice items
  const invoiceItemsRowsHtml = items
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.5;">${
              item.description
            }</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.5; text-align: right;">${
              item.quantity
            }</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.5; text-align: right;">${formatCurrency(
              item.price
            )}</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.5; text-align: right;">${formatCurrency(
              item.amount
            )}</td>
        </tr>
    `
    )
    .join("");

  // Generate conditional tax row
  const taxRowHtml = formattedTax
    ? `<tr>
        <td style="font-size:14px; line-height:1.5; color:#374151; padding-bottom: 5px; text-align: left; white-space: nowrap;">Tax:</td>
        <td style="font-size:14px; line-height:1.5; color:#374151; padding-bottom: 5px; text-align: right; white-space: nowrap;">${formattedTax}</td>
       </tr>`
    : "";

  // Generate conditional discount row
  const discountRowHtml = formattedDiscount
    ? `<tr>
        <td style="font-size:14px; line-height:1.5; color:#374151; padding-bottom: 5px; text-align: left; white-space: nowrap;">Discount:</td>
        <td style="font-size:14px; line-height:1.5; color:#374151; padding-bottom: 5px; text-align: right; white-space: nowrap;">-${formattedDiscount}</td>
       </tr>`
    : "";

  // Note about attachments (can be dynamically set if needed)
  const attachmentNote = ""; // Set to " (see attached PDF)" if attaching PDF

  // Replace placeholders using global regex
  let htmlContent = htmlTemplate;
  htmlContent = htmlContent.replace(/{{PREVIEW_TEXT}}/g, previewText);
  htmlContent = htmlContent.replace(/{{COMPANY_NAME}}/g, companyName);
  htmlContent = htmlContent.replace(/{{INVOICE_NUMBER}}/g, invoiceNumber);
  htmlContent = htmlContent.replace(/{{CLIENT_NAME}}/g, clientName);
  htmlContent = htmlContent.replace(/{{ATTACHMENT_NOTE}}/g, attachmentNote);
  htmlContent = htmlContent.replace(
    /{{INVOICE_ITEMS_ROWS}}/g,
    invoiceItemsRowsHtml
  );
  htmlContent = htmlContent.replace(/{{SUBTOTAL}}/g, formattedSubtotal);
  htmlContent = htmlContent.replace(/{{TAX_ROW}}/g, taxRowHtml);
  htmlContent = htmlContent.replace(/{{DISCOUNT_ROW}}/g, discountRowHtml);
  htmlContent = htmlContent.replace(/{{DUE_DATE}}/g, formattedDueDate);
  htmlContent = htmlContent.replace(/{{TOTAL_AMOUNT}}/g, formattedTotal);

  return htmlContent;
}

export default InvoiceEmailTemplate;

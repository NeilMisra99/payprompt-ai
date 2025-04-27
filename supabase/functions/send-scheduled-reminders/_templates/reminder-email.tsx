export interface ReminderEmailTemplateProps {
  messageBody: string;
  invoiceNumber: string;
  formattedDueDate: string; // Expect pre-formatted date
  formattedTotal: string; // Expect pre-formatted currency
  companyName: string;
  // Optional: Add a link to view the invoice online
  // invoiceUrl?: string;
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
       ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
    </div>
  </div>
  <body style='background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'>
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:100%;margin:0 auto;padding:20px 0 48px;width:580px">
      <tbody>
        <tr style="width:100%">
          <td>
            <h1 style="font-size:28px;font-weight:bold;margin-top:48px;margin-bottom:20px;color:#1f2937">
              Payment Reminder
            </h1>
            <!-- Section for dynamic message body paragraphs -->
            {{MESSAGE_PARAGRAPHS}}
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#e5e7eb;margin:26px 0" />
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tbody>
                <tr>
                  <td>
                    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#374151;margin-bottom:16px;margin-top:0;margin-left:0;margin-right:0">
                      <strong>Invoice Details:</strong>
                    </p>
                    <p style="font-size:16px;line-height:1.6;color:#374151;margin-bottom:16px;margin-top:16px">
                      Invoice Number: #{{INVOICE_NUMBER}}<br />
                      Due Date: {{DUE_DATE}}<br />
                      Amount Due: {{TOTAL_AMOUNT}}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <p style="font-size:16px;line-height:1.6;color:#374151;margin-bottom:16px;margin-top:16px">
              If you have already paid or have any questions, please don't hesitate to contact us.
            </p>
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#e5e7eb;margin:26px 0" />
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
 * Generates the HTML content for the reminder email.
 *
 * @param props - The properties for the reminder email.
 * @returns The complete HTML string for the email.
 */
function ReminderEmailTemplate({
  messageBody,
  invoiceNumber,
  formattedDueDate,
  formattedTotal,
  companyName,
}: ReminderEmailTemplateProps): string {
  const previewText = `Invoice ${invoiceNumber} Reminder from ${companyName}`;

  // Generate HTML for message body paragraphs
  const messageParagraphsHtml = messageBody
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(
      (line) =>
        `<p style="font-size:16px;line-height:1.6;color:#374151;margin-bottom:16px;margin-top:16px">${line}</p>`
    )
    .join("\n");

  // Replace placeholders in the template
  let htmlContent = htmlTemplate;
  htmlContent = htmlContent.replace("{{PREVIEW_TEXT}}", previewText);
  htmlContent = htmlContent.replace(
    "{{MESSAGE_PARAGRAPHS}}",
    messageParagraphsHtml
  );
  htmlContent = htmlContent.replace("{{INVOICE_NUMBER}}", invoiceNumber);
  htmlContent = htmlContent.replace("{{DUE_DATE}}", formattedDueDate);
  htmlContent = htmlContent.replace("{{TOTAL_AMOUNT}}", formattedTotal);
  htmlContent = htmlContent.replace("{{COMPANY_NAME}}", companyName);

  return htmlContent;
}

// We keep the export default pointing to the function for consistency,
// although it's not a React component anymore.
// Alternatively, remove the default export if it causes confusion.
export default ReminderEmailTemplate;

import { supabase } from './supabase';

type EmailType =
  | 'approval'
  | 'rejection'
  | 'changes_requested'
  | 'custom_item_priced'
  | 'deal_won'
  | 'quotation_submitted';

interface EmailData {
  to: string;
  subject: string;
  type: EmailType;
  quotationNumber?: string;
  data?: Record<string, any>;
}

export const sendNotificationEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const html = generateEmailHTML(emailData);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`;

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No active session');
      return false;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html,
        quotationNumber: emailData.quotationNumber,
        type: emailData.type,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send email:', await response.text());
      return false;
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const generateEmailHTML = (emailData: EmailData): string => {
  const { type, quotationNumber, data } = emailData;

  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #334155; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(to right, #3b82f6, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
      .footer { background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b; }
      .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .info-box { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0; }
      .label { font-weight: bold; color: #475569; }
    </style>
  `;

  const templates: Record<EmailType, string> = {
    approval: `
      ${baseStyles}
      <div class="container">
        <div class="header">
          <h1>Quotation Approved! 🎉</h1>
        </div>
        <div class="content">
          <p>Great news! Your quotation has been approved.</p>
          <div class="info-box">
            <p><span class="label">Quotation Number:</span> ${quotationNumber}</p>
            <p><span class="label">Customer:</span> ${data?.customerName || 'N/A'}</p>
            <p><span class="label">Total Amount:</span> $${data?.total?.toFixed(2) || '0.00'}</p>
          </div>
          <p>You can now proceed with finalizing the deal with your customer.</p>
        </div>
        <div class="footer">
          <p>Special Offices Quotation Management System</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    `,
    rejection: `
      ${baseStyles}
      <div class="container">
        <div class="header" style="background: linear-gradient(to right, #ef4444, #dc2626);">
          <h1>Quotation Rejected</h1>
        </div>
        <div class="content">
          <p>Your quotation has been rejected.</p>
          <div class="info-box">
            <p><span class="label">Quotation Number:</span> ${quotationNumber}</p>
            <p><span class="label">Reason:</span> ${data?.reason || 'No reason provided'}</p>
          </div>
          <p>Please review the feedback and create a new quotation if needed.</p>
        </div>
        <div class="footer">
          <p>Special Offices Quotation Management System</p>
        </div>
      </div>
    `,
    changes_requested: `
      ${baseStyles}
      <div class="container">
        <div class="header" style="background: linear-gradient(to right, #f59e0b, #d97706);">
          <h1>Changes Requested</h1>
        </div>
        <div class="content">
          <p>Changes have been requested for your quotation.</p>
          <div class="info-box">
            <p><span class="label">Quotation Number:</span> ${quotationNumber}</p>
            <p><span class="label">Comments:</span> ${data?.comments || 'No comments provided'}</p>
          </div>
          <p>Please review the feedback and update your quotation accordingly.</p>
        </div>
        <div class="footer">
          <p>Special Offices Quotation Management System</p>
        </div>
      </div>
    `,
    custom_item_priced: `
      ${baseStyles}
      <div class="container">
        <div class="header">
          <h1>Custom Item Priced ✓</h1>
        </div>
        <div class="content">
          <p>Good news! Your custom item has been priced by the engineering team.</p>
          <div class="info-box">
            <p><span class="label">Quotation Number:</span> ${quotationNumber}</p>
            <p><span class="label">Item:</span> ${data?.itemDescription || 'N/A'}</p>
            <p><span class="label">Price:</span> $${data?.price?.toFixed(2) || '0.00'}</p>
          </div>
          <p>You can now review and submit your quotation for approval.</p>
        </div>
        <div class="footer">
          <p>Special Offices Quotation Management System</p>
        </div>
      </div>
    `,
    deal_won: `
      ${baseStyles}
      <div class="container">
        <div class="header" style="background: linear-gradient(to right, #10b981, #059669);">
          <h1>Deal Won! 🏆</h1>
        </div>
        <div class="content">
          <p>Congratulations! Your quotation has been marked as Won!</p>
          <div class="info-box">
            <p><span class="label">Quotation Number:</span> ${quotationNumber}</p>
            <p><span class="label">Customer:</span> ${data?.customerName || 'N/A'}</p>
            <p><span class="label">Deal Value:</span> $${data?.total?.toFixed(2) || '0.00'}</p>
            <p><span class="label">Commission:</span> $${data?.commission?.toFixed(2) || '0.00'}</p>
          </div>
          <p>Great work closing this deal! Your commission has been calculated and will be processed.</p>
        </div>
        <div class="footer">
          <p>Special Offices Quotation Management System</p>
        </div>
      </div>
    `,
    quotation_submitted: `
      ${baseStyles}
      <div class="container">
        <div class="header">
          <h1>New Quotation Awaiting Approval</h1>
        </div>
        <div class="content">
          <p>A new quotation has been submitted and requires your approval.</p>
          <div class="info-box">
            <p><span class="label">Quotation Number:</span> ${quotationNumber}</p>
            <p><span class="label">Sales Rep:</span> ${data?.salesRepName || 'N/A'}</p>
            <p><span class="label">Customer:</span> ${data?.customerName || 'N/A'}</p>
            <p><span class="label">Total Amount:</span> $${data?.total?.toFixed(2) || '0.00'}</p>
            <p><span class="label">Discount:</span> ${data?.discount || 0}%</p>
          </div>
          <p>Please review the quotation and take appropriate action.</p>
        </div>
        <div class="footer">
          <p>Special Offices Quotation Management System</p>
        </div>
      </div>
    `,
  };

  return templates[type] || templates.approval;
};

export const sendQuotationApprovedEmail = async (
  to: string,
  quotationNumber: string,
  data: any
) => {
  return sendNotificationEmail({
    to,
    subject: `Quotation ${quotationNumber} Approved`,
    type: 'approval',
    quotationNumber,
    data,
  });
};

export const sendQuotationRejectedEmail = async (
  to: string,
  quotationNumber: string,
  reason: string
) => {
  return sendNotificationEmail({
    to,
    subject: `Quotation ${quotationNumber} Rejected`,
    type: 'rejection',
    quotationNumber,
    data: { reason },
  });
};

export const sendChangesRequestedEmail = async (
  to: string,
  quotationNumber: string,
  comments: string
) => {
  return sendNotificationEmail({
    to,
    subject: `Changes Requested for Quotation ${quotationNumber}`,
    type: 'changes_requested',
    quotationNumber,
    data: { comments },
  });
};

export const sendCustomItemPricedEmail = async (
  to: string,
  quotationNumber: string,
  itemDescription: string,
  price: number
) => {
  return sendNotificationEmail({
    to,
    subject: `Custom Item Priced - Quotation ${quotationNumber}`,
    type: 'custom_item_priced',
    quotationNumber,
    data: { itemDescription, price },
  });
};

export const sendDealWonEmail = async (
  to: string,
  quotationNumber: string,
  data: any
) => {
  return sendNotificationEmail({
    to,
    subject: `Deal Won! - Quotation ${quotationNumber}`,
    type: 'deal_won',
    quotationNumber,
    data,
  });
};

export const sendQuotationSubmittedEmail = async (
  to: string,
  quotationNumber: string,
  data: any
) => {
  return sendNotificationEmail({
    to,
    subject: `New Quotation ${quotationNumber} Awaiting Approval`,
    type: 'quotation_submitted',
    quotationNumber,
    data,
  });
};

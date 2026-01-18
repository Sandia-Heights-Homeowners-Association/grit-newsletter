import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendSubmissionNotificationParams {
  category: string;
  publishedName: string;
  content: string;
  fullName: string;
  email: string;
  location: string;
}

export async function sendSubmissionNotification({
  category,
  publishedName,
  content,
  fullName,
  email,
  location,
}: SendSubmissionNotificationParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email notification');
    return { success: false, skipped: true };
  }

  if (!process.env.EDITOR_EMAIL) {
    console.warn('EDITOR_EMAIL not set - skipping email notification');
    return { success: false, skipped: true };
  }

  const contentPreview = content.length > 200 
    ? content.substring(0, 200) + '...' 
    : content;

  try {
    const emailPayload: any = {
      from: 'GRIT Newsletter <noreply@sandiaheightsgrit.app>',
      replyTo: 'griteditor@sandiahomeowners.org',
      to: [process.env.EDITOR_EMAIL],
      subject: `New ${category} Submission - ${publishedName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); 
                      color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .info-row { margin: 10px 0; padding: 8px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #6b7280; }
            .preview { background: white; padding: 15px; margin: 15px 0; 
                       border-left: 4px solid #f97316; border-radius: 4px; }
            .button { display: inline-block; background: #f97316; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                      margin: 15px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; 
                      padding: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📬 New Submission</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95;">Sandia Heights Homeowners Association Newsletter, the GRIT</p>
            </div>
            <div class="content">
              <p style="font-size: 16px; color: #059669; font-weight: 500; margin: 0 0 15px 0;">
                Thank you for your contribution!
              </p>
              
              <div class="info-row">
                <span class="label">Category:</span> ${category}
              </div>
              <div class="info-row">
                <span class="label">Published Name:</span> ${publishedName}
              </div>
              <div class="info-row">
                <span class="label">Full Name:</span> ${fullName}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> ${email}
              </div>
              <div class="info-row">
                <span class="label">Location:</span> ${location}
              </div>
              
              <div class="preview">
                <div class="label">Content Preview:</div>
                <p>${contentPreview.replace(/\n/g, '<br>')}</p>
              </div>
              
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/editor" class="button">
                Review in Editor Dashboard
              </a>
              
              <p style="font-size: 11px; color: #9ca3af; margin-top: 20px; line-height: 1.5;">
                Submissions are subject to editing and publication is not guaranteed.
              </p>
            </div>
            <div class="footer">
              <p>GRIT Newsletter Submission System</p>
              <p>This is an automated notification</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Add BCC if configured
    if (process.env.EDITOR_EMAIL_BCC) {
      emailPayload.bcc = [process.env.EDITOR_EMAIL_BCC];
    }

    await resend.emails.send(emailPayload);

    console.log('Email notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return { success: false, error };
  }
}

export async function sendSubmitterConfirmation({
  category,
  publishedName,
  content,
  fullName,
  email,
}: Omit<SendSubmissionNotificationParams, 'location'>) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping submitter confirmation');
    return { success: false, skipped: true };
  }

  if (!email) {
    console.warn('No submitter email provided - skipping confirmation');
    return { success: false, skipped: true };
  }

  try {
    const emailPayload: any = {
      from: 'GRIT Newsletter <noreply@sandiaheightsgrit.app>',
      replyTo: 'griteditor@sandiahomeowners.org',
      to: [email],
      subject: 'Thank you for your submission to the GRIT!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); 
                      color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; 
                       border-radius: 0 0 8px 8px; }
            .submission-box { background: white; padding: 20px; margin: 20px 0; 
                              border-left: 4px solid #f97316; border-radius: 4px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; 
                      padding: 15px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✓ Submission Received</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95;">Sandia Heights Homeowners Association Newsletter, the GRIT</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #059669; font-weight: 600; margin: 0 0 10px 0;">
                Thank you for your submission!
              </p>
              
              <p style="margin: 15px 0;">
                Dear ${fullName},
              </p>
              
              <p style="margin: 15px 0;">
                We've received your submission for the <strong>${category}</strong> section of the GRIT newsletter.
              </p>
              
              <div class="submission-box">
                <p style="font-weight: bold; color: #6b7280; margin: 0 0 10px 0;">Your Submission:</p>
                <p style="margin: 0 0 5px 0;"><strong>Published Name:</strong> ${publishedName}</p>
                <p style="margin: 0 0 15px 0;"><strong>Category:</strong> ${category}</p>
                <p style="white-space: pre-wrap; margin: 0;">${content}</p>
              </div>
              
              <p style="margin: 15px 0;">
                Our editorial team will review your submission and may contact you if we need any clarification.
              </p>
              
              <p style="font-size: 11px; color: #9ca3af; margin-top: 20px; padding-top: 15px; 
                        border-top: 1px solid #e5e7eb; line-height: 1.5;">
                <strong>Please note:</strong> Submissions are subject to editing and publication is not guaranteed. 
                If you have any questions, please reply to this email.
              </p>
            </div>
            <div class="footer">
              <p><strong>The GRIT Newsletter</strong></p>
              <p>Guiding Residents, Inspiring Togetherness</p>
              <p style="margin-top: 10px;">This is an automated confirmation</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Add BCC to editor if configured
    if (process.env.EDITOR_EMAIL_BCC) {
      emailPayload.bcc = [process.env.EDITOR_EMAIL_BCC];
    }

    await resend.emails.send(emailPayload);

    console.log('Submitter confirmation sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Failed to send submitter confirmation:', error);
    return { success: false, error };
  }
}

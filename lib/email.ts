import { Resend } from 'resend';

interface SendSubmissionNotificationParams {
  category: string;
  publishedName: string;
  content: string;
  fullName: string;
  email: string;
  location: string;
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(value: string): string {
  let html = escapeHtml(value);
  const markdownLinks: string[] = [];

  html = html.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)/g,
    (_match, label: string, href: string) => {
      markdownLinks.push(`<a href="${href}" style="color:#0f766e;text-decoration:underline;">${label}</a>`);
      return `@@GRITLINK${markdownLinks.length - 1}@@`;
    }
  );
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#0f766e;text-decoration:underline;">$1</a>'
  );
  html = html.replace(/@@GRITLINK(\d+)@@/g, (_match, index: string) => markdownLinks[Number(index)] || '');
  return html;
}

function renderMarkdownForEmail(markdown: string): string {
  const lines = markdown.trim().split('\n');
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line === '---') {
      closeList();
      html.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">');
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = (heading[1] || '#').length as 1 | 2 | 3;
      const headingText = heading[2] || '';
      const sizes = { 1: 22, 2: 18, 3: 16 } as const;
      html.push(`<h${level} style="font-size:${sizes[level]}px;line-height:1.25;margin:18px 0 8px;color:#7c2d12;">${renderInlineMarkdown(headingText)}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html.push('<ul style="margin:10px 0 10px 22px;padding:0;">');
      }
      html.push(`<li style="margin:4px 0;">${renderInlineMarkdown(bullet[1] || '')}</li>`);
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html.push('<ol style="margin:10px 0 10px 22px;padding:0;">');
      }
      html.push(`<li style="margin:4px 0;">${renderInlineMarkdown(numbered[1] || '')}</li>`);
      continue;
    }

    closeList();
    html.push(`<p style="margin:10px 0;white-space:pre-wrap;">${renderInlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join('\n');
}

function extractSubmissionBody(content: string): string {
  const lines = content.split('\n');

  for (let i = 1; i < lines.length; i++) {
    const previousLine = lines[i - 1] || '';
    if (
      lines[i].trim() === '' &&
      i > 1 &&
      (
        previousLine.includes('Location:') ||
        previousLine.includes('Email:') ||
        previousLine.includes('Event Location:') ||
        previousLine.includes('Sighting Location:')
      )
    ) {
      return lines.slice(i + 1).join('\n').trim();
    }
  }

  return content.trim();
}

function renderSubmissionBodyForEmail(content: string): string {
  const body = extractSubmissionBody(content);
  return body ? renderMarkdownForEmail(body) : '<p style="margin:10px 0;color:#6b7280;"><em>No submission text provided.</em></p>';
}

function editorDelivery() {
  const to = process.env.EDITOR_EMAIL || process.env.EDITOR_EMAIL_BCC;
  const bcc =
    process.env.EDITOR_EMAIL &&
    process.env.EDITOR_EMAIL_BCC &&
    process.env.EDITOR_EMAIL_BCC !== process.env.EDITOR_EMAIL
      ? [process.env.EDITOR_EMAIL_BCC]
      : undefined;

  return { to, bcc };
}

function confirmationBcc() {
  return process.env.EDITOR_EMAIL_BCC ? [process.env.EDITOR_EMAIL_BCC] : undefined;
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

  const delivery = editorDelivery();
  if (!delivery.to) {
    console.warn('EDITOR_EMAIL/EDITOR_EMAIL_BCC not set - skipping editor notification');
    return { success: false, skipped: true };
  }

  const contentPreview = content.length > 200 
    ? content.substring(0, 200) + '...' 
    : content;

  try {
    const emailPayload = {
      from: 'GRIT Newsletter <noreply@sandiaheightsgrit.app>',
      replyTo: 'griteditor@sandiahomeowners.org',
      to: [delivery.to],
      subject: `[GRIT] New submission: ${category} — ${publishedName}`,
      ...(delivery.bcc ? { bcc: delivery.bcc } : {}),
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
                <span class="label">Category:</span> ${escapeHtml(category)}
              </div>
              <div class="info-row">
                <span class="label">Published Name:</span> ${escapeHtml(publishedName)}
              </div>
              <div class="info-row">
                <span class="label">Full Name:</span> ${escapeHtml(fullName)}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> ${escapeHtml(email)}
              </div>
              <div class="info-row">
                <span class="label">Location:</span> ${escapeHtml(location || 'Not provided')}
              </div>
              
              <div class="preview">
                <div class="label">Content Preview:</div>
                <p>${escapeHtml(contentPreview).replace(/\n/g, '<br>')}</p>
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

    await getResend().emails.send(emailPayload);

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
    const bcc = confirmationBcc();
    const emailPayload = {
      from: 'GRIT Newsletter <noreply@sandiaheightsgrit.app>',
      replyTo: 'griteditor@sandiahomeowners.org',
      to: [email],
      subject: `[GRIT] Submission received — ${category}`,
      ...(bcc ? { bcc } : {}),
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
                Dear ${escapeHtml(fullName)},
              </p>
              
              <p style="margin: 15px 0;">
                We've received your submission for the <strong>${escapeHtml(category)}</strong> section of the GRIT newsletter.
              </p>
              
              <div class="submission-box">
                <p style="font-weight: bold; color: #6b7280; margin: 0 0 10px 0;">Your Submission:</p>
                <p style="margin: 0 0 5px 0;"><strong>Published Name:</strong> ${escapeHtml(publishedName)}</p>
                <p style="margin: 0 0 15px 0;"><strong>Category:</strong> ${escapeHtml(category)}</p>
                ${renderSubmissionBodyForEmail(content)}
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

    await getResend().emails.send(emailPayload);

    console.log('Submitter confirmation sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Failed to send submitter confirmation:', error);
    return { success: false, error };
  }
}

export async function sendCaptionConfirmation({
  publishedName,
  fullName,
  email,
  caption,
}: {
  publishedName: string;
  fullName: string;
  email: string;
  caption: string;
}) {
  if (!process.env.RESEND_API_KEY || !email) {
    return { success: false, skipped: true };
  }

  try {
    await getResend().emails.send({
      from: 'GRIT Newsletter <noreply@sandiaheightsgrit.app>',
      replyTo: 'griteditor@sandiahomeowners.org',
      to: [email],
      subject: '[GRIT] Caption contest entry received',
      ...(confirmationBcc() ? { bcc: confirmationBcc() } : {}),
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
            .caption-box { background: white; padding: 15px; margin: 20px 0;
                           border-left: 4px solid #f97316; border-radius: 4px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🏆 Caption Contest Entry Received</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95;">Sandia Heights GRIT Newsletter</p>
            </div>
            <div class="content">
              <p>Dear ${escapeHtml(fullName)},</p>
              <p>We received your caption contest entry. Here's what you submitted:</p>
              <div class="caption-box">
                <p style="font-weight: bold; color: #6b7280; margin: 0 0 8px 0;">Your Caption:</p>
                <p style="margin: 0; font-size: 15px;">${escapeHtml(caption)}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">Published as: ${escapeHtml(publishedName)}</p>
              </div>
              <p>Winners and selected captions may be published in an upcoming issue of The GRIT. Good luck!</p>
              <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                Entries are subject to editorial review. Publication is not guaranteed.
              </p>
            </div>
            <div class="footer">
              <p><strong>The GRIT Newsletter</strong> — Guiding Residents, Inspiring Togetherness</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send caption confirmation:', error);
    return { success: false, error };
  }
}

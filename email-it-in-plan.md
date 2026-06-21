# Email-It-In Intake Plan

## Summary

Build v1 around Resend Inbound. It is the lowest-friction fit because this app already uses Resend, and Resend can receive inbound mail via webhook, then expose body content and attachments through its API. Microsoft Graph stays a later option, but not the first build.

User workflow:

- Residents can email the intake address directly.
- The editor can forward resident emails to the intake address.
- The app creates an unreviewed draft submission in the editor inbox.
- The editor reviews category, month, and content before using it in the issue.
- `.docx` attachments are downloaded, preserved, and text-extracted into the draft.

Useful references:

- [Resend Receiving Emails](https://resend.com/docs/dashboard/receiving/introduction)
- [Resend Receiving Attachments](https://resend.com/docs/dashboard/receiving/attachments)
- [Resend Retrieve Received Email](https://resend.com/docs/api-reference/emails/retrieve-received-email)
- [Microsoft Graph messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0)

## Key Changes

### Resend Webhook

- Add a Resend webhook route, for example `POST /api/inbound/resend`.
- Verify webhook signatures using `RESEND_WEBHOOK_SECRET`.
- Accept only `email.received` events.
- Fetch full email content using `resend.emails.receiving.get(email_id)`.
- Fetch attachments using Resend's received-email attachments API.
- Deduplicate by Resend `email_id` and email `message_id`.

### Database Persistence

- Add an `inbound_emails` table with provider id, message id, from/to/cc, subject, text/html body, parsed original sender, processing status, error text, and linked submission id.
- Add an `inbound_attachments` table with inbound email id, filename, content type, size, stored bytes for supported files, extracted text/html, and parse status.
- Store original `.docx` files in Postgres with a conservative file-size cap because volume is low and this avoids adding blob storage.
- Store image/PDF attachment metadata and bytes if under the cap, but only auto-extract `.docx` in v1.

### Submission Creation

- Convert inbound email into a normal unreviewed submission.
- Category defaults to `General Submission / Other`.
- Title defaults to cleaned email subject.
- Content is email body plus extracted `.docx` text.
- `editorNotes` records source, sender, recipient, attachment names, and parsing warnings.
- Set `needsAttention: true`, `priority: normal`, `itemType: submission`, and empty disposition.
- Direct resident email uses the sender as contact name/email.
- Forwarded email tries to parse original `From:` and `Subject:` from forwarded headers. If uncertain, it flags the item for editor review.

### Parsing

- Use `mammoth` for `.docx` extraction.
- Use a small HTML-to-text converter for email HTML bodies.
- Keep original text/html and extracted attachment text for audit/recovery.

### Email Confirmations

- Direct resident emails to the intake address get a confirmation after the draft is created.
- Editor-forwarded emails do not send a resident confirmation by default to avoid surprising people or confirming to the wrong person.
- Editor still sees the imported draft in the inbox.

### Editor UI

- Inbox items imported from email show an `Email Intake` badge.
- Read view shows original sender, subject, attachment list, parse warnings, and extracted `.docx` text.
- Do not create a separate bot inbox unless the regular inbox becomes too crowded.

### Environment

Add these variables to committed env templates when implementing:

```bash
RESEND_WEBHOOK_SECRET=
INBOUND_EMAIL_ENABLED=false
INBOUND_ALLOWED_RECIPIENTS=
INBOUND_MAX_ATTACHMENT_MB=10
```

Keep the existing Resend outbound variables as-is. Do not add Microsoft Graph env vars in v1.

## Test Plan

Unit-test email parsing:

- Direct plain-text email.
- Direct HTML email.
- Editor-forwarded email with common Gmail, Outlook, and Apple forwarded-header formats.
- Email with `.docx` attachment.
- Email with unsupported or oversized attachment.
- Duplicate webhook delivery.

Integration-test route behavior:

- Invalid webhook signature is rejected.
- Valid Resend `email.received` creates one inbound email row and one submission.
- Replayed webhook does not duplicate submissions.
- Failed attachment parsing still creates a visible draft with warnings.

Manual local testing:

- Add a fixture script that imports saved sample email JSON plus optional local `.docx`.
- Use Resend's webhook testing or tunnel flow for one end-to-end inbound test.
- Verify imported drafts appear in the existing editor Inbox/Backlog pane.

## Assumptions

- Use a Resend-managed receiving domain or receiving subdomain first, not the root SHHA mail domain.
- Use a dedicated intake address such as `grit-intake@...`.
- Keep Microsoft Graph out of v1 to avoid Azure app registration, mailbox permissions, polling/subscription renewal, and Graph-specific operational work.
- Preserve original `.docx` files in the database for now because volume is low and avoiding blob storage is valuable.
- Treat inbound email as draft intake, not fully trusted publication-ready submission.

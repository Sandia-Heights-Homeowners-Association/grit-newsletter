export interface HomepageContent {
  welcomeText: string;
  guidelinesMarkdown: string;
  termsMarkdown: string;
}

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  welcomeText: 'The GRIT is your community newsletter, and we want to hear from you. Send neighborhood-relevant content, from short thoughts to full articles.',
  guidelinesMarkdown: `To help us publish a clear, readable, and useful newsletter each month, please keep the following in mind:

- Submissions may be very short or up to about 500 words.
- You can type, paste from Word, or import a Word document into the form.
- Content should be relevant to life in Sandia Heights or of clear interest to neighbors.
- Write for a general neighborhood audience. Keep content respectful, constructive, and appropriate for all ages.
- Avoid inflammatory language, personal attacks, or speculation presented as fact.
- Please avoid excessive business promotion. For advertising, contact [office@sandiahomeowners.org](mailto:office@sandiahomeowners.org).
- If you reference links, include the full URL.

### Photos

If you would like photos included, place a clear placeholder in your text where the photo should appear, then email the photo files to [griteditor@sandiahomeowners.org](mailto:griteditor@sandiahomeowners.org).

### Editing & Placement

Editors may shorten or edit submissions for clarity and fit. Not all content will appear in the same issue it is submitted; some items may be saved for a future month.

### Not Sure Where It Fits?

If you're unsure which topic to choose, leave the form set to **General Submission / Other**.`,
  termsMarkdown: `Thank you for contributing to The GRIT! By sending us your content, you give the Sandia Heights Homeowners Association (SHHA) a non-exclusive, royalty-free right to publish, edit, reproduce, and distribute your submission in the newsletter, on the SHHA website, in email communications, and in other Association materials. This includes permission for us to make any needed editorial changes, format your content for publication, and archive it for future reference.

All submissions go through an editorial review process. Our editors may adjust content for length, clarity, tone, or appropriateness, and we reserve the right to decline any submission. While we appreciate every contribution, we cannot guarantee publication or accommodate requests for specific placement, timing, or prominence.

Please help us keep the newsletter enjoyable and useful by making sure your submission is concise, respectful, and relevant to the Sandia Heights community. Submissions must be your own original work. By contributing, you confirm that you hold the rights to the text, images, or other materials you provide and that your content does not infringe on the rights of others. If your submission includes photos of people who can be identified, please make sure you have their permission.

Be sure to include your name and contact information with each submission. We will not publish your contact details without your permission, but we may reach out if clarification is needed. Anonymous or unverifiable submissions may not be accepted.

Please note that SHHA is not responsible for any errors, omissions, or misinterpretations in submitted content, and publication does not imply endorsement of the opinions expressed.

SHHA may update or revise these Terms & Conditions at any time.`,
};

export function normalizeHomepageContent(value: Partial<HomepageContent> | null | undefined): HomepageContent {
  return {
    welcomeText: typeof value?.welcomeText === 'string' && value.welcomeText.trim()
      ? value.welcomeText
      : DEFAULT_HOMEPAGE_CONTENT.welcomeText,
    guidelinesMarkdown: typeof value?.guidelinesMarkdown === 'string' && value.guidelinesMarkdown.trim()
      ? value.guidelinesMarkdown
      : DEFAULT_HOMEPAGE_CONTENT.guidelinesMarkdown,
    termsMarkdown: typeof value?.termsMarkdown === 'string' && value.termsMarkdown.trim()
      ? value.termsMarkdown
      : DEFAULT_HOMEPAGE_CONTENT.termsMarkdown,
  };
}

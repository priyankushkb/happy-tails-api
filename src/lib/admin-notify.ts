type SendEmailArgs = {
    to: string;
    subject: string;
    html: string;
  };
  
  function getEnv(name: string): string | undefined {
    const value = process.env[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  
  async function sendEmail({
    to,
    subject,
    html,
  }: SendEmailArgs): Promise<void> {
    const apiKey = getEnv('RESEND_API_KEY');
    const from = getEnv('NOTIFY_FROM_EMAIL');
  
    if (!apiKey || !from) {
      console.warn(
        '[admin-notify] Skipping email because RESEND_API_KEY or NOTIFY_FROM_EMAIL is missing.'
      );
      return;
    }
  
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      });
  
      if (!response.ok) {
        const body = await response.text();
        console.error('[admin-notify] Resend error:', response.status, body);
      }
    } catch (error) {
      console.error('[admin-notify] Failed to send email:', error);
    }
  }
  
  export async function notifyAdminByEmail({
    subject,
    html,
  }: {
    subject: string;
    html: string;
  }): Promise<void> {
    const to = getEnv('ADMIN_NOTIFY_EMAIL');
  
    if (!to) {
      console.warn(
        '[admin-notify] Skipping admin notification because ADMIN_NOTIFY_EMAIL is missing.'
      );
      return;
    }
  
    await sendEmail({
      to,
      subject,
      html,
    });
  }
  
  export async function notifyAdminUserRegistered(args: {
    fullName: string;
    email: string;
    phone?: string | null;
  }): Promise<void> {
    const { fullName, email, phone } = args;
  
    await notifyAdminByEmail({
      subject: 'New Happy Tails user registered',
      html: `
        <h2>New user registration</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || '-')}</p>
      `,
    });
  }
  
  export async function notifyAdminPetCreated(args: {
    ownerName: string;
    ownerEmail: string;
    petName: string;
    breed: string;
    age: string;
  }): Promise<void> {
    const { ownerName, ownerEmail, petName, breed, age } = args;
  
    await notifyAdminByEmail({
      subject: 'New pet registered in Happy Tails',
      html: `
        <h2>New pet created</h2>
        <p><strong>Owner:</strong> ${escapeHtml(ownerName)}</p>
        <p><strong>Owner email:</strong> ${escapeHtml(ownerEmail)}</p>
        <p><strong>Pet name:</strong> ${escapeHtml(petName)}</p>
        <p><strong>Breed:</strong> ${escapeHtml(breed)}</p>
        <p><strong>Age:</strong> ${escapeHtml(age)}</p>
      `,
    });
  }
  
  export async function notifyAdminBookingCreated(args: {
    ownerName: string;
    ownerEmail: string;
    petName: string;
    startDate: string;
    endDate: string;
    notes?: string;
  }): Promise<void> {
    const { ownerName, ownerEmail, petName, startDate, endDate, notes } = args;
  
    await notifyAdminByEmail({
      subject: 'New booking request in Happy Tails',
      html: `
        <h2>New booking request</h2>
        <p><strong>Owner:</strong> ${escapeHtml(ownerName)}</p>
        <p><strong>Owner email:</strong> ${escapeHtml(ownerEmail)}</p>
        <p><strong>Pet:</strong> ${escapeHtml(petName)}</p>
        <p><strong>Start date:</strong> ${escapeHtml(startDate)}</p>
        <p><strong>End date:</strong> ${escapeHtml(endDate)}</p>
        <p><strong>Notes:</strong> ${escapeHtml(notes || '-')}</p>
      `,
    });
  }
  
  export async function notifyAdminMessageReceived(args: {
    customerName: string;
    customerEmail: string;
    petName: string;
    bookingId: string;
    messageText: string;
  }): Promise<void> {
    const { customerName, customerEmail, petName, bookingId, messageText } = args;
  
    await notifyAdminByEmail({
      subject: 'New customer message in Happy Tails',
      html: `
        <h2>New customer message</h2>
        <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
        <p><strong>Customer email:</strong> ${escapeHtml(customerEmail)}</p>
        <p><strong>Pet:</strong> ${escapeHtml(petName)}</p>
        <p><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
        <p><strong>Message:</strong></p>
        <div style="white-space: pre-wrap;">${escapeHtml(messageText)}</div>
      `,
    });
  }
  
  export async function notifyCustomerMessageReply(args: {
    customerName: string;
    customerEmail: string;
    petName: string;
    bookingId: string;
    messageText: string;
  }): Promise<void> {
    const { customerName, customerEmail, petName, bookingId, messageText } = args;
  
    await sendEmail({
      to: customerEmail,
      subject: 'Happy Tails replied to your message 🐾',
      html: `
        <h2>You have a new message from Happy Tails</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>We replied to your booking conversation for <strong>${escapeHtml(petName)}</strong>.</p>
        <p><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
        <p><strong>Message:</strong></p>
        <div style="white-space: pre-wrap;">${escapeHtml(messageText)}</div>
        <p>Open your Happy Tails account to continue the conversation.</p>
      `,
    });
  }
  
  export async function notifyCustomerBookingCreated(args: {
    customerEmail: string;
    customerName: string;
    petName: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    const { customerEmail, customerName, petName, startDate, endDate } = args;
  
    await sendEmail({
      to: customerEmail,
      subject: 'Your Happy Tails booking request has been received 🐾',
      html: `
        <h2>Booking request received</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>We’ve received your booking request for <strong>${escapeHtml(petName)}</strong>.</p>
        <p><strong>Dates:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</p>
        <p>We’ll review it shortly and confirm availability as soon as possible.</p>
        <p>Thank you for choosing Happy Tails Auckland ❤️</p>
      `,
    });
  }
  
  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
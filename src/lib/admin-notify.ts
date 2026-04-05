type NotifyAdminArgs = {
    subject: string;
    html: string;
  };
  
  function getEnv(name: string): string | undefined {
    const value = process.env[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  
  export async function notifyAdminByEmail({
    subject,
    html,
  }: NotifyAdminArgs): Promise<void> {
    const apiKey = getEnv('RESEND_API_KEY');
    const to = getEnv('ADMIN_NOTIFY_EMAIL');
    const from = getEnv('NOTIFY_FROM_EMAIL');
  
    if (!apiKey || !to || !from) {
      console.warn(
        '[admin-notify] Skipping admin notification because RESEND_API_KEY, ADMIN_NOTIFY_EMAIL, or NOTIFY_FROM_EMAIL is missing.'
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
      console.error('[admin-notify] Failed to send admin email:', error);
    }
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
  
  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
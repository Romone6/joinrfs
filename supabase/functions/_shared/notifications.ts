type NotificationPayload = {
  subject: string;
  html: string;
};

export async function sendAdminNotification(payload: NotificationPayload): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL");
  const notificationEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");

  if (!resendApiKey || !fromEmail || !notificationEmail) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notificationEmail],
        reply_to: notificationEmail,
        subject: payload.subject,
        html: payload.html,
      }),
    });
  } catch {
    // Notifications are best-effort; never fail the caller.
  }
}

export function buildNotificationHtml(body: string, priority?: "High"): string {
  const banner = priority === "High"
    ? `<div style="background:#d32f2f;color:#fff;padding:12px 16px;font-weight:700;font-size:16px;border-radius:6px;margin-bottom:16px;">HIGH PRIORITY LEAD</div>`
    : "";
  return `<div style="font-family: Arial, sans-serif; color: #162033; line-height: 1.6;">${banner}<p>${body}</p></div>`;
}

export function buildSubject(subject: string, priority?: "High"): string {
  return priority === "High" ? `[HIGH] ${subject}` : subject;
}

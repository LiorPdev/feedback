export async function sendFeedbackNotification({
  to,
  songTitle,
  songSlug,
}: {
  to: string;
  songTitle: string;
  songSlug: string;
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY is missing, skipping email notification");
    return { success: false, error: "Email service not configured" };
  }

  // Use the app URL from env or fallback to localhost for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const songUrl = `${baseUrl}/show-feedback/${songSlug}`;

  const url = "https://api.brevo.com/v3/smtp/email";

  const body = {
    sender: { name: "Feedback Space", email: "contact@feedback.activitywiz.com" },
    to: [{ email: to }],
    subject: "פידבק חדש מחכה לך ב-Feedback Space!",
    htmlContent: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; text-align: right;">
        <p>היי,</p>
        <p>השיר <strong>${songTitle}</strong> קיבל פידבק חדש בקהילה.</p>
        <p>לצפייה בפידבק לחץ כאן:</p>
        <p><a href="${songUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">צפייה בפידבק</a></p>
        <br />
        <p>בהצלחה,<br />צוות Feedback Space</p>
      </div>
    `,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API error:", errorData);
      return { success: false, error: "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Email sending error" };
  }
}

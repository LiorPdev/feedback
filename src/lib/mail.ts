import { logToDb } from "./logger";

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
    await logToDb({
      message: "BREVO_API_KEY is missing, skipping email notification",
      source: "mail.ts:sendFeedbackNotification",
    });
    return { success: false, error: "Email service not configured" };
  }

  // Use the app URL from env or fallback to localhost for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const songUrl = `${baseUrl}/show-feedback/${songSlug}`;

  const url = "https://api.brevo.com/v3/smtp/email";

  const body = {
    sender: { name: "Feedback Space", email: "contact@feedback.activitywiz.com" },
    to: [{ email: to }],
    subject: "פידבק חדש מחכה לך בפידבק-ספייס!",
    htmlContent: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; text-align: right; color: #334155;">
        <p style="font-size: 16px;">
          היי! השיר שלך <strong>${songTitle}</strong> קיבל פידבק חדש בקהילה.
        </p>
        <p style="font-size: 16px; margin-top: 16px;">
          <a href="${songUrl}" style="color: #2563eb; text-decoration: underline; font-weight: bold;">לצפייה בפידבק לחץ כאן</a>
        </p>
        <br />
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
          בברכה,<br />
          <strong>צוות Feedback Space</strong>
        </p>
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
      await logToDb({
        message: "Brevo API error",
        data: errorData,
        source: "mail.ts:sendFeedbackNotification",
      });
      return { success: false, error: "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    await logToDb({
      message: "Error sending email",
      data: error,
      source: "mail.ts:sendFeedbackNotification",
    });
    return { success: false, error: "Email sending error" };
  }
}

export async function sendContactUsEmail({
  fromEmail,
  fromName,
  message,
}: {
  fromEmail: string;
  fromName: string;
  message: string;
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    await logToDb({
      message: "BREVO_API_KEY is missing, skipping contact email",
      source: "mail.ts:sendContactUsEmail",
    });
    return { success: false, error: "Email service not configured" };
  }

  const url = "https://api.brevo.com/v3/smtp/email";

  const body = {
    sender: { name: fromName, email: "contact@feedback.activitywiz.com" },
    to: [{ email: "contact@feedback.activitywiz.com" }],
    replyTo: { email: fromEmail, name: fromName },
    subject: `הודעה חדשה מ-${fromName} (Feedback Space)`,
    htmlContent: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; text-align: right;">
        <h2>הודעה חדשה מהאתר:</h2>
        <p><strong>מאת:</strong> ${fromName} (${fromEmail})</p>
        <p><strong>הודעה:</strong></p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
          ${message}
        </div>
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
      await logToDb({
        message: "Brevo API error (contact email)",
        data: errorData,
        source: "mail.ts:sendContactUsEmail",
      });
      return { success: false, error: "Failed to send contact email" };
    }

    return { success: true };
  } catch (error) {
    await logToDb({
      message: "Error sending contact email",
      data: error,
      source: "mail.ts:sendContactUsEmail",
    });
    return { success: false, error: "Contact email sending error" };
  }
}

export async function sendTopRatedNotification({
  to,
  songTitle,
}: {
  to: string;
  songTitle: string;
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    await logToDb({
      message: "BREVO_API_KEY is missing, skipping top-rated notification",
      source: "mail.ts:sendTopRatedNotification",
    });
    return { success: false, error: "Email service not configured" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const songUrl = `${baseUrl}/top-rated`;

  const url = "https://api.brevo.com/v3/smtp/email";

  const body = {
    sender: { name: "Feedback Space", email: "contact@feedback.activitywiz.com" },
    to: [{ email: to }],
    bcc: [{ email: "feedback.space.app@gmail.com" }],
    subject: `מזל טוב! השיר שלך נכנס ל-10 הגדולים בפידבק-ספייס! 🏆`,
    htmlContent: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; text-align: right; color: #334155;">
        <p style="font-size: 16px;">
          איזה כיף! השיר שלך <strong>${songTitle}</strong> נכנס לרשימת 10 השירים המובילים של הקהילה!
        </p>
        <p style="font-size: 16px; margin-top: 16px;">
          <a href="${songUrl}" style="color: #2563eb; text-decoration: underline; font-weight: bold;">לצפייה בדירוג המלא לחץ כאן</a>
        </p>
        <p style="font-size: 16px; color: #64748b; margin-top: 16px;">
          המוזיקה שלך נוגעת באנשים. המשיכו ליצור ולשתף!
        </p>
        <br />
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
          בברכה,<br />
          <strong>צוות Feedback Space</strong>
        </p>
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
      await logToDb({
        message: "Brevo API error (top-rated notification)",
        data: errorData,
        source: "mail.ts:sendTopRatedNotification",
      });
      return { success: false, error: "Failed to send top-rated notification" };
    }

    return { success: true };
  } catch (error) {
    await logToDb({
      message: "Error sending top-rated notification",
      data: error,
      source: "mail.ts:sendTopRatedNotification",
    });
    return { success: false, error: "Top-rated notification sending error" };
  }
}

export async function sendGiftNotification({
  to,
  amount,
  message,
  senderName,
}: {
  to: string;
  amount: number;
  message: string;
  senderName?: string;
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    await logToDb({
      message: "BREVO_API_KEY is missing, skipping gift notification",
      source: "mail.ts:sendGiftNotification",
    });
    return { success: false, error: "Email service not configured" };
  }

  const url = "https://api.brevo.com/v3/smtp/email";

  const body = {
    sender: { name: "Feedback Space", email: "contact@feedback.activitywiz.com" },
    to: [{ email: to }],
    subject: message
      ? "קיבלת מתנה והודעה אישית בפידבק-ספייס! 🎁"
      : "קיבלת מתנה חדשה בפידבק-ספייס! 🎁",
    htmlContent: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; text-align: right; color: #334155;">
        <h2 style="color: #2563eb; margin-top: 0;">${senderName ? `${senderName} ממש אהב/ה את השיר שלך!` : "מישהו ממש אהב את השיר שלך!"}</h2>
        <p style="font-size: 16px;">
          קיבלת מתנה של <strong>${amount} קרדיטים</strong>${message ? " והודעה אישית:" : "!"}
        </p>
        ${message ? `
          <div style="padding: 16px; margin: 20px 0; border-right: 4px solid #2563eb; font-style: italic; color: #334155; background-color: #f1f5f9;">
            ${message}
          </div>
        ` : ""}
        ${senderName ? `<p style="font-size: 16px; color: #64748b; margin-bottom: 16px;">מאת: <strong>${senderName}</strong></p>` : ""}
        <p style="font-size: 16px;">
          הקרדיטים נוספו ליתרה שלך באתר. תוכלו להשתמש בהם כדי לקדם את השירים הבאים שלכם.
        </p>
        <p style="font-size: 16px; margin-top: 16px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://feedback.activitywiz.com'}" style="color: #2563eb; text-decoration: underline; font-weight: bold;">לכניסה לפידבק-ספייס לחץ כאן</a>
        </p>
        <br />
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
          בברכה,<br />
          <strong>צוות Feedback Space</strong>
        </p>
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
      await logToDb({
        message: "Brevo API error (gift notification)",
        data: errorData,
        source: "mail.ts:sendGiftNotification",
      });
      return { success: false, error: "Failed to send gift notification" };
    }

    return { success: true };
  } catch (error) {
    await logToDb({
      message: "Error sending gift notification",
      data: error,
      source: "mail.ts:sendGiftNotification",
    });
    return { success: false, error: "Gift notification sending error" };
  }
}

export async function sendUnreadFeedbackReminder({
  to,
  songTitle,
  unreadCount,
}: {
  to: string;
  songTitle?: string;
  unreadCount: number;
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    await logToDb({
      message: "BREVO_API_KEY is missing, skipping unread feedback reminder",
      source: "mail.ts:sendUnreadFeedbackReminder",
    });
    return { success: false, error: "Email service not configured" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/dashboard?tab=songs`;

  const url = "https://api.brevo.com/v3/smtp/email";

  const body = {
    sender: { name: "Feedback Space", email: "contact@feedback.activitywiz.com" },
    to: [{ email: to }],
    subject: `תזכורת, מחכים לך פידבקים חדשים שטרם קראת`,
    htmlContent: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; text-align: right; color: #334155;">
        <p style="font-size: 16px;">
          היי,
        </p>
        <p style="font-size: 16px;">
          רצינו להזכיר שמחכים לך <strong>${unreadCount}</strong> פידבקים חדשים ${songTitle ? `מחברי הקהילה על השיר <strong>${songTitle}</strong>,` : "מחברי הקהילה על השירים שלך,"} שטרם קראת.
        </p>
        <p style="font-size: 15px; margin: 20px 0; padding: 16px; border-right: 4px solid #cbd5e1; line-height: 1.5; background-color: #f8fafc;">
          <strong style="color: #1e293b;">חשוב לדעת:</strong> 
          שירים עם פידבקים שטרם נקראו לא מוצגים עוד לקהילה כדי למנוע השקעת מאמץ מיותרת מצידם. 
          מיד לאחר קריאת הפידבקים החדשים, השיר יחזור להופיע בפיד. 
          <span style="display: block; margin-top: 8px; font-size: 14px; color: #64748b;">
            לתשומת לבך, שירים עם פידבקים שלא ייקראו לאורך זמן יוסרו מהמערכת.
          </span>
        </p>
        <p style="font-size: 16px; margin-top: 16px;">
          <a href="${dashboardUrl}" style="color: #2563eb; text-decoration: underline; font-weight: bold;">לצפייה בפידבקים לחץ כאן</a>
        </p>
        <br />
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
          בברכה,<br />
          <strong>צוות Feedback Space</strong>
        </p>
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
      await logToDb({
        message: "Brevo API error (unread feedback reminder)",
        data: errorData,
        source: "mail.ts:sendUnreadFeedbackReminder",
      });
      return { success: false, error: "Failed to send reminder" };
    }

    return { success: true };
  } catch (error) {
    await logToDb({
      message: "Error sending reminder email",
      data: error,
      source: "mail.ts:sendUnreadFeedbackReminder",
    });
    return { success: false, error: "Reminder email sending error" };
  }
}
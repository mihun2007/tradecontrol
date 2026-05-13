import type { WeeklyReport } from "@/lib/notifications";

export type EmailTemplate = {
  subject: string;
  previewText: string;
  text: string;
  html: string;
};

type TemplateOptions = {
  appUrl?: string;
  displayName?: string;
};

export function welcomeEmailTemplate({ appUrl = getAppUrl(), displayName = "Trader" }: TemplateOptions = {}): EmailTemplate {
  return buildTemplate({
    body: [
      `Welcome to TradeControl, ${displayName}.`,
      "Your trading journal is ready. Start by adding your first trades, defining risk rules, and completing a short review after each session.",
      "TradeControl helps you improve process quality, risk discipline, emotional review, and performance awareness."
    ],
    ctaHref: `${appUrl}/dashboard`,
    ctaLabel: "Open dashboard",
    previewText: "Your TradeControl journal and risk desk are ready.",
    subject: "Welcome to TradeControl"
  });
}

export function subscriptionActivatedEmailTemplate({ appUrl = getAppUrl(), displayName = "Trader" }: TemplateOptions = {}): EmailTemplate {
  return buildTemplate({
    body: [
      `Your Pro workspace is active, ${displayName}.`,
      "You now have access to unlimited journaling, advanced analytics, reports, screenshots, and deeper AI Coach analysis.",
      "Use the extra visibility to review your process, not to chase signals."
    ],
    ctaHref: `${appUrl}/dashboard`,
    ctaLabel: "Go to TradeControl",
    previewText: "Your TradeControl Pro workspace is active.",
    subject: "TradeControl Pro is active"
  });
}

export function dailyTradingReminderTemplate(displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      "Before you trade, review your max risk, max trades, stop conditions, and the setup quality you require today.",
      "A calm session starts before the first entry."
    ],
    ctaHref: `${appUrl}/risk-manager`,
    ctaLabel: "Review risk rules",
    previewText: "A quick discipline check before your first setup.",
    subject: "Review your trading plan before the session"
  });
}

export function dailyReviewReminderTemplate(displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      "Your daily review is waiting. Capture your emotions, rule discipline, mistakes, and one improvement for the next session.",
      "This reminder is for process review only."
    ],
    ctaHref: `${appUrl}/calendar`,
    ctaLabel: "Complete daily review",
    previewText: "Capture emotions, mistakes, and lessons while the session is fresh.",
    subject: "Complete today's trading review"
  });
}

export function weeklyReportTemplate(report: WeeklyReport, displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      `Weekly P/L: ${formatSignedCurrency(report.weeklyProfitLoss)}`,
      `Win rate: ${report.winRate.toFixed(1)}%`,
      `Total trades: ${report.totalTrades}`,
      `Best instrument: ${report.bestInstrument}`,
      `Main mistake: ${report.mainMistake}`,
      `Discipline score: ${report.disciplineScore}/100`
    ],
    ctaHref: `${appUrl}/reports`,
    ctaLabel: "Open weekly review",
    previewText: `Discipline score: ${report.disciplineScore}/100 · Win rate: ${report.winRate.toFixed(1)}%`,
    subject: "Your TradeControl weekly report is ready"
  });
}

export function freeLimitReachedTemplate(reason: string, displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      reason,
      "Your Free plan is designed for testing the journal. Pro unlocks unlimited trades, reports, screenshots, and deeper analytics."
    ],
    ctaHref: `${appUrl}/pricing`,
    ctaLabel: "View Pro plan",
    previewText: "You reached a Free plan limit in TradeControl.",
    subject: "You reached a TradeControl Free limit"
  });
}

export function abandonedCheckoutReminderTemplate(displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      "You started upgrading to TradeControl Pro but did not finish checkout.",
      "When you are ready, you can return to pricing and continue. This placeholder is ready for a future scheduler or checkout recovery workflow."
    ],
    ctaHref: `${appUrl}/pricing`,
    ctaLabel: "Return to pricing",
    previewText: "Your TradeControl Pro checkout can be continued when you are ready.",
    subject: "Continue your TradeControl Pro upgrade"
  });
}

export function stopTradingWarningTemplate(reason: string, displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      reason,
      "Pause and review your rules before taking another trade. You are responsible for your own trading decisions."
    ],
    ctaHref: `${appUrl}/risk-manager`,
    ctaLabel: "Review risk status",
    previewText: reason,
    subject: "Stop trading warning"
  });
}

export function ruleViolationAlertTemplate(message: string, displayName = "Trader", appUrl = getAppUrl()): EmailTemplate {
  return buildTemplate({
    body: [
      `Hi ${displayName},`,
      message,
      "Review the trade context and decide whether continuing today still fits your written plan."
    ],
    ctaHref: `${appUrl}/calendar`,
    ctaLabel: "Open daily review",
    previewText: message,
    subject: "Rule violation alert"
  });
}

function buildTemplate({
  body,
  ctaHref,
  ctaLabel,
  previewText,
  subject
}: {
  body: string[];
  ctaHref: string;
  ctaLabel: string;
  previewText: string;
  subject: string;
}): EmailTemplate {
  const paragraphs = body.map((line) => `<p style="margin:0 0 16px;color:#d4d4d8;font-size:15px;line-height:1.7;">${escapeHtml(line)}</p>`).join("");
  const text = [
    subject,
    "",
    ...body,
    "",
    ctaLabel,
    ctaHref,
    "",
    "TradeControl is a journaling, analytics, and discipline tool. It does not provide financial advice, buy/sell signals, market predictions, or profit guarantees.",
    "Manage email preferences in TradeControl Settings."
  ].join("\n");

  return {
    html: `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>${escapeHtml(subject)}</title>
        </head>
        <body style="margin:0;background:#090b10;padding:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090b10;padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #272b35;border-radius:28px;background:#11141b;overflow:hidden;">
                  <tr>
                    <td style="padding:28px 28px 18px;">
                      <div style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid #244c3b;background:#12241d;padding:8px 12px;color:#34d399;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">TradeControl</div>
                      <h1 style="margin:22px 0 12px;color:#ffffff;font-size:30px;line-height:1.15;letter-spacing:0;">${escapeHtml(subject)}</h1>
                      <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.7;">${escapeHtml(previewText)}</p>
                      ${paragraphs}
                      <a href="${escapeAttribute(ctaHref)}" style="display:inline-block;margin-top:8px;border-radius:18px;background:#ffffff;color:#090b10;padding:14px 18px;text-decoration:none;font-size:14px;font-weight:800;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #272b35;padding:20px 28px 26px;">
                      <p style="margin:0 0 10px;color:#a1a1aa;font-size:12px;line-height:1.6;">TradeControl is a journaling, analytics, and discipline tool. It does not provide financial advice, buy/sell signals, market predictions, or profit guarantees.</p>
                      <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">Manage email preferences in <a href="${escapeAttribute(`${getAppUrl()}/settings`)}" style="color:#34d399;text-decoration:none;">TradeControl Settings</a>. Unsubscribe link placeholder.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>`,
    previewText,
    subject,
    text
  };
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function formatSignedCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(Math.abs(value));

  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

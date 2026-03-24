import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { LobsterMail } from "@lobsterkit/lobstermail";

let client: LobsterMail | null = null;

function getClient(apiKey?: string): LobsterMail {
  if (!client) {
    client = new LobsterMail(apiKey ? { apiKey } : undefined);
  }
  return client;
}

export default definePluginEntry({
  id: "lobstermail",
  name: "LobsterMail",
  description:
    "Email for AI agents. Create inboxes, receive and send email. No API keys, no human signup.",

  register(api) {
    const cfg = api.config as { apiKey?: string } | undefined;
    const lm = () => getClient(cfg?.apiKey);

    // ── create_inbox ──────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_create_inbox",
      description:
        "Create a new @lobstermail.ai email inbox. Provide name/org for a meaningful address, or omit for random.",
      parameters: Type.Object({
        name: Type.Optional(Type.String({ description: "Your name or agent name" })),
        org: Type.Optional(Type.String({ description: "Organization name" })),
        preferred: Type.Optional(Type.Array(Type.String(), { description: "Local parts to try first" })),
        displayName: Type.Optional(Type.String({ description: "Display name for the inbox" })),
      }),
      async execute(_id, params) {
        const hasSmartOpts = params.name || params.org || params.preferred;
        const inbox = hasSmartOpts
          ? await lm().createSmartInbox(params)
          : await lm().createInbox({ displayName: params.displayName });

        return {
          content: [
            {
              type: "text",
              text: `Inbox created.\n\nAddress: ${inbox.address}\nInbox ID: ${inbox.id}\nActive: ${inbox.isActive}`,
            },
          ],
        };
      },
    });

    // ── check_inbox ───────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_check_inbox",
      description: "List recent emails in an inbox.",
      parameters: Type.Object({
        inbox_id: Type.String({ description: "Inbox ID (e.g. ibx_...)" }),
        limit: Type.Optional(Type.Number({ description: "Max emails to return (default: 20)" })),
        since: Type.Optional(Type.String({ description: "Only emails after this ISO 8601 timestamp" })),
      }),
      async execute(_id, params) {
        const inbox = await lm().getInbox(params.inbox_id);
        const emails = await inbox.receive({ limit: params.limit, since: params.since });

        if (emails.length === 0) {
          return { content: [{ type: "text", text: "No emails found." }] };
        }

        const lines = emails.map(
          (e) =>
            `- [${e.id}] From: ${e.from} | Subject: ${e.subject} | ${e.createdAt}` +
            (e.isInjectionRisk ? " \u26a0\ufe0f INJECTION RISK" : ""),
        );

        return {
          content: [
            {
              type: "text",
              text: `${emails.length} email(s):\n\n${lines.join("\n")}\n\nUse lobstermail_get_email to read full body.`,
            },
          ],
        };
      },
    });

    // ── wait_for_email ────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_wait_for_email",
      description:
        "Wait for an incoming email (real-time long-poll). Returns the email body in LLM-safe format.",
      parameters: Type.Object({
        inbox_id: Type.String({ description: "Inbox ID" }),
        from: Type.Optional(Type.String({ description: "Filter by sender address" })),
        subject: Type.Optional(Type.String({ description: "Filter by subject (substring)" })),
        timeout: Type.Optional(Type.Number({ description: "Max wait ms (default 60000, max 120000)" })),
      }),
      async execute(_id, params) {
        const inbox = await lm().getInbox(params.inbox_id);
        const timeout = Math.min(params.timeout ?? 60_000, 120_000);
        const email = await inbox.waitForEmail({
          filter: { from: params.from, subject: params.subject },
          timeout,
        });

        if (!email) {
          return {
            content: [{ type: "text", text: `No matching email within ${timeout / 1000}s.` }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Email received!\n\nEmail ID: ${email.id}\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.safeBodyForLLM()}`,
            },
          ],
        };
      },
    });

    // ── get_email ─────────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_get_email",
      description: "Get a single email by ID with full body in LLM-safe format.",
      parameters: Type.Object({
        inbox_id: Type.String({ description: "Inbox ID" }),
        email_id: Type.String({ description: "Email ID (e.g. eml_...)" }),
      }),
      async execute(_id, params) {
        const inbox = await lm().getInbox(params.inbox_id);
        const email = await inbox.getEmail(params.email_id);

        return {
          content: [
            {
              type: "text",
              text: [
                `From: ${email.from}`,
                `To: ${email.to.join(", ")}`,
                `Subject: ${email.subject}`,
                `Date: ${email.createdAt}`,
                email.isInjectionRisk ? `\u26a0\ufe0f INJECTION RISK` : "",
                "",
                email.safeBodyForLLM(),
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      },
    });

    // ── send_email ────────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_send_email",
      description: "Send an email from an inbox. Requires verified account (Tier 1+).",
      parameters: Type.Object({
        inbox_id: Type.String({ description: "Inbox ID to send from" }),
        to: Type.Array(Type.String(), { description: "Recipient email addresses" }),
        subject: Type.String({ description: "Email subject" }),
        body_text: Type.String({ description: "Plain text email body" }),
        body_html: Type.Optional(Type.String({ description: "HTML email body" })),
        cc: Type.Optional(Type.Array(Type.String(), { description: "CC recipients" })),
        in_reply_to: Type.Optional(Type.String({ description: "Message-ID for threading" })),
      }),
      async execute(_id, params) {
        const inbox = await lm().getInbox(params.inbox_id);
        const result = await inbox.send({
          to: params.to,
          cc: params.cc,
          subject: params.subject,
          body: { text: params.body_text, html: params.body_html },
          inReplyTo: params.in_reply_to,
        });

        return {
          content: [
            { type: "text", text: `Email queued.\n\nEmail ID: ${result.id}\nStatus: ${result.status}` },
          ],
        };
      },
    });

    // ── list_inboxes ──────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_list_inboxes",
      description: "List all active inboxes for this account.",
      parameters: Type.Object({}),
      async execute() {
        const inboxes = await lm().listInboxes();

        if (inboxes.length === 0) {
          return {
            content: [{ type: "text", text: "No inboxes. Use lobstermail_create_inbox to create one." }],
          };
        }

        const lines = inboxes.map(
          (i) => `- [${i.id}] ${i.address} (${i.emailCount} emails, active: ${i.isActive})`,
        );

        return { content: [{ type: "text", text: `${inboxes.length} inbox(es):\n\n${lines.join("\n")}` }] };
      },
    });

    // ── delete_inbox ──────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_delete_inbox",
      description: "Soft-delete an inbox (7-day grace period).",
      parameters: Type.Object({
        inbox_id: Type.String({ description: "Inbox ID to delete" }),
      }),
      async execute(_id, params) {
        await lm().deleteInbox(params.inbox_id);
        return {
          content: [{ type: "text", text: `Inbox ${params.inbox_id} soft-deleted. Permanent in 7 days.` }],
        };
      },
    });

    // ── get_account ───────────────────────────────────────────────
    api.registerTool({
      name: "lobstermail_get_account",
      description: "Get account info: tier, limits, usage.",
      parameters: Type.Object({}),
      async execute() {
        const acct = await lm().getAccount();

        return {
          content: [
            {
              type: "text",
              text: [
                `Account: ${acct.id}`,
                `Tier: ${acct.tier} (${acct.tierName})`,
                `Can send: ${acct.limits.canSend}`,
                `Max inboxes: ${acct.limits.maxInboxes ?? "unlimited"}`,
                `Inboxes used: ${acct.usage.inboxCount}`,
              ].join("\n"),
            },
          ],
        };
      },
    });
  },
});

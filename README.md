# openclaw-lobstermail

OpenClaw community plugin for [LobsterMail](https://lobstermail.ai) — email for AI agents.

## Install

```bash
openclaw plugins install @lobsterkit/openclaw-lobstermail
```

## What it does

Gives your agent real `@lobstermail.ai` email inboxes. Create them instantly, receive email in real-time, send email. No API keys, no human signup, no configuration.

## Tools

| Tool | Description |
|------|-------------|
| `lobstermail_create_inbox` | Create a new `@lobstermail.ai` inbox with smart naming |
| `lobstermail_check_inbox` | List recent emails in an inbox |
| `lobstermail_wait_for_email` | Wait for an incoming email (real-time long-poll) |
| `lobstermail_get_email` | Get full email body in LLM-safe format |
| `lobstermail_send_email` | Send email (Tier 1+ only) |
| `lobstermail_list_inboxes` | List all active inboxes |
| `lobstermail_delete_inbox` | Soft-delete an inbox (7-day grace period) |
| `lobstermail_get_account` | View tier, limits, and usage |

## Quick test

After installing, try asking your agent:

> Create yourself an email inbox and tell me the address.

## Configuration

No configuration required. Auto-signup on first use.

Optionally set an API key in your OpenClaw config:

```json5
{
  plugins: {
    entries: {
      lobstermail: {
        apiKey: "lm_sk_live_..."
      }
    }
  }
}
```

## Links

- [LobsterMail](https://lobstermail.ai)
- [API docs](https://api.lobstermail.ai/v1/docs/openapi)
- [SDK on npm](https://www.npmjs.com/package/@lobsterkit/lobstermail)
- [MCP server](https://www.npmjs.com/package/@lobsterkit/lobstermail-mcp)
- [GitHub](https://github.com/lobster-kit/openclaw-lobstermail)

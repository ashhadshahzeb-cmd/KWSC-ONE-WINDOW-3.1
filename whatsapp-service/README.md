# 🤖 KWSC File Tracking WhatsApp Bot

An automated WhatsApp Bot & Interactive Assistant for the **KWSC One Window Facility System** built with `whatsapp-web.js`, `node-cron`, and Supabase Realtime.

---

## ✨ Features

1. **🤖 Interactive Chatbot (Two-Way Queries)**:
   - `STATUS <Diary/Receiving No>` — Instantly fetch file status, current section, inward date, handover person, amount, and movement history.
   - `SUMMARY` or `SUMMARY TODAY` — Instant live metrics: today's inward files, forward count, disposed count, active pending, and delayed files.
   - `PENDING` or `DELAYED` — Top files delayed/stuck for more than 3 days.
   - `HELP` or `MENU` — Displays the command guide.

2. **⏰ Automated Daily Evening Digest (5:00 PM PKT Cron)**:
   - Automatically computes and broadcasts daily statistics every day at 5:00 PM to configured numbers.
   - Includes delayed files warning and section-wise backlog breakdown.

3. **⚡ Live Database Event Alerts**:
   - `file_tracking_records` INSERT: New file registered alert.
   - `file_tracking_records` UPDATE: File moved / section updated alert.
   - `activity_log` INSERT: Forward / Delete activity alert.
   - Built-in deduplication filter (prevents double messages within 10 seconds).

---

## 🚀 Getting Started

### 1. Configure `.env`
Inside the `whatsapp-service/` folder, ensure your `.env` contains:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Comma-separated WhatsApp numbers (with country code e.g. 923001234567@c.us)
TARGET_PHONE_NUMBERS="923001234567@c.us,923111111111@c.us"

# Scheduled Daily Digest (5:00 PM Pakistan Time)
CRON_DIGEST_SCHEDULE="0 17 * * *"

# Delayed file threshold (in days)
DELAYED_THRESHOLD_DAYS=3
```

### 2. Start the Bot
```bash
cd whatsapp-service
npm install
npm start
```

### 3. Scan QR Code
When you start the service for the first time, a QR code will appear in the terminal.
Scan it with your dedicated WhatsApp account (Linked Devices > Link a Device).

The session will be saved locally in `.wwebjs_auth/` so you won't need to rescan every time.

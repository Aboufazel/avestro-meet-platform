# فعال‌سازی JWT روی Jitsi (meet.avestro.ir) — گام ۲

هدف: نقش «میزبان» (moderator) را سرور تعیین کند، نه «اولین نفری که وارد شد»، تا اجازه‌ی صحبت/تصویر واقعاً روی سرور اعمال شود.
تا زمانی که `JITSI_JWT_ENABLED=False` است، هیچ چیز در سمینارهای فعلی عوض نمی‌شود.

## الف) فقط خواندن (روی سرور، بدون تغییر)

```bash
cd /opt/avestro-meet
docker ps --format '{{.Names}}  {{.Image}}'          # نسخه‌ی image ها
grep -v -i -E 'SECRET|PASSWORD' .env | grep -i -E 'AUTH|JWT|GUEST|XMPP_DOMAIN|PUBLIC_URL|AV_MODERATION|ENABLE_' 
docker exec avestro-meet-prosody-1 sh -c 'ls /prosody-plugins 2>/dev/null | grep -i -E "moderation|token"'
docker exec avestro-meet-prosody-1 sh -c 'grep -n -i -E "authentication|av_moderation|token_verification" /config/conf.d/*.cfg.lua /config/prosody.cfg.lua 2>/dev/null'
```

خروجی را (بدون رمزها) بفرست. با آن مشخص می‌شود:
- الان `AUTH_TYPE` چیست (internal / jwt / anonymous)؛
- ماژول `av_moderation` در Prosody هست یا نه (بدون آن «اجازه‌ی صحبت» فقط سمت مرورگر است و دور زدنش ممکن است)؛
- نسخه‌ی Jitsi.

## ب) تنظیمات پیشنهادی (فقط بعد از بررسی الف)

در `/opt/avestro-meet/.env` (نام متغیرها را با `env.example` همان نسخه مقایسه کن):

```
ENABLE_AUTH=1
ENABLE_GUESTS=0
AUTH_TYPE=jwt
JWT_APP_ID=avestro-meet
JWT_APP_SECRET=<یک رشته‌ی تصادفی بلند>
JWT_ACCEPTED_ISSUERS=avestro-meet
JWT_ACCEPTED_AUDIENCES=avestro-meet
XMPP_DOMAIN=meet.jitsi
ENABLE_AV_MODERATION=1      # اگر در env.example نسخه‌ات هست
```

تولید رمز: `openssl rand -hex 32`

در `.env` بک‌اند Django (همان مقادیر):

```
JITSI_JWT_ENABLED=True
JITSI_JWT_APP_ID=avestro-meet
JITSI_JWT_SECRET=<همان رمز>
JITSI_JWT_SUB=meet.jitsi
```

اجرا: `docker compose up -d` در پوشه‌ی Jitsi، سپس ری‌استارت Django.

## ج) ترتیب امن
1. اول کد جدید را منتشر کن (با `JITSI_JWT_ENABLED=False`) و مطمئن شو سمینار سالم است.
2. در یک ساعت کم‌تردد، بخش ب را اعمال کن.
3. تست: (۱) میزبان وارد شود و moderator باشد؛ (۲) مهمان/دانش‌آموز وارد شود و moderator نباشد؛ (۳) بدون توکن (باز کردن مستقیم WebSocket) وارد نشود؛ (۴) سمینار فعلی ورود و صدا و تصویر و اشتراک صفحه را درست انجام دهد.
4. **بازگشت:** `AUTH_TYPE` و `ENABLE_AUTH` را به مقدار قبلی برگردان، `JITSI_JWT_ENABLED=False` کن، دوباره `docker compose up -d`.

## نکته‌ها
- نام اتاق در توکن (`room`) با حروف کوچک ساخته می‌شود و فرانت هم همین‌طور وصل می‌شود؛ شناسه‌ی رویدادهای فارسی (که صفحه‌ی ویرایش اجازه می‌دهد) را یک بار تست کن.
- توکن‌ها ۱۲ ساعت اعتبار دارند و هنگام reconnect از `/rooms/<slug>/jitsi-token/` تمدید می‌شوند.

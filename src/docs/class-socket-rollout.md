# WebSocket کلاس (اجازه‌ی صحبت و دست‌بلندکردن)

سمینارها و API فعلی دست‌نخورده می‌مانند؛ یک سرویس جدا (`django-ws`) فقط WebSocket را نگه می‌دارد.

## ۱) سرور: بک‌اند
```bash
cd <پوشه‌ی backend>
docker compose up -d --build            # سرویس جدید django-ws روی پورت 8001
docker compose exec django python manage.py migrate     # جدول MediaAccess
```

## ۲) nginx (روی میزبان API، مثلاً raya-api.avestro.ir) — داخل همان server block
```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```
سپس: `nginx -t && systemctl reload nginx`

## ۳) فرانت
آدرس WebSocket از `VITE_API_BASE_URL` ساخته می‌شود (`https://…/api/v1` ← `wss://…`). اگر API و WS روی دامنه‌های جدا هستند:
`VITE_WS_BASE_URL=wss://raya-api.avestro.ir`
بعد بیلد دوباره‌ی فرانت.

## ۴) تست سریع
1. یک کلاس بساز، با حساب معلم وارد شو و در پنجره‌ی ناشناس با یک مهمان.
2. مهمان نباید دکمه‌ی میکروفون و دوربین ببیند؛ فقط «بلندکردن دست».
3. دست را بلند کن ← معلم در تب «شرکت‌کنندگان» او را در بالای فهرست می‌بیند ← «اجازه بده» ← دکمه‌ها همان لحظه برای مهمان ظاهر می‌شوند.
4. «پس‌گرفتن» ← میکروفون/دوربین مهمان بسته و دکمه‌ها ناپدید می‌شوند.
5. سمینار قدیمی: ورود، صدا، تصویر، چت، اشتراک صفحه مثل قبل.

## بازگشت
سرویس `django-ws` را متوقف کن (`docker compose stop django-ws`). سمینارها اثر نمی‌پذیرند؛ در کلاس‌ها دکمه‌ی میکروفون/دوربین دانش‌آموز پنهان می‌ماند، پس برای بازگشت کامل `speak_permission` را برای آن کلاس‌ها خاموش کن.

## نکته‌ها
- این روش اجازه‌ها را در خود برنامه اعمال می‌کند؛ فعال‌سازی JWT روی Jitsi (`docs/jitsi-jwt-rollout.md`) دیگر الزامی نیست.
- هنگام نصب، `ENABLE_AV_MODERATION` را روی Jitsi روشن **نکن**؛ با اجازه‌ی خود برنامه تداخل می‌کند.
- اتصال لحظه‌ای یک پردازش `daphne` دارد (حافظه‌ی داخلی). برای چند پردازش باید Redis اضافه شود.

# رفع اسلوموشن و داغ‌شدن گوشی در جلسه (lib-jitsi-meet)

## ریشه‌ی مشکل
کلاینت روی هر دستگاهی «همه‌ی» ویدیوها را decode می‌کرد و دوربین خودش را هم بدون سقف encode می‌کرد.
بخش بزرگی از تنظیمات کیفیت (`TRACK_CONFIG`, `RECEIVER_QUALITY`, `constraints`, `resolution`, ...) یا هیچ‌جا استفاده نمی‌شد
یا کلیدهایی بود که lib-jitsi-meet اصلاً نمی‌خواند.

## دریافت ویدیو (اسلوموشن وقتی تعداد تصویر زیاد می‌شود)
| مشکل | فیکس | فایل |
|---|---|---|
| `conference.selectParticipants` در API فعلی وجود ندارد؛ `setPreferredParticipants` همیشه بی‌صدا `false` برمی‌گرداند | جایگزین با `setReceiverConstraints` (lastN، selectedSources، onStageSources، سقف ارتفاع هر source) | JitsiController.js |
| هیچ سقفی روی تعداد `<video>` زنده نبود | «بودجه‌ی ویدیو» بر اساس توان دستگاه (۴ / ۶ / ۱۲)؛ بقیه آواتار + فقط صدا. همین لیست به bridge هم اعلام می‌شود | VideoGrid.jsx، VideoTile.jsx، jitsi-config.js |
| `RECEIVER_QUALITY` استفاده نمی‌شد | تایل بزرگ ۳۶۰/۴۸۰/۷۲۰، بقیه ۱۸۰؛ اشتراک صفحه ۷۲۰ | JitsiController.js |
| ویدیو در پس‌زمینه/صفحه‌ی خاموش هم decode می‌شد | با `document.hidden` (بعد از ۳ ثانیه) `lastN=0`؛ هنگام ضبط محلی غیرفعال | VideoGrid.jsx |
| با هر تغییر گوینده‌ی فعال، همه‌ی تایل‌ها re-render می‌شدند | subscribe فقط به boolean مخصوص همان تایل | useParticipants.js |
| `renegotiationTick` سراسری: روی iOS/Safari با هر تغییر track یک نفر، ویدیوی همه detach/attach می‌شد | tick جداگانه برای هر participant | meeting-store.js، VideoTile.jsx، meeting-actions.js |
| `_updateParticipant` حتی بدون تغییر، کل Map را کپی می‌کرد | اگر مقداری عوض نشده، state تغییر نمی‌کند | meeting-store.js |

## ارسال (انکودر گوشی)
| مشکل | فیکس |
|---|---|
| `createLocalTracks` بدون رزولوشن صدا زده می‌شد؛ `TRACK_CONFIG` هیچ‌جا import نشده بود | `resolution` (۳۶۰/۴۸۰/۷۲۰ بر اساس دستگاه) + `setSenderVideoConstraint` بعد از افزودن دوربین، و دوباره بعد از unmute |
| کلیدهای `resolution/constraints/maxFullResolutionParticipants/disableSimulcast/enableLayerSuspension/audioQuality/...` در `CONFERENCE_CONFIG` بی‌اثر بودند | حذف شدند (در IConferenceOptions نیستند)؛ کلیدهای معتبر جایگزین شدند |
| کدک پیش‌فرض می‌تواند AV1/VP9 نرم‌افزاری باشد | `videoQuality.codecPreferenceOrder`: روی دستگاه ضعیف/موبایل `VP8, H264` |
| پردازش دائمی audio-level و تشخیص noisy-mic/no-audio که خروجی‌شان هیچ‌جا مصرف نمی‌شد | `audioLevelsInterval` بزرگ‌تر؛ دو تشخیص بی‌مصرف خاموش |

## نشتی‌ها (گرم شدن بعد از یک ساعت)
| مشکل | فیکس |
|---|---|
| `_attemptReconnect` فقط listener ها را برمی‌داشت؛ conference و connection قبلی (WebSocket + PeerConnection + decoder) هرگز بسته نمی‌شد و با هر قطعی یک نسخه روی هم جمع می‌شد | `leave()` و `disconnect()` قبلی با timeout ۴ ثانیه |
| `_lastJoinParams` هیچ‌جا ست نمی‌شد، پس reconnect کامل هیچ‌وقت اجرا نمی‌شد | در `join()` ست می‌شود |
| `_trackStreamingListeners` پاک نمی‌شد | در cleanup پاک می‌شود |
| ضبط جلسه/صدا بعد از خروج از جلسه ادامه داشت (getDisplayMedia + میکروفون + AudioContext + interval) | `leaveMeeting` آن‌ها را متوقف می‌کند |
| «Stop sharing» مرورگر فقط recorder را می‌بست؛ تایمر و state اپ باز می‌ماند | callback `onEnded` |
| ضبط صدا کل صفحه را با فریم‌ریت کامل capture می‌کرد (ویدیو استفاده نمی‌شد) | ۱ فریم/ثانیه و حداکثر ۶۴۰×۳۶۰ |
| ضبط جلسه اول AV1 را انتخاب می‌کرد | ترتیب: VP8، VP9 |

## GPU / رندر
- `backdrop-filter: blur` روی چیپ‌های وضعیت، دکمه‌ها، overlay، نوار کنترل و ... که روی ویدیوی زنده قرار دارند حذف شد (هر فریم دوباره محاسبه می‌شد).
- hover-lift تایل فقط روی دستگاه‌های hover واقعی؛ انیمیشن‌های بی‌پایان تزئینی روی touch خاموش شد.

## هنوز باید روی دستگاه واقعی تست شود
- فریم‌ریت دوربین best-effort است (`applyConstraints`)؛ در API ساخت track گزینه‌ای برای آن نیست.
- آستانه‌ها در `PERF` (jitsi-config.js) قابل تنظیم‌اند.
- `enableIceRestart` عمداً روشن نشد (به پشتیبانی Jicofo وابسته است)؛ تا آن موقع مسیر `restartJvbIce` اجرا نمی‌شود.

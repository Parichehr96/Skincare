# Skincare survey on Vercel

The page is `index.html`. Answers go to `/api/submit` and are kept in an Upstash Redis database. You download them as a CSV from `/api/export`.

## Set it up (about 10 minutes)

1. **Deploy the folder.** Put this folder in a GitHub repo and import it in Vercel (Add New, then Project), or run `vercel` in the folder. No framework or build command is needed.
2. **Add storage.** In the Vercel project, open Storage, pick Upstash for Redis from the Marketplace (the free plan is fine) and connect it to this project. Choose the Frankfurt region (eu-central-1), so the "stored in the EU" line on the first screen is true. Vercel adds the connection settings for you.
3. **Add an export key.** In Settings, then Environment Variables, add `EXPORT_KEY` with a long random value (at least 16 characters). Keep it private.
4. **Redeploy** so the new settings are used.
5. The deletion date (31 December 2027) and your contact email are already filled in at the top of the script in `index.html` (`CONFIG`). Change them there if they ever change.

## Use it

- Live results panel: open `https://<your-site>.vercel.app/results.html` and enter your EXPORT_KEY once. It refreshes every 15 seconds.

- Share `https://<your-site>.vercel.app`.
- Language: people can switch between English and Dutch on the first screen. The page starts in Dutch when the phone is set to Dutch. To force a language in a link, add `?lang=nl` or `?lang=en` (combine with a group code as `?lang=nl&g=friends`). Each answer records which language was used (`lang` column).
- One link per group: add `?g=` with a short code, for example `?g=hva` or `?g=partner-a`. The code is saved with each answer, so you can compare groups.
- See how many answers came in: `https://<your-site>.vercel.app/api/export?key=<EXPORT_KEY>&format=count`
- Download all answers as CSV: `https://<your-site>.vercel.app/api/export?key=<EXPORT_KEY>`
- Download the interview and results sign-ups as CSV: `https://<your-site>.vercel.app/api/export?key=<EXPORT_KEY>&type=contacts`

Lists with several answers (Q5, Q6, Q8, Q14) are joined with `;` in the CSV. `durationSec` shows how long each person took, which is useful for checking the 3-minute target in the pilot.

## What is and isn't stored

Stored with the answers: the answers, the product she answered about, the group code, the time taken and when it arrived. Not stored with the answers: names, emails, phone numbers, IP addresses or cookies.

The optional email or phone number on the thank-you screen goes to a separate list (`survey:contacts`) with only the day it arrived, so it can't be matched to anyone's answers. It is personal data, so delete it when the research is done, together with `survey:responses`. A hidden field catches simple spam bots. There's no rate limit, so if the link gets spammed, rotate the link or add Vercel's firewall rules.

When you delete the data at the end, remove the `survey:responses` and `survey:contacts` keys in the Upstash console.

## Clearing the data

At the bottom of `results.html` there's a "Delete all answers" button. It asks you to type DELETE, then removes every answer and every sign-up. Use it before launch to clear test answers, and on your deletion date (31 December 2027).

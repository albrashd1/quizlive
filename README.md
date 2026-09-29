# QuizLive — a free Kahoot-style classroom quiz

Students scan a QR code, type a nickname, and answer on their phones while the big screen shows the questions, timer, answer chart and leaderboard.

- **Hosting:** Vercel (free)
- **Real-time messages:** Supabase Realtime (free plan, no database tables needed)
- **No build step:** plain HTML/CSS/JavaScript, so there is nothing to install

---

## Step 1 — Create the Supabase project (5 min)

1. Go to <https://supabase.com> and sign up (GitHub login is fine).
2. Click **New project**. Pick any name (e.g. `quizlive`), set a database password (you won't need it again), choose the region closest to you (e.g. *Middle East* or *Central EU*), and click **Create**.
3. Wait about a minute for the project to finish setting up.
4. Click the **Connect** button at the top of the dashboard. Copy:
   - **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - **Publishable key**, which starts with `sb_publishable_`. If you only see an `anon` key, that works too.
5. Open `js/config.js` in this project and paste both values:

   ```js
   SUPABASE_URL: 'https://abcdefgh.supabase.co',
   SUPABASE_KEY: 'sb_publishable_xxxxxxxx',
   ```

   These keys are designed to be public. It's safe to commit them.

6. Go to **Project Settings → Realtime** and check that public channels are allowed. The setting is usually named *"Allow public access"* and is on by default. If it's off, turn it on.

You don't need to create any tables.

## Step 2 — Put the code on GitHub (3 min)

1. Create a new repository on GitHub, e.g. `quizlive`. Public or private both work.
2. Upload the project using one of these methods:
   - **Web upload:** open the repo, click **Add file → Upload files**, and drag *the contents* of the `quizlive` folder in. `index.html` must be at the top level of the repo, not inside a subfolder. Then commit.
   - **Git command line:**

     ```bash
     cd quizlive
     git init
     git add .
     git commit -m "QuizLive"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/quizlive.git
     git push -u origin main
     ```

## Step 3 — Deploy on Vercel (2 min)

1. Go to <https://vercel.com> and sign in with GitHub.
2. Click **Add New… → Project**, find your `quizlive` repo, and click **Import**.
3. Leave the settings as they are:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - No build command
4. Click **Deploy**. After about 30 seconds you get a link like `https://quizlive-xyz.vercel.app`.
5. Optional: under **Settings → Domains** you can rename it to something short, e.g. `phishquiz.vercel.app`. A short name is easier for students to type if a QR code doesn't scan.

From now on, every push to GitHub redeploys automatically. For example, you can edit questions in `js/questions.js`, commit, and the site updates within a minute.

## Step 4 — Test before class (do this!)

1. On your laptop, open `https://YOUR-SITE.vercel.app/host.html` and click **Create game**. The badge in the top-right should turn green (**Live**).
2. Scan the QR code with your phone and join. Your name should appear on the laptop.
3. To simulate more students, open the QR link in a few extra browser tabs or an incognito window, or ask a friend to join.
4. Click **Start**, answer on the phone, and check that the reveal, leaderboard and final screens work.

## On the day

1. Connect the laptop to the projector and open `/host.html`.
2. Click **Full screen**, then **Create game**.
3. Students scan the QR code, or go to your site and type the PIN.
4. If a student uses an inappropriate nickname, click the name in the lobby to remove them.
5. Click **Start**. Each question ends when everyone has answered or the timer runs out. You can also click **End question** early.
6. After each question you'll see the answer chart and explanation. Click **Leaderboard →**, then **Next question →**.
7. At the end, click **Download results (CSV)** to save the scores for your records.

**If something goes wrong:**

- **The laptop refreshes or crashes:** reopen `/host.html` and click **Resume game**. Scores and players are kept.
- **A student's phone locks or loses Wi-Fi:** they simply reopen the page. They rejoin automatically with the same name and score.
- **The school Wi-Fi is weak:** students can switch to mobile data.

---

## Editing questions

Open `js/questions.js`. Each question looks like this:

```js
{
  q: 'Question text',
  options: ['A', 'B', 'C', 'D'],   // 2 to 4 options
  correct: 1,                      // 0 = first option, 1 = second, ...
  time: 25,                        // optional, seconds
  double: true,                    // optional, double points
  explain: 'Shown after the reveal', // optional
},
```

**Scoring:** a correct answer earns 500–1000 points depending on speed, the same idea as Kahoot. Double-points questions are ×2. Wrong answers and no answer earn 0.

## How many students?

The free Supabase plan allows 200 simultaneous connections and 100 messages per second. The app is built to stay well under those limits:

- Phones send their answers only to the host, never to each other.
- The host does all the scoring and sends one small update per step.
- "You're in" confirmations are batched when many students join at once.

A full 18-question game uses only about 40 messages per phone. Classes of 50–80 students are comfortable, and the app caps a game at 190 players.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page (enter PIN, or link to host) |
| `host.html`, `js/host.js` | Teacher / projector screen: runs the game and scoring |
| `play.html`, `js/play.js` | Student phone screen |
| `js/config.js` | **Your Supabase URL and key** |
| `js/questions.js` | **Your questions** |
| `js/common.js` | Shared helpers |
| `css/style.css` | Styles |
| `manifest.json`, `sw.js`, `icons/` | PWA (installable app) |
| `vercel.json` | Cache headers so updates show up immediately |

## Known limitation

This is a classroom tool with no logins. A technically skilled student who reads the page code could in theory send fake messages to a game while it's running. That's fine for a class quiz, but don't use it for graded exams.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Setup needed" box appears | `js/config.js` still has the placeholder values. Paste your keys, commit, and push. |
| Badge stays red / "Connecting…" | Check the URL and key in `config.js`, and that Realtime public access is on (Step 1.6). Also check that the Supabase project isn't paused: free projects pause after about a week of no use, and you click **Restore** in the dashboard. |
| Students stuck on "Joining…" | The host page must be open and in the lobby with the same PIN. Wrong PINs never connect. |
| Changes to questions don't show | Hard-refresh the host page (Ctrl+Shift+R). |

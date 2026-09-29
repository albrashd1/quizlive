// ============================================================
//  QuizLive settings — the ONLY file you must edit before deploying
// ============================================================
//  1. Open your Supabase project → click "Connect" (top of the dashboard)
//  2. Copy the "Project URL" and the "Publishable key" (starts with sb_publishable_)
//     (An older "anon" key also works.)
//  3. Paste them below, keep the quotes.
//  These keys are meant to be public — it is safe to put them in the website.

window.QUIZ_CONFIG = {
  SUPABASE_URL: 'https://bzjqoqjxiqnomvhytlwy.supabase.co',
  SUPABASE_KEY: 'sb_publishable_dpvb-wddUSncBhNBcyv82g_OmvIgnFy',

  // Default seconds per question (a question can override this with "time")
  QUESTION_TIME: 20,
};

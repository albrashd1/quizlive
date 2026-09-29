// ============================================================
//  Your quiz. Edit freely.
//  - options: 2 to 4 answers
//  - correct: position of the right answer, starting at 0 (first option = 0)
//  - time:    seconds for this question (the question ends early once everyone has answered)
//  - double:  true = double points
//  - explain: shown on the big screen after the answer is revealed (optional)
// ============================================================

window.QUIZ = {
  title: 'Phishing Awareness Challenge',
  questions: [
    {
      q: 'Which emotion is most commonly exploited in phishing campaigns?',
      options: ['Joy', 'Urgency/Fear', 'Sympathy', 'Nostalgia'],
      correct: 1,
      time: 60,
      explain: 'Attackers often pressure users into acting before verifying details.',
    },
    {
      q: 'What is the primary goal of a credential harvesting phishing email?',
      options: ['Encrypt files', 'Steal login credentials', 'Slow down a network', 'Disable antivirus'],
      correct: 1,
      time: 60,
      explain: 'Credential harvesting leads victims to a fake login page to capture usernames and passwords.',
    },
    {
      q: 'Which of the following is the strongest indicator of a phishing email?',
      options: [
        'Company logo in the email',
        'A link whose displayed text differs from the actual destination',
        'Professional formatting',
        'A message sent during business hours',
      ],
      correct: 1,
      time: 60,
      explain: 'Logos and formatting are easy to copy. A mismatched link destination is a real red flag.',
    },
    {
      q: 'True or False: Hovering over a link can help reveal whether the real destination matches the displayed text.',
      options: ['True', 'False'],
      correct: 0,
      time: 60,
      explain: 'Hovering (or long-pressing on mobile) shows the real URL before you click.',
    },
    {
      q: 'What does “smishing” refer to?',
      options: [
        'Phishing through social media comments',
        'Phishing through SMS/text messages',
        'Phishing through voicemail only',
        'Phishing using smart devices only',
      ],
      correct: 1,
      time: 60,
      explain: 'Smishing = SMS + phishing.',
    },
    {
      q: 'In vishing, attackers most often rely on which tactic?',
      options: [
        'Brute-force password attacks',
        'Voice-based impersonation and urgency',
        'Exploiting SQL injection',
        'USB malware drops',
      ],
      correct: 1,
      time: 60,
      explain: 'Vishing = voice phishing: a caller pretends to be the bank, IT support, or a manager.',
    },
    {
      q: 'Which of the following best describes Business Email Compromise (BEC)?',
      options: [
        'A phishing email containing ransomware',
        'An email attack that impersonates a trusted business contact to manipulate payments or data sharing',
        'A denial-of-service attack against mail servers',
        'A spam campaign sent from many fake domains',
      ],
      correct: 1,
      time: 60,
      explain: 'BEC usually has no malware at all — just a convincing request from a “trusted” sender.',
    },
    {
      q: 'A URL reads https://microsoft-login-security.example.com — what is the actual domain?',
      options: ['microsoft.com', 'login-security.com', 'example.com', 'microsoft-login.com'],
      correct: 2,
      time: 60,
      explain: 'Read the domain from the right: the part just before the ending (.com) is the real owner. Everything to the left is a subdomain the attacker chose.',
    },
    {
      q: 'Which technique abuses Unicode characters to create lookalike domains?',
      options: ['Token replay', 'Homoglyph attack', 'ARP spoofing', 'Session pinning'],
      correct: 1,
      time: 60,
      explain: 'Homoglyphs are characters that look alike, e.g. a Cyrillic “а” instead of a Latin “a”.',
    },
    {
      q: 'Why are QR-code phishing attacks effective?',
      options: [
        'QR codes cannot be scanned securely',
        'Mobile users often inspect URLs more carefully',
        'Users often trust QR codes and may not verify the destination before opening',
        'QR codes automatically install malware without interaction',
      ],
      correct: 2,
      time: 60,
      explain: 'You can’t read a QR code with your eyes — and many people open the link without checking it. (Yes, including the one you scanned today!)',
    },
    {
      q: 'True or False: Phishing attacks only happen through email.',
      options: ['True', 'False'],
      correct: 1,
      time: 60,
      explain: 'Phishing can happen through email, SMS, phone calls, social media, QR codes, and fake websites.',
    },
    {
      q: 'What is the best response after clicking a suspicious phishing link and entering your password?',
      options: [
        'Ignore it if nothing happened',
        'Delete browser history',
        'Immediately change the password, report the incident, and check for MFA/session abuse',
        'Restart the computer and continue working',
      ],
      correct: 2,
      time: 60,
      explain: 'Act fast: change the password, report it, and check for suspicious sessions and MFA prompts.',
    },
    {
      q: 'What is MFA fatigue or prompt bombing?',
      options: [
        'Disabling MFA because users forget their phones',
        'Repeated MFA approval requests sent to pressure a victim into accepting one',
        'A mobile battery issue during authentication',
        'A password spraying technique against MFA servers',
      ],
      correct: 1,
      time: 60,
      explain: 'Never approve an MFA prompt you did not start — report it instead.',
    },
    {
      q: 'Which characteristic is more typical of a sophisticated phishing attack than a low-effort scam?',
      options: [
        'Many spelling mistakes and random formatting',
        'Generic greeting and poor grammar',
        'Context-aware language tailored to the victim’s role or organization',
        'No sender name',
      ],
      correct: 2,
      time: 60,
      explain: 'Modern attacks (often AI-assisted) are well written and personalised — bad grammar is no longer a reliable signal.',
    },
    {
      q: 'A text says: “Your bank account is locked. Verify now within 10 minutes.” Which two tactics are most clearly being used?',
      options: ['Curiosity and humor', 'Fear and urgency', 'Greed and nostalgia', 'Sympathy and trust'],
      correct: 1,
      time: 60,
      explain: '“Locked” creates fear; “within 10 minutes” creates urgency.',
    },
    {
      q: 'Which email scenario is most likely a spear-phishing attempt?',
      options: [
        'A generic ad sent to thousands of recipients',
        'An email referencing your university project, supervisor name, and a shared research document',
        'A newsletter from a subscribed mailing list',
        'An automated calendar reminder',
      ],
      correct: 1,
      time: 60,
      explain: 'Spear phishing is targeted: it uses personal details to look trustworthy.',
    },
    {
      q: 'Which is the best first analytical step when reviewing a suspicious email?',
      options: [
        'Reply and ask if it is legitimate',
        'Open all attachments in a sandbox immediately',
        'Inspect sender details, headers, links, and the context of the request',
        'Forward it to friends for a second opinion',
      ],
      correct: 2,
      time: 60,
      explain: 'Start with the cheap, safe checks: sender, headers, links, and whether the request makes sense.',
    },
    {
      q: 'HARD — Which attack technique captures both user credentials and active session tokens in real time through a fake login flow?',
      options: [
        'Password spraying',
        'Adversary-in-the-middle phishing',
        'DNS cache poisoning',
        'Brute-force authentication',
      ],
      correct: 1,
      time: 60,
      double: true,
      explain: 'AiTM phishing proxies the real login page, so it can steal the session cookie even when MFA is used.',
    },
  ],
};

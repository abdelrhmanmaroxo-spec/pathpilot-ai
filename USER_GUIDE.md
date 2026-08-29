# PathPilot User Guide

PathPilot is a bilingual Arabic/English AI workspace for general questions, study, work, research, writing, planning, and local fallback assistance.

## 1. Start here

Open PathPilot and choose one of the three workspaces:

- **General Assistant** for questions, writing, ideation, decisions, planning, and everyday tasks.
- **Study** for explanations, summaries, study plans, quizzes, flashcards, and research maps.
- **Work** for emails, task breakdowns, meeting notes, CV bullets, cover letters, and QA reports.

Each workspace has focused tools. Choose the tool that most closely matches the result you want.

## 2. Ask a good question

In the request box, include the details that materially change the answer. Useful details include:

- Your goal.
- Deadline or time available.
- Budget or constraints.
- Audience.
- Device, platform, country, or software version when relevant.
- Any text that must be preserved or rewritten.

You do not need to write a perfect prompt. PathPilot is designed to infer the deliverable and use the available context.

## 3. Continue the conversation

After the first answer, you can continue naturally with messages such as:

- “كمل” / “Continue.”
- “اختصره” / “Make it shorter.”
- “التاني أحسن، عدله” / “Use the second option and improve it.”
- “خليه للـHR” / “Rewrite it for a recruiter.”

PathPilot keeps a bounded recent conversation context so follow-up requests can refer to what came before without resending everything.

## 4. AI, research, and local fallback

PathPilot routes requests automatically:

- Stable writing, transformation, and many reasoning tasks can go directly to live AI.
- Fresh topics such as current prices, jobs, laws, recent releases, or explicit research requests can use web research plus AI synthesis.
- If live services are unavailable, PathPilot can fall back to local intelligence.
- On supported WebGPU devices, the optional Local LLM can run in the browser after its model is downloaded.

A label on each result identifies the path that produced it, for example **Live AI**, **Web Research + AI**, or **Local Super Reasoner**.

## 5. Understand the processing timer

When a request is running, PathPilot shows a live elapsed-time counter. This is the time spent processing the request, including routing, research, provider latency, and response generation. It is not a display of private chain-of-thought.

When the answer finishes, the final elapsed time remains visible on the result card.

## 6. Use voice input

Select **Long voice input** to dictate into the request box.

- Recording continues until you stop it.
- If the browser automatically ends a speech-recognition session after silence or an internal time limit, PathPilot attempts to resume automatically.
- The elapsed recording time is shown while listening.
- Existing text in the request box is preserved and the dictated text is appended.

Browser support varies. Chrome and Chromium-based browsers generally provide the broadest Web Speech support.

## 7. Read answers aloud

After an answer is available, choose **Read aloud**. PathPilot uses the browser's speech synthesis capability and selects Arabic or English based on the active interface language.

## 8. Research sources

For grounded research answers, sources appear in a separate source panel.

Each source card shows:

- Its order in the evidence set.
- Source title.
- Domain.
- A direct link to open the source.

PathPilot ranks evidence with preference for direct, official, academic, documentation, or otherwise high-authority sources when relevant.

## 9. Regenerate, stop, copy, share, and download

From the result area you can:

- **Regenerate** the latest answer.
- **Stop** an active request.
- **Copy** the answer.
- **Share** using the device share menu when available.
- **Download** the result as Markdown. Research exports include the structured source list when available.

## 10. Edit and resubmit

Previous conversation turns include an action to reuse the prompt. This places the earlier prompt back into the request box so you can modify and send it again.

## 11. Response preferences

The result settings let you control:

- Optional display name.
- Target audience.
- Detail level.
- Local LLM preference on supported devices.

These public response preferences are stored locally on the device.

## 12. History and organization

PathPilot stores recent results locally on the device. The evolving conversation library supports foundations for:

- Search.
- Favorites.
- Folders.
- Tags.
- Pinned prompts.

Cloud synchronization is a separate feature and should not be assumed unless explicitly shown as enabled in the product.

## 13. Accounts

You can create an account with email and password when the platform backend is available.

### Email verification
After registration, PathPilot sends a verification email. Open the message and select **Verify email** before signing in.

### Password reset
Choose the forgot-password option. The reset email contains a time-limited, one-time link.

If an expected message is not visible, check Inbox, Spam, Junk, and Promotions.

## 14. Install PathPilot as an app

PathPilot is a PWA and can be installed on supported desktop and mobile browsers.

Typical flow:

- **Desktop Chrome/Edge:** use the install icon near the address bar or PathPilot's Install button.
- **Android Chrome:** browser menu → Install app / Add to Home screen.
- **iPhone/iPad Safari:** Share → Add to Home Screen.

When an updated PWA version is ready, PathPilot can show an update banner instead of silently leaving the user on an older cached version.

## 15. Language switching

Use the language button to switch between Arabic and English. The page direction switches between RTL and LTR where appropriate.

If a text fragment remains in the wrong language after an update, refresh the installed app/page so the latest PWA assets are loaded.

## 16. Keyboard shortcuts

- **Ctrl/Cmd + Enter:** send the current request.
- **Ctrl/Cmd + K:** focus the main request box.
- **Escape while generating:** stop the active request.

## 17. Privacy and safety basics

- Do not paste passwords, API keys, or private authentication tokens into prompts.
- Local history/preferences may remain on the device depending on the feature.
- Live AI and web research require sending the relevant request to configured service providers.
- Web evidence is treated as untrusted content and is filtered for common prompt-injection patterns before synthesis.

## 18. If something fails

Try these steps:

1. Check the AI status indicator.
2. Retry once if the provider had a transient error.
3. Refresh the page or PWA if a new version is available.
4. Use a different tool/workspace if your request fits it better.
5. If live AI or research is unavailable, use the local fallback when shown.
6. Report persistent issues through the feedback flow so the error can be correlated with product telemetry.

## 19. Beta status

PathPilot is actively evolving. Beta labels indicate areas where provider behavior, local-model support, or interface details may still change. The product should prefer graceful degradation and transparent status over pretending a provider succeeded when it did not.

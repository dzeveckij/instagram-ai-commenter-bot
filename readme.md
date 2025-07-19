# Instagram AI Commenter Bot

An advanced Instagram bot that automatically monitors target profiles for new posts and uses Google's Gemini AI to generate and post context-aware, human-like comments. It is built with Playwright for robust browser automation and incorporates advanced techniques to mimic human behavior and evade detection.

## ⚠️ Disclaimer

This project is for educational purposes only. Automating interactions on Instagram is against their Terms of Service. Using this bot can result in your account being temporarily or permanently blocked. The developers of this project are not responsible for any consequences of its use. Use it at your own risk.

---

## Features

-   **AI-Powered Comments**: Utilizes Google Gemini's multimodal capabilities to analyze post captions, images, and even videos to generate highly relevant and natural-sounding comments.
-   **Multi-Account Management**: Configure and run the bot for multiple Instagram accounts, each with its own set of targets and settings.
-   **Continuous Monitoring**: Runs in a loop to monitor a list of target profiles, detecting new posts as soon as they are published.
-   **Human Behavior Emulation**: Simulates realistic human actions, including:
    -   Natural, non-linear mouse movements.
    -   Human-like typing with variable delays and simulated typos.
    -   Randomized delays between actions to avoid predictability.
    -   Jittery movements, unpredictable scrolling, and simulated "reading" time.
-   **Advanced Fingerprint Spoofing**: Generates and applies realistic browser fingerprints (User Agent, viewport, locale, timezone, WebGL, etc.) for each account to reduce the risk of detection.
-   **Persistent Sessions & Logging**:
    -   Saves and reuses cookies for persistent login sessions.
    -   Logs all comment interactions to a global CSV file (`interaction_log.csv`).
    -   Tracks post/follower counts for each target in a separate CSV (`profile_stats.csv`) to detect new posts.
-   **Multiple Operational Modes**:
    -   `monitor`: The main mode for continuously monitoring targets and posting comments.
    -   `test-comment`: Runs a single comment task for a specific account to test its configuration.
    -   `check-accounts`: A non-headless mode to manually check the status of each account, handle CAPTCHAs, or verify logins.
-   **Robust Error Handling**: Designed to handle common issues like private profiles, missing posts, and failed actions, with screenshotting on error for easier debugging.

## Prerequisites

Before you begin, ensure you have the following installed:
-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Setup & Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/dzeveckij/instagram-ai-commenter-bot.git
    cd instagram-ai-commenter-bot
    ```

2.  **Install Dependencies**
    This will also download the necessary Playwright browser binaries.
    ```bash
    npm install
    ```

3.  **Configure the Bot**
    The main configuration is done in the `src/config.ts` file. Open this file and edit it according to your needs.

    -   **Google AI API Key**: Add your Google Gemini API key to the `googleAiApiKey` string. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).
    -   **Headless Mode**: Set `headless: true` to run the browser in the background or `false` to see the browser window.
    -   **Accounts**: Add your Instagram accounts to the `accounts` array.
        -   `enabled`: `true` to use this account, `false` to disable it.
        -   `username`/`password`: Your Instagram credentials.
        -   `aiPromptHint`: (Optional) A custom instruction for the AI to guide its comment style for this specific account.
        -   `targets`: A list of Instagram usernames this account should monitor.

    *See the [Configuration](#configuration) section below for more details.*

## Usage (Running the Bot)

You can run the bot in three different modes using the predefined npm scripts.

**1. Monitor Mode (Default)**
This is the primary mode. The bot will launch and start monitoring all targets from all enabled accounts. When a new post is detected, it will use the designated accounts to post comments.

```bash
npm start
```

**2. Test Comment Mode**
This mode tests the first enabled account's ability to comment on its first target. It's useful for a quick check of your setup.

```bash
npm test
```
To test a *specific* account from your config, you can run the command directly and pass the username:
```bash
npx ts-node src/main.ts test-comment your_instagram_username_1
```

**3. Check Accounts Mode**
This mode runs in non-headless (`headless: false`) mode. It logs into each enabled account one by one, pausing after each login. This allows you to manually inspect the account, solve CAPTCHAs, or handle two-factor authentication. Press `ENTER` in the terminal to proceed to the next account.

```bash
npm run checker
```

### In-Script Controls
- **CTRL+C**: Stop the bot at any time.
- **`i` key**: Request a pause. The script will enter debug mode at the next available opportunity, allowing you to use the Playwright Inspector.

---

## Configuration (`src/config.ts`)

The `config.ts` file is the control center for the bot.

```typescript
export interface Config {
    settings: {
        headless: boolean; // Run browser in background (true) or visibly (false)
        developerMode: boolean; // Use shorter delays for fast debugging
        googleAiApiKey: string; // Your Google Gemini API key
        monitoringIntervalSeconds: { min: number; max: number }; // Time between checking all targets
        defaultActionDelaySeconds: { min: number; max: number }; // Time between consecutive comments
        // ...
    },
    accounts: [
        {
            enabled: boolean; // Set to true to use this account
            username: string;
            password: string;
            aiPromptHint?: string; // Optional AI instruction
            targets: string[]; // List of usernames to monitor
            // ...
        },
        // ... more accounts
    ],
};
```

---

## License

This project is open-source and available to everyone. Please see the LICENSE file for more details.

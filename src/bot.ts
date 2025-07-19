import { Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { AccountConfig, SettingsConfig, BehaviorConfig } from './config';
import { HumanBehavior, PauseState } from './humanBehavior';
import { Logger } from './logger';
import { AICommentGenerator } from './genai';

export type InteractionResult = 'SUCCESS' | 'SKIPPED' | 'FAILED';

export class InstagramBot {
    private context!: BrowserContext;
    private page!: Page;
    private readonly config: AccountConfig;
    private readonly cookiePath: string;
    private readonly actionDelays: { min: number; max: number };
    private readonly behavior: BehaviorConfig;
    private readonly pauseState: PauseState;
    private readonly globalLogPath: string;
    private humanBehavior!: HumanBehavior;
    private readonly developerMode: boolean;
    private readonly logger: Logger;
    private readonly aiGenerator: AICommentGenerator;
    private capturedVideoUrl: string | undefined = undefined;
    private isCapturingVideo: boolean = false;
    private readonly logsDir: string;

    constructor(
        accountConfig: AccountConfig,
        globalSettings: SettingsConfig,
        pauseState: PauseState,
        logger: Logger,
        aiGenerator: AICommentGenerator
    ) {
        this.config = accountConfig;
        this.behavior = globalSettings.behavior;
        this.cookiePath = path.join(__dirname, '..', 'data', 'cookies', `${this.config.username}.json`);
        this.globalLogPath = path.join(__dirname, '..', 'data', 'logs', 'interaction_log.csv');
        this.logsDir = path.join(__dirname, '..', 'data', 'logs');
        this.pauseState = pauseState;
        this.developerMode = globalSettings.developerMode;
        this.logger = logger;
        this.aiGenerator = aiGenerator;

        if (this.developerMode) {
            this.actionDelays = { min: 1000, max: 2000 };
            this.logger.debug('Developer mode is ON. Using short action delays.');
        } else {
            const actionDelay = accountConfig.actionDelaySeconds ?? globalSettings.defaultActionDelaySeconds;
            this.actionDelays = {
                min: actionDelay.min * 1000,
                max: actionDelay.max * 1000,
            };
            this.logger.info(`Action delay loaded: ${actionDelay.min}s - ${actionDelay.max}s`);
        }
    }

    private async logInteraction(targetUsername: string, actionType: 'comment', comment: string) {
        const timestamp = new Date().toISOString();
        const sanitizedComment = `"${comment.replace(/"/g, '""')}"`;
        const logEntry = `${timestamp},${this.config.username},${targetUsername},${actionType},${sanitizedComment}\n`;

        if (actionType === 'comment') {
            this.logger.incrementComments();
        }

        try {
            fs.appendFileSync(this.globalLogPath, logEntry, 'utf-8');
        } catch (error: any) {
            this.logger.error(`Failed to write to global CSV log: ${error.message}`);
        }
    }

    private async ensureCookiesAreSaved() {
        if (!fs.existsSync(this.cookiePath)) {
            this.logger.action('Session is active but cookie file is missing. Saving now...');
            try {
                await this.context.storageState({ path: this.cookiePath });
                this.logger.success(`Cookies saved successfully.`);
            } catch (e: any) {
                this.logger.error(`Failed to save cookies: ${e.message}`);
            }
        }
    }

    public getPage(): Page {
        return this.page;
    }

    public async init(context: BrowserContext) {
        this.context = context;
        this.page = await this.context.newPage();
        this.humanBehavior = new HumanBehavior(this.page, this.developerMode, this.pauseState, this.logger);

        this.page.on('response', async response => {
            try {
                if (!this.isCapturingVideo) return;

                if (this.capturedVideoUrl) return;

                const url = response.url();
                const contentType = response.headers()['content-type'];

                if (
                    contentType &&
                    contentType.includes('video/mp4') &&
                    url.includes('fbcdn.net') &&
                    (url.includes('instagram') || url.includes('ig'))
                ) {
                    this.capturedVideoUrl = url;
                    this.logger.info(`Captured video URL: ${url.substring(0, 80)}...`);
                }
            } catch (e) {}
        });

        this.logger.action('Navigating to Instagram...');
        await this.page.goto('https://www.instagram.com/?hl=en');
        await this.humanBehavior.randomizedWait(this.behavior.navigationWaitMs);

        await this.humanBehavior.moveMouseRandomly();
        this.logger.info('Checking login status...');

        try {
            await this.dismissCommonPopups();
            if (await this.checkIfLoggedIn()) {
                this.logger.success('Already logged in.');
                await this.ensureCookiesAreSaved();
                return true;
            } else {
                this.logger.info('Not logged in. Performing login.');
                await this.login();
                return true;
            }
        } catch (e: any) {
            this.logger.error(`Error during init: ${e.message}. Attempting login...`);
            await this.login();
            return true;
        }
    }

    private async checkIfLoggedIn(): Promise<boolean> {
        try {
            const profileLink = this.page.locator(`a[href="/${this.config.username}/"]`);
            if ((await profileLink.count()) > 0) return true;

            const homeIcon = this.page.locator('svg[aria-label="Home"]');
            if ((await homeIcon.count()) > 0) return true;

            const usernameInput = this.page.locator('input[name="username"]');
            if ((await usernameInput.count()) > 0) return false;

            return false;
        } catch (e: any) {
            this.logger.error(`Error checking login status: ${e.message}`);
            return false;
        }
    }

    private async dismissCommonPopups() {
        try {
            const allowCookiesButton = this.page.getByRole('button', { name: 'Allow all cookies' });
            if ((await allowCookiesButton.count()) > 0) {
                this.logger.action('Dismissing "Allow all cookies" popup...');
                await this.humanBehavior.hesitateAndClick(allowCookiesButton);
                await this.humanBehavior.randomizedWait(this.behavior.shortWaitMs);
            }
        } catch (e) {}

        try {
            const saveInfoButton = this.page.getByRole('button', { name: 'Save Info' });
            if ((await saveInfoButton.count()) > 0) {
                this.logger.action('Dismissing "Save Info" popup...');
                await this.humanBehavior.hesitateAndClick(saveInfoButton);
                await this.humanBehavior.randomizedWait(this.behavior.shortWaitMs);
            }
        } catch (e) {}

        try {
            const notNowButton = this.page.getByRole('button', { name: 'Not Now' });
            if ((await notNowButton.count()) > 0) {
                this.logger.action('Dismissing "Turn on Notifications" popup...');
                await this.humanBehavior.hesitateAndClick(notNowButton.first());
                await this.humanBehavior.randomizedWait(this.behavior.shortWaitMs);
            }
        } catch (e) {}
    }

    private async login() {
        if ((await this.page.locator('input[name="username"]').count()) === 0) {
            this.logger.action('Navigating to login page...');
            await this.page.goto('https://www.instagram.com/accounts/login/?hl=en');
            await this.humanBehavior.randomizedWait(this.behavior.navigationWaitMs);
            await this.humanBehavior.moveMouseRandomly();
        }

        await this.dismissCommonPopups();

        try {
            await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
        } catch (e) {
            await this.page.screenshot({ path: path.join(this.logsDir, `login_page_error_${this.config.username}.png`) });
            if (await this.checkIfLoggedIn()) {
                this.logger.success('Detected that we are already logged in!');
                await this.ensureCookiesAreSaved();
                return;
            }
            throw new Error('Could not find username input on login page');
        }

        this.logger.action('Typing credentials...');
        await this.humanBehavior.randomizedWait(this.behavior.shortWaitMs);

        const usernameSelector = 'input[name="username"]';
        const passwordSelector = 'input[name="password"]';

        await this.humanBehavior.naturalTyping(usernameSelector, this.config.username, {
            min: 80,
            max: 250,
            typoChance: 0.07,
        });

        await this.humanBehavior.randomDelay(500, 1500);

        await this.humanBehavior.naturalTyping(passwordSelector, this.config.password, {
            min: 100,
            max: 300,
            typoChance: 0.03,
        });

        this.logger.action('Submitting login form...');
        await this.humanBehavior.randomDelay(800, 2000);

        const loginButton = this.page.getByRole('button', { name: 'Log in', exact: true });
        await this.humanBehavior.hesitateAndClick(loginButton);

        try {
            const saveInfoButton = this.page.getByRole('button', { name: 'Save info' });
            await saveInfoButton.waitFor({ timeout: 8000 });
            this.logger.action('Saving login info...');
            await this.humanBehavior.randomDelay(500, 1500);
            await this.humanBehavior.hesitateAndClick(saveInfoButton);
            await this.humanBehavior.randomizedWait(this.behavior.navigationWaitMs);
        } catch (e) {}

        try {
            const profileLinkSelector = `a[href="/${this.config.username}/"]`;
            await this.page.waitForSelector(profileLinkSelector, { timeout: 15000, state: 'visible' });
        } catch (error) {
            const screenshotPath = path.join(this.logsDir, `login_error_${this.config.username}.png`);
            await this.page.screenshot({ path: screenshotPath });
            throw new Error(`Login failed. Screenshot saved to: ${screenshotPath}`);
        }

        await this.dismissCommonPopups();
        this.logger.action('Saving cookies to disk...');
        await this.context.storageState({ path: this.cookiePath });
    }

    public async runCommentTask(targetUsername: string, aiPromptHint?: string): Promise<InteractionResult> {
        this.logger.header(`----- Starting Comment Task for @${targetUsername} -----`);

        try {
            this.capturedVideoUrl = undefined;
            this.isCapturingVideo = false;

            this.logger.action(`Navigating to @${targetUsername}'s profile page...`);
            await this.page.goto(`https://www.instagram.com/${targetUsername}/?hl=en`);
            await this.humanBehavior.randomizedWait(this.behavior.navigationWaitMs);

            const isPrivate = (await this.page.getByText('This Account Is Private').count()) > 0;
            if (isPrivate) {
                this.logger.warn(`@${targetUsername} is private. Cannot comment on posts.`);
                return 'SKIPPED';
            }

            this.logger.action(`Looking for the latest, non-pinned post...`);
            const allPostLinks = this.page.locator('main a[href*="/p/"], main a[href*="/reel/"]');

            const nonPinnedPostLinks = allPostLinks.filter({
                hasNot: this.page.locator('svg[aria-label="Pinned post icon"]'),
            });

            const postCount = await nonPinnedPostLinks.count();

            if (postCount === 0) {
                if ((await allPostLinks.count()) > 0) {
                    this.logger.warn(
                        `Could not find any non-pinned posts on @${targetUsername}'s profile. All visible posts may be pinned. Skipping.`
                    );
                } else {
                    this.logger.warn(`Could not find any posts on @${targetUsername}'s profile. Skipping.`);
                }
                await this.page.screenshot({ path: path.join(this.logsDir, `no_posts_error_${this.config.username}_${targetUsername}.png`) });
                return 'SKIPPED';
            }

            const latestPost = nonPinnedPostLinks.first();
            this.logger.action(`Opening latest post...`);

            this.isCapturingVideo = true;

            await this.humanBehavior.hesitateAndClick(latestPost);

            const dialogSelector = 'div[role="dialog"]';
            await this.page.waitForSelector(dialogSelector, { state: 'visible', timeout: 15000 });
            this.logger.success(`Post opened in a dialog.`);
            await this.humanBehavior.randomizedWait(this.behavior.shortWaitMs);

            this.logger.action('Extracting post caption...');
            const captionLocator = this.page.locator('div[role="dialog"] h1').first();
            let postCaption = '';
            try {
                if (await captionLocator.isVisible({ timeout: 2000 })) {
                    postCaption = (await captionLocator.textContent()) || '';
                    this.logger.info(`Found caption: "${postCaption.substring(0, 50)}..."`);
                } else {
                    this.logger.info('No caption found on this post.');
                }
            } catch (e) {
                this.logger.warn('Could not extract post caption.');
            }

            this.logger.action('Extracting post media (image/video)...');
            let postImageUrl: string | undefined;
            let postVideoUrl: string | undefined;
            let isVideoPost = false;

            try {
                const videoErrorMessage = this.page
                    .locator('div[role="dialog"]')
                    .getByText("Sorry, we're having trouble playing this video");
                const videoElement = this.page.locator('div[role="dialog"] video');

                if ((await videoErrorMessage.count()) > 0 || (await videoElement.count()) > 0) {
                    isVideoPost = true;
                    this.logger.info('Detected video post');

                    if (this.capturedVideoUrl) {
                        postVideoUrl = this.capturedVideoUrl;
                        this.logger.info(`Using captured video URL: ${this.capturedVideoUrl}`);
                    } else {
                        this.logger.warn('Video post detected but no video URL was captured from network requests');
                    }
                } else {
                    const imageLocators = [
                        this.page.locator('div[role="dialog"] img[src*="instagram"]').first(),
                        this.page.locator('div[role="dialog"] img[alt]').first(),
                        this.page.locator('div[role="dialog"] article img').first(),
                    ];

                    for (const imageLocator of imageLocators) {
                        if ((await imageLocator.count()) > 0 && (await imageLocator.isVisible({ timeout: 2000 }))) {
                            const src = await imageLocator.getAttribute('src');
                            if (src && !src.includes('static') && !src.includes('sprite')) {
                                postImageUrl = src;
                                this.logger.info(`Found post image: ${src.substring(0, 80)}...`);
                                break;
                            }
                        }
                    }

                    if (!postImageUrl) {
                        this.logger.info('No post image found or image could not be extracted.');
                    }
                }
            } catch (e) {
                this.logger.warn('Could not extract post media.');
            }

            this.logger.action('Generating AI comment...');
            const aiComment = await this.aiGenerator.generateInstagramComment(
                postCaption,
                targetUsername,
                aiPromptHint,
                postImageUrl,
                postVideoUrl
            );
            this.logger.success(`AI Generated Comment: "${aiComment}"`);

            const commentTextarea = this.page.locator(dialogSelector).locator('textarea[aria-label*="Add a comment"]');
            if ((await commentTextarea.count()) === 0) {
                this.logger.warn(`Comments might be disabled for this post. Cannot find comment area.`);
                await this.page.screenshot({
                    path: path.join(this.logsDir, `no_comment_area_error_${this.config.username}_${targetUsername}.png`),
                });
                return 'SKIPPED';
            }

            await this.humanBehavior.jitteryMovement(commentTextarea);
            await this.humanBehavior.randomDelay(1000, 3000);

            this.logger.action(`Typing comment...`);
            await this.humanBehavior.naturalTyping(commentTextarea, aiComment);
            await this.humanBehavior.randomDelay(1500, 4000);

            const postButton = this.page
                .locator(dialogSelector)
                .locator('form')
                .getByRole('button', { name: 'Post' });

            if ((await postButton.count()) === 0 || !(await postButton.isEnabled())) {
                this.logger.error(`Could not find an enabled "Post" button.`);
                await this.page.screenshot({
                    path: path.join(this.logsDir, `no_post_button_error_${this.config.username}_${targetUsername}.png`),
                });
                return 'FAILED';
            }

            this.logger.action(`Submitting the comment...`);
            await this.humanBehavior.hesitateAndClick(postButton);
            await this.humanBehavior.randomDelay(4000, 7000);

            const ourComment = this.page.locator(dialogSelector).getByText(aiComment);
            if ((await ourComment.count()) > 0) {
                this.logger.success(`Successfully commented on @${targetUsername}'s post.`);
                await this.logInteraction(targetUsername, 'comment', aiComment);
                return 'SUCCESS';
            } else {
                this.logger.warn(`Could not verify if comment was posted successfully.`);
                await this.logInteraction(targetUsername, 'comment', aiComment);
                return 'SUCCESS';
            }
        } catch (error: any) {
            this.logger.error(`An error occurred during comment task for @${targetUsername}: ${error.message}`);
            await this.page.screenshot({ path: path.join(this.logsDir, `comment_task_error_${this.config.username}_${targetUsername}.png`) });
            return 'FAILED';
        } finally {
            this.isCapturingVideo = false;
        }
    }
}
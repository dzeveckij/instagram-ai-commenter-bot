export interface Fingerprint {
    userAgent: string;
    viewport: { width: number; height: number };
    deviceScaleFactor: number;
    locale: string;
    timezoneId: string;
    colorScheme: 'light' | 'dark';
    reducedMotion: 'no-preference' | 'reduce';
    hardwareConcurrency: number;
    deviceMemory: number;
    webgl: {
        vendor: string;
        renderer: string;
    };
    canvas?: string;
    audioContext?: {
        sampleRate: number;
        channelCount: number;
    };
}

type Platform = 'windows' | 'macos';

const platformData = {
    windows: {
        userAgents: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        ],
        viewports: [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1600, height: 900 },
            { width: 1280, height: 720 },
            { width: 1680, height: 1050 },
            { width: 2560, height: 1440 },
        ],
        webgl: [
            {
                vendor: 'Google Inc. (NVIDIA)',
                renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
            },
            {
                vendor: 'Google Inc. (NVIDIA)',
                renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
            },
            {
                vendor: 'Google Inc. (Intel)',
                renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
            },
            {
                vendor: 'Google Inc. (AMD)',
                renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
            },
            {
                vendor: 'Google Inc. (Intel)',
                renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
            },
        ],
    },
    macos: {
        userAgents: [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        ],
        viewports: [
            { width: 1440, height: 900 },
            { width: 1280, height: 800 },
            { width: 1512, height: 982 },
            { width: 1728, height: 1117 },
            { width: 1792, height: 1120 },
            { width: 2560, height: 1600 },
        ],
        webgl: [
            { vendor: 'Apple Inc.', renderer: 'Apple M1' },
            { vendor: 'Apple Inc.', renderer: 'Apple M2' },
            { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro' },
            { vendor: 'Apple Inc.', renderer: 'Apple M2 Pro' },
            { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 655' },
            { vendor: 'AMD Inc.', renderer: 'AMD Radeon Pro 5500M' },
        ],
    },
};

const commonData = {
    locales: [
        {
            locale: 'en-US',
            timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'],
        },
        { locale: 'en-US', timezones: ['Europe/London', 'Europe/Dublin'] },
        { locale: 'en-US', timezones: ['America/Toronto', 'America/Vancouver', 'America/Montreal'] },
        { locale: 'en-US', timezones: ['Australia/Sydney', 'Australia/Melbourne'] },
        { locale: 'en-GB', timezones: ['Europe/London'] },
        { locale: 'en-CA', timezones: ['America/Toronto', 'America/Vancouver'] },
    ],
    hardwareConcurrency: [4, 6, 8, 12, 16, 20],
    deviceMemory: [4, 8, 16, 32],
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateCanvasFingerprint = (): string => {
    const texts = [
        'BrowserLeaks,com <canvas> 1.0',
        'Canvas fingerprint test 🔒',
        'Cwm fjordbank glyphs vext quiz',
        'How quickly daft jumping zebras vex',
    ];
    const fonts = ['Arial', 'Helvetica', 'Times New Roman', 'Verdana', 'Courier New'];
    
    const selectedText = getRandomItem(texts);
    const selectedFont = getRandomItem(fonts);
    
    return `${selectedText}-${selectedFont}-${Math.random().toString(36).substring(2, 8)}`;
};

const generateAudioContext = () => ({
    sampleRate: getRandomItem([44100, 48000]),
    channelCount: getRandomItem([1, 2]),
});

export const generateFingerprint = (): Fingerprint => {
    const platform: Platform = Math.random() < 0.65 ? 'windows' : 'macos';
    const data = platformData[platform];
    const localeInfo = getRandomItem(commonData.locales);
    const viewport = getRandomItem(data.viewports);

    let deviceScaleFactor = 1;
    if (platform === 'macos') {
        deviceScaleFactor = Math.random() < 0.7 ? 2 : 1;
        if (viewport.width >= 2560) {
            deviceScaleFactor = Math.random() < 0.5 ? 2 : 1;
        }
    } else {
        if (viewport.width >= 1920) {
            deviceScaleFactor = getRandomItem([1, 1.25, 1.5, 2]);
        } else if (viewport.width >= 1440) {
            deviceScaleFactor = getRandomItem([1, 1.25]);
        }
    }

    const hardwareConcurrency = getRandomItem(commonData.hardwareConcurrency);
    let deviceMemory = getRandomItem(commonData.deviceMemory);
    
    if (hardwareConcurrency <= 4) {
        deviceMemory = Math.min(deviceMemory, 8);
    } else if (hardwareConcurrency <= 8) {
        deviceMemory = Math.min(deviceMemory, 16);
    }

    return {
        userAgent: getRandomItem(data.userAgents),
        viewport: viewport,
        deviceScaleFactor: deviceScaleFactor,
        locale: localeInfo.locale,
        timezoneId: getRandomItem(localeInfo.timezones),
        colorScheme: Math.random() < 0.85 ? 'light' : 'dark',
        reducedMotion: Math.random() < 0.95 ? 'no-preference' : 'reduce',
        hardwareConcurrency: hardwareConcurrency,
        deviceMemory: deviceMemory,
        webgl: getRandomItem(data.webgl),
        canvas: generateCanvasFingerprint(),
        audioContext: generateAudioContext(),
    };
};
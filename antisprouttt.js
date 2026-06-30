class NecumKokot {
    constructor() {
        this.antiDebug();
        this.hideTraces();
    }
    antiDebug() {
        setInterval(() => {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                window.location.reload();
            }
        }, 1000);
        const noop = () => {};
        ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
            console[method] = noop;
        });
        window.onerror = () => true;
        window.onunhandledrejection = () => {};
        const threshold = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                document.body.innerHTML = '';
            }
        }, 500);
    }
    hideTraces() {
        const cleanup = () => {
            document.querySelectorAll('[id*="status"], [class*="logger"]').forEach(el => {
                el.remove();
            });
        };
        cleanup();
        setInterval(cleanup, 100);
        history.pushState(null, null, location.href);
        window.onpopstate = () => {
            history.pushState(null, null, location.href);
        };
    }
}
window.addEventListener('load', () => {
    new NecumKokot();
});
class NecumKokot {
    constructor() {
        this.ZavriPicu();
        this.DrzKokot();
    }
    ZavriPicu() {
        setInterval(() => {
            const picus = performance.now();
            debugger;
            const jebko = performance.now();
            if (jebko - picus > 100) {
                window.location.reload();
            }
        }, 1000);
        const Kokotko = () => {};
        ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
            console[method] = Kokotko;
        });
        window.onerror = () => true;
        window.onunhandledrejection = () => {};
        const nicetrytyprijebany = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > nicetrytyprijebany || 
                window.outerWidth - window.innerWidth > nicetrytyprijebany) {
                document.body.innerHTML = '';
            }
        }, 500);
    }
    DrzKokot() {
        const totonereversnestyjebko = () => {
            document.querySelectorAll('[id*="status"], [class*="logger"]').forEach(el => {
                el.remove();
            });
        };
        totonereversnestyjebko();
        setInterval(totonereversnestyjebko, 100);
        history.pushState(null, null, location.href);
        window.onpopstate = () => {
            history.pushState(null, null, location.href);
        };
    }
}
window.addEventListener('load', () => {
    new NecumKokot();
});
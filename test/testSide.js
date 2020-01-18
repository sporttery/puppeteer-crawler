const Puppeteer = require('puppeteer');

(async () => {
    await Puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 1920,
            height: 966
        }
    }).then(async browser => {
        let addr = 'https://item.taobao.com/item.htm?spm=2013.1.w4023-14897643938.5.16cf23f32keCZo&id=521902414254';
        let pages = await browser.pages();
        pages[0].goto(addr);
        browser.on('targetchanged', async (target) => {
            let page = await target.page();
            page.on('domcontentloaded', async () => {
                console.info('domcontentloaded');
                const handle = await page.evaluateHandle(() => ({window, document}));
                const properties = await handle.getProperties();
                const windowHandle = properties.get('window');
                const documentHandle = properties.get('document');
                console.info(windowHandle);
                // await handle.dispose();
            });
        });
    });
})();
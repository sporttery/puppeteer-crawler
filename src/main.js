const Puppeteer = require('puppeteer');
const Config = require('./Config');
const Taobao = require('./supply/Taobao');
const TMall = require('./supply/Tmall');
const JD = require('./supply/Jd');
const Pdd = require('./supply/Pdd');
const Alibaba = require('./supply/Alibaba');
const logger = require('./Logger');




logger.info('start puppeteer .......');

(async () => {
    await Puppeteer.launch({
        headless: false,
        // devtools:true
        defaultViewport: {
            width: 1600,
            height: 900
        }
        
    }).then(async browser => {
        let addrs = Config.defaultHomeUrl.split(",");
        let pages = await browser.pages();
        pages[0].goto(addrs[0]);
        if(addrs.length>1){
            console.log(addrs);
            for(let i=1;i<addrs.length;i++){
                const page = await browser.newPage();
                await page.goto(addrs[i]);
                const client = await page.target().createCDPSession();
                await client.send('Page.enable');
                await client.send('Network.enable');
                // if(page.url().indexOf("pinduoduo") !=-1 && page.$(".login-info-section") !=null){
                //     logger.info('---t pdd ---');
                //     await Pdd.init(page);
                // }
            }
        }
        
        
        browser.on('targetcreated', async (target) => {
            let page = await target.page();
            let url = await target.url();
            await addEvent(page, url).catch((e) => {
                if(e.message.indexOf('on\' of null')==-1){
                    logger.error(e)
                }
            });
        });
        browser.on('targetchanged', async (target) => {
            let page = await target.page();
            let url = await target.url();
            await addEvent(page, url).catch((e) => {
                if(e.message.indexOf('on\' of null')==-1){
                    logger.error(e)
                }
            });
        });
    });
})();

async function addEvent(page, url) {
    await page.on('domcontentloaded', async () => {
        await init(page, url);
    });
    page.on('error', () => {
        page.close();
    });
    page.on('close', () => {
    });
}

async function init(page, addr) {
    logger.info('请求:', addr);
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Network.enable');
    
    let urls = addr.match(/([a-z0-9--]{1,200})(\.([a-z0-9]{2,10}))+\.(com|cn)/gi);
    if (!urls || urls.length <= 0) {
        return 0;
    }
    console.log(urls);

    // if(page.url().indexOf("pinduoduo") !=-1 && page.$(".login-info-section") !=null){
    //     logger.info('---t pdd ---');
    //     await Pdd.init(page);
    // }
    if (Config.domain.indexOf(urls[0]) === -1) return 0;
    if (urls[0].indexOf('taobao') !== -1) {
        logger.info('---tao bao---');
        await Taobao.init(page);
    }
    if (urls[0].indexOf('tmall') !== -1) {
        logger.info('---t tmall---');
        await TMall.init(page);
    }
    if (urls[0].indexOf('jd') !== -1) {
        logger.info('---t jd---');
        await JD.init(page);
    }
    
    if (urls[0].indexOf('1688') !== -1) {
        logger.info('---t 1688---');
        await Alibaba.init(page);
    }
}


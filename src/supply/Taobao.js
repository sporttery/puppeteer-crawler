const auth = require('../Auth');
const item = require('../Item');
const itemApi = require('../ItemApi');
const logger = require('../Logger');

let token = '';

async function startCollection(page) {
    logger.info('startCollection');

    item.spec = [{
        spuName: '默认',
        marketPrice: 100,
        singleCost: 100,
        weight: 1,
        stock: 1,
        allocConfig: undefined,
        deleted: false,
        sku: [{
            skuName: '默认',
            unit: 1,
            price: 100,
            wholesalePrice: 100,
            wholesaleMark: false,
            retailMark: false,
            deleted: false
        }]
    }];
    item.slide = [];
    item.headerPic = undefined;
    item.thumbnail = undefined;
    item.effect = undefined;
    item.name = undefined;
    item.body = '';
    auth.getToken().then(async (managerToken) => {
        token = managerToken;
        logger.info('start pull....');

        await getItemName(page);
        await page.waitForSelector('#J_UlThumb');
        await getGoodSwiper(page);
        await getItemEffect(page);
        await getItemBody(page);
        logger.info(item);
        page.evaluate(() => {
            let state = confirm('抓取已完成, 是否提交');
            if (state) {
                let button = document.getElementById('_pp_id');
                button.innerText = '上传中';
                button.style.color = '#999';
                button.style.background = '#D5D5D5';
                button.disabled = true;
                window.uploadItem();
            } else {
                let button = document.getElementById('_pp_id');
                button.innerText = '抓取';
                button.style.color = 'white';
                button.style.background = 'brown';
                button.disabled = false;
            }
        });
    }).catch((err) => {
        logger.error(err);
    });

}

async function getItemName(page) {
    let title = await page.$eval('.tb-main-title', e => e.innerHTML);
    title = title.replace(/(^\s*)|(\s*$)/g, '');
    item.name = title;
    logger.info('商品标题:', title);
}

async function getGoodSwiper(page) {
    const goodSwiper = await page.$$eval('#J_UlThumb li', e => {
        let arr = [];
        for (let i = 0; i < e.length; i++) {
            arr.push(e[i].children[0].children[0].children[0].src.replace('_60x60', '_600x600').replace('_50x50', '_600x600'));
        }
        return arr;
    });
    item.slide = goodSwiper;
    item.headerPic = goodSwiper[0];
    item.thumbnail = goodSwiper[0];
    logger.info('缩略图:', item.thumbnail);
}

async function getItemEffect(page) {
    let effect = await page.$$eval('.attributes-list li', e => {
        let a = '...';
        e.forEach(li => {
            if (li.innerText.indexOf('功效:') !== -1) {
                return a = li.title;
            }
        });
        return a;
    });
    item.effect = effect;
    logger.info('商品功效:', effect);
}

async function getItemBody(page) {
    item.body = await page.$eval('#J_DivItemDesc', e => e.innerHTML);
    console.info('获取商品详情成功');
}

async function addCollectionButton(page) {
    await page.evaluate(() => {
        let button = document.createElement('button');
        button.setAttribute('id', '_pp_id');
        button.addEventListener('click', () => {
            window.ft2Click();
        });
        button.style.position = 'fixed';
        button.style.left = '30px';
        button.style.top = '100px';
        button.style.zIndex = '100000000';
        button.style.borderRadius = '50%';
        button.style.border = 'none';
        button.style.height = '80px';
        button.style.width = '80px';
        button.style.lineHeight = '80px';
        button.style.color = 'white';
        button.style.background = 'brown';
        button.style.outline = 'none';
        button.innerText = '采集';
        document.body.appendChild(button);
    });
}

async function disableButton(page, disable) {
    if (!disable) {
        await page.evaluate(() => {
            let button = document.getElementById('_pp_id');
            button.innerText = '抓取';
            button.style.color = 'white';
            button.style.background = 'brown';
            button.disabled = false;
        });
    } else {
        await page.evaluate(() => {
            let button = document.getElementById('_pp_id');
            button.innerText = '抓取中';
            button.style.color = '#999';
            button.style.background = '#D5D5D5';
            button.disabled = true;
        });
    }
}


module.exports = {
    async init(page) {
        await addCollectionButton(page);

        await page.exposeFunction('ft2Click', async () => {
            await disableButton(page, true);
            await startCollection(page);
        }).catch(() => {
        });

        await page.exposeFunction('uploadItem', async () => {
            logger.info('upload item');
            let params = await itemApi.analyze(item);
            params.slide = params.slide.map((item) => ({picUrl: item}));
            params.slide = JSON.stringify(params.slide);
            params.spec = JSON.stringify(params.spec);
            params.postage = JSON.stringify(params.postage);
            logger.info(params);
            itemApi.add(params, token).then(res => {
                logger.info(res);
                if (res.data.code === 200) {
                    page.evaluate(() => {
                        alert('提交完成');
                        let button = document.getElementById('_pp_id');
                        button.innerText = '已上传';
                        button.style.color = 'white';
                        button.style.background = 'brown';
                        button.disabled = true;
                    });
                } else {
                    page.evaluate(() => {
                        alert('提交失败');
                        let button = document.getElementById('_pp_id');
                        button.innerText = '抓取';
                        button.style.color = 'white';
                        button.style.background = 'brown';
                        button.disabled = false;
                    });

                }
            }).catch((err) => {
                logger.error(err);
            });
        }).catch(() => {
        });
    }
};
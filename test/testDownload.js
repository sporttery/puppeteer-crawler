const Utils = require("../src/Utils")

const Puppeteer = require('puppeteer');
const args = process.argv.splice(2);
const addr = "http://mobile.yangkeduo.com/goods.html?goods_id=7959384177&page_from=39&is_spike=0&refer_page_name=mall&refer_page_id=10039_1571531648778_1w1jlXIGvV&refer_page_sn=10039";
const addrs = [];
if (args.length == 0) {
    addrs.push(addr);
}

console.log(args);
for (var i = 0; i < args.length; i++) {
    let url = args[i];
    if (url.indexOf("http") == 0) {
        addrs.push(url);
    } else {
        console.log(url + " 不是正常的url,不处理");
    }
}

async function download(page, addr) {
    await page.goto(addr);
    await page.waitForSelector("#goods-reviews-module");
    let goods = await page.evaluate(() => {
        return rawData.store.initDataObj.goods;
    });
    console.log(goods);
    let goodsName = goods.goodsName;
    let detailGallery = [];
    let topGallery = [];
    let goodsDesc = goods.goodsDesc;
    let skus = [];
    for (var i = 0; i < goods.topGallery.length; i++) {
        topGallery.push(goods.topGallery[i].split("?")[0]);
    }
    for (var i = 0; i < goods.detailGallery.length; i++) {
        detailGallery.push(goods.detailGallery[i].url.split("?")[0]);
    }

    const title = goodsName;
    let detailContent = [];

    detailContent.push("标题：" + title);



    for (var i = 0; i < goods.skus.length; i++) {
        let sku = goods.skus[i];
        let price = sku.groupPrice;
        let normalPrice = sku.normalPrice;
        let skuName = sku.specs[0].spec_value.replace("（", "(").replace("）", ")");
        let count = sku.quantity;
        let skuImgUrl = sku.thumbUrl;
        let imgName = skuName + "-" + skuImgUrl.split("/").slice(-1)[0];
        let fileName = "../images/alibaba/" + goodsName + "/头图/" + imgName;
        await Utils.downloadFromUrl(skuImgUrl, fileName);
        detailContent.push("规格名：" + skuName + ",拼团价：" + price + "，单买价：" + normalPrice + ",库存：" + count + ",图片：" + imgName);
        skus.push(skuName, price, normalPrice, count, imgName, skuImgUrl, fileName);
    }

    detailContent.push("详细说明：" + goodsDesc);


    let detail = detailContent.join("\r\n");
    await Utils.writeToFile(detail, "../images/alibaba/" + title + "/详细说明文字.txt");

    let dir = "../images/alibaba/" + title + "/头图";

    await Utils.downloadList(topGallery, dir);
    dir = "../images/alibaba/" + title + "/详情图";
    await Utils.downloadList(detailGallery, dir);

    console.log(addr + "完成下载");
}

(async () => {
    if (addrs.length == 0) {
        console.log("没什么可以做的，直接退出了");
        return;
    }
    await Puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 1920,
            height: 966
        }
    }).then(async browser => {

        let pages = await browser.pages();
        let page = pages[0];
        for (var i = 0; i < addrs.length; i++) {
            await download(page, addrs[i]);
        }

        await browser.close();



    });
})();
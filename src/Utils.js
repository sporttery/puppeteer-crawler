const rp = require('request-promise');
const axios = require('axios/index');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {
    Base64
} = require('js-base64');
const logger = require('./Logger');
const assert = require('assert');


axios.defaults.withCredentials = true;

/**
 * 异步延迟
 * @param {number} time 延迟的时间,单位毫秒
 */
async function sleep(time = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    })
};

async function addCollectionButton(page, background = "red", color = "white") {
    await page.evaluate((background, color) => {
        if (document.getElementById('_pp_id') != null) {
            return;
        }
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
        button.style.cursor = 'pointer';
        button.style.lineHeight = '80px';
        button.style.color = color;
        button.style.background = background;
        button.style.outline = 'none';
        button.style.fontWeight = "bold";
        button.style.fontSize = "21px";
        button.innerText = '采集';
        document.body.appendChild(button);
        window.background = background;
        window.color = color;
    }, background, color);

}

async function disableButton(page, disable, background = "red", color = "white", text = "抓取") {
    if (disable) {
        await page.evaluate(() => {
            let button = document.getElementById('_pp_id');
            button.innerText = '抓取中';
            button.style.color = '#999';
            button.style.background = '#D5D5D5';
            button.disabled = true;
        });

    } else {
        await page.evaluate(() => {
            let button = document.getElementById('_pp_id');
            button.innerText = text;
            button.style.color = color;
            button.style.background = background;
            button.disabled = false;
        }, background, color, text);
    }
}


async function downloadList(imgList, dir) {
    await mkdirSync(dir);
    let newArray = [];
    for (const index in imgList) {
        let img = imgList[index];
        const arg = url.parse(img);

        // const fileName = Base64.encode(arg.pathname.split('/').slice(-1)[0]) + ".jpg";
        const fileName = parseInt((parseInt(index) + 1)) + "-" + arg.pathname.split('/').slice(-1)[0];
        const filePath = path.join(dir, fileName);
        newArray[index] = filePath;
        try {
            await downloadFromUrl(img, filePath);
        } catch (e) {
            logger.info(e);
        }
    }

    logger.info('downloadList 下载完成...', newArray);
    return newArray;

}

async function downloadFromUrl(url, filePath) {
    if (url.indexOf('//') === 0) {
        url = 'http:' + url;
    }
    logger.info('下载图片:', url);
    await mkdirSync(path.dirname(filePath));
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    await response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        let time = setTimeout(() => {
            time = null;
            reject('time out');
        }, 3000);
        writer.on('finish', async () => {
            logger.info('保存图片完成:', url, " -> ", filePath);
            clearTimeout(time);
            return await resolve();
        });
        writer.on('error', async () => {
            logger.info('download error');
            clearTimeout(time);
            return await reject();
        });
    });
}

async function mkdirSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    }
    if (mkdirSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
    }
    return false;
}


async function getResourceTree(page) {
    const client = await page.target().createCDPSession();
    var resource = await client.send('Page.getResourceTree');
    return resource.frameTree;
}


async function getResourceContent(page, imgUrl) {
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Network.enable');
    const {
        content,
        base64Encoded
    } = await client.send(
        'Page.getResourceContent', {
            frameId: String(page.mainFrame()._id),
            url: imgUrl
        },
    );
    assert.equal(base64Encoded, true);
    return content;
};

async function downloadFromCache(page, imgUrl, filePath) {
    logger.info('下载图片:', imgUrl);
    const content = await getResourceContent(page, imgUrl);
    const contentBuffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filePath, contentBuffer, 'base64');
    logger.info('保存图片完成:', imgUrl, " -> ", filePath);
}


async function downloadListCache(page, urlList, dir) {
    await mkdirSync(dir);
    var arr = [];
    for (let i = 0; i < urlList.length; i++) {
        const imgUrl = urlList[i];
        const arg = url.parse(imgUrl);

        // const fileName = Base64.encode(arg.pathname.split('/').slice(-1)[0]) + ".jpg";
        const fileName = parseInt(parseInt(i) + 1) + "-" + arg.pathname.split('/').slice(-1)[0];

        const filePath = path.join(dir, fileName);
        arr.push(filePath);
        try {
            await downloadFromCache(page, imgUrl, filePath);
        } catch (e) {
            logger.info(e);
        }
    }
    logger.info('downloadListCache 下载完成...', arr);

}

async function writeToFile(content, file, logContent = true) {
    logger.info(file, path.dirname(file));
    await mkdirSync(path.dirname(file));
    logger.info("开始写入文件,写入内容：");
    if (logContent) {
        logger.info(content);
    } else {
        logger.info("长度：" + content.length);
    }
    await fs.writeFileSync(file, content);
    logger.info("写入文件完成");
}

function parseNumber(str) {
    str = str + "";
    str = str.replace(/[^\d.]/g, "");
    if (str.length == 0) {
        return 0;
    }
    if (str.indexOf(".") != -1) {
        return parseFloat(str);
    } else {
        return parseInt(str);
    }
}

module.exports = {
    sleep,
    addCollectionButton,
    disableButton,
    mkdirSync,
    downloadList,
    downloadFromUrl,
    downloadListCache,
    downloadFromCache,
    parseNumber,
    writeToFile
};
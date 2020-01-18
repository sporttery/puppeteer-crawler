const rp = require('request-promise');
const axios = require('axios/index');
const fs = require('fs');
const path = require('path');
const url = require('url');
const auth = require('./Auth');
const {Base64} = require('js-base64');
const Config = require('./Config');
const logger = require('./Logger');

const ossType = {
    item: 1, // 1、商品图片
    itemBrand: 2, // 2、商品品牌图片
    itemClass: 3, // 3、商品分类图片
    article: 4, // 4、文章图片
    articleClass: 5, // 5、文章分类图片
    adv: 6, // 6、广告图片
    customize: 7, // 7、个性化配置图片
    order: 8, // 8、订单图片
    reply: 9 // 9、评论图片
};

const subMold = {
    item: 1, // 1、商品图片
    slide: 2, // 2、商品幻灯片
    itemDes: 3, // 3、商品详情
    itemDoc: 4, // 4、商品资质文档
    mini: 5 // 5、商品分享小程序码
};


module.exports = {
    ossType,
    subMold,
    ossUploadFile
};

async function ossUploadFile(fileList, type = ossType.item, sub = subMold.itemDes, dir = '../images/') {

    let newArray = [];
    await mkdirSync(dir);

    for (const index in fileList) {
        let img = fileList[index];
        logger.info('下载图片:', img);
        const arg = url.parse(img);
        const fileName = Base64.encode(arg.pathname.split('/').slice(-1)[0]) + '.jpg';
        newArray[index] = fileName;
        try {
            await download(img, dir, fileName);
        } catch (e) {
            logger.info(e);
        }
    }

    logger.info('下载完成...', newArray);

    // 上传OSS
    let ossImages = [];

    let token = '';
    await auth.getToken().then(managerToken => {
        token = managerToken;
    });
    for (let i in newArray) {
        let img = dir + '/' + newArray[i];
        let id = Math.random().toString(36).slice(4) + new Date().getTime();
        let imgPath = await uploadFile(token, id, img, type, sub);
        logger.info(imgPath);
        if (imgPath !== undefined) {
            ossImages[i] = imgPath;
        } else {
            ossImages[i] = img;
        }
    }
    return ossImages;
}

async function download(url, dir, file) {
    if (url.indexOf('//') === 0) {
        url = 'http:' + url;
    }
    const filePath = path.resolve(dir, file);
    const writer = fs.createWriteStream(filePath);
    const response = await axios({url, method: 'GET', responseType: 'stream'});
    await response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        let time = setTimeout(() => {
            time = null;
            reject('time out');
        }, 3000);
        writer.on('finish', async () => {
            logger.info('download success');
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

async function uploadFile(token, id, filePath, type, sub) {
    return await rp({
        method: 'get',
        uri: Config.apiUrl + '/api/oss/m/ossUpload',
        qs: {
            type: type,
            ID: id,
            subMold: sub
        },
        headers: {
            'x-manager-token': token
        }
    }).then(async (res) => {
        let data = JSON.parse(res);
        logger.info('获取上传签名成功');
        return await uploadOss(data, filePath);
    }).catch(() => {
        logger.info('获取oss配置失败');
    });
}

async function uploadOss(data, filePath) {
    let fileName = Math.random().toString(36).slice(4) + new Date().getTime() + '.jpg';
    let options = {
        method: 'POST',
        uri: data.host,
        formData: {
            key: data.dir + fileName,
            callback: data.callback,
            policy: data.policy,
            OSSAccessKeyId: data.accessid,
            success_action_status: 200,
            signature: data.signature,
            name: fileName,
            file: {
                value: fs.createReadStream(filePath),
                options: {
                    filename: fileName,
                    contentType: 'image/jpg'
                }
            }
        },
        headers: {
            'content-type': 'multipart/form-data'
        }
    };
    return await rp(options)
        .then(async (body) => {
            logger.info(body);
            return await JSON.parse(body).url;
        })
        .catch(function (err) {
            logger.info(err);
        });
}
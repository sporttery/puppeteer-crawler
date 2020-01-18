const axios = require('axios/index');
const queryString = require('query-string');
const oss = require('./Oss');
const Config = require('./Config');
const logger = require('./Logger');
/**
 *
 * @type {AxiosInstance}
 */
let instance = axios.create({
    baseURL: Config.apiUrl + '/api',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});


module.exports = {
    add(params, token) {
        return instance.post('/1/v1/item/m/item/add', queryString.stringify(params), {
            headers: {
                'x-manager-token': token
            }
        });
    },
    async analyze(params) {
        // 上传 缩略图
        logger.debug('上传 缩略图');
        let thumbnails = await oss.ossUploadFile([params.thumbnail], oss.ossType.item, oss.subMold.item, './images/thumbnail');
        params.thumbnail = thumbnails[0];
        logger.debug('上传 缩略图 完成');

        //  上传头图
        logger.debug('上传头图');
        let headerPics = await oss.ossUploadFile([params.headerPic], oss.ossType.item, oss.subMold.item, './images/headerPic');
        params.headerPic = headerPics[0];
        logger.debug('上传头图 完成');

        // 上传slide
        logger.debug('上传slide');
        params.slide = await oss.ossUploadFile(params.slide, oss.ossType.item, oss.subMold.slide, './images/slide');
        logger.debug('上传slide 完成');

        logger.debug('获取描述图片');
        let images = getBodyImages(params.body);
        logger.debug('body images', images);
        logger.debug('获取描述图片 成功');

        logger.debug('开始上传描述图片');
        if (images.length !== 0) {
            let bodyImages = await oss.ossUploadFile(images, oss.ossType.item, oss.subMold.itemDes, './images/desc');
            logger.debug('上传描述图片 成功');

            let body = params.body;
            for (let i in images) {
                body = body.replace(images[i], Config.ossImageUrl + bodyImages[i]);
            }
            params.body = body;
        } else {
            logger.error('无法上传描述图片');
        }

        return params;
    }
};

function getBodyImages(str) {
    let imgReg = /<img.*?(?:>|\/>)/gi;
    let srcReg = /src=[\'\"]?([^\'\"]*)[\'\"]?/i;
    let arr = str.match(imgReg);
    console.info(arr);
    let images = [];
    if (arr.length <= 0) {
        return images;
    }
    for (let i = 0; i < arr.length; i++) {
        let src = arr[i].match(srcReg);
        //获取图片地址
        if (src[1]) {
            images.push(src[1]);
        }
    }
    return images;
}
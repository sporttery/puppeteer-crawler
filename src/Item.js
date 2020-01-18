const Config = require('./Config');

module.exports = {
    thumbnail: undefined,
    headerPic: undefined,
    aptitude: undefined,
    name: undefined,
    effect: undefined,
    storeId: Config.storeId,
    categoryId: Config.categoryId,
    brandId: Config.brandId,
    producerId: Config.producerId,
    disabled: true,
    payMethod: undefined,
    allowEvent: 2,
    videoUrl: undefined,
    isNew: false,
    isHot: false,
    isRecommend: false,
    cartRecommend: false,
    isFreeExpress: true,
    expressType: 1,
    body: undefined,
    slide: [],
    spec: [{
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
    }],
    postage: []
};
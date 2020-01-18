/*
拼多多登录
*/
const axios = require('axios/index');
const logger = require('../Logger.js');
const Config = require('../Config.js');
const Utils = require('../Utils.js');



async function doLogin(page){
    logger.info('pdd oLogin');
    let userInfo = Config.pdd.split("@");
    let user = userInfo[0];
    let pwd = userInfo[1];
    logger.info("pdd user: " + user + " , pwd: " + pwd);
    await page.bringToFront();
    await page.waitForSelector(".last-item");
    await page.click(".last-item");
    await page.focus("#usernameId");
    await page.type("#usernameId",user);
    await page.focus("#passwordId");
    await page.type("#passwordId",pwd);
    await page.click(".info-content button"); 
    await Utils.sleep(1000);
    let lastItem = await page.$(".last-item");
    if( lastItem == null ){
        logger.info("登录失败，需要手工扫码登录");
    }else{
        logger.info("登录完成，如果登录失败，就需要手工登录");
    }
}

async function init(page){
    await doLogin(page);
}

module.exports = {
    init,
    doLogin
};
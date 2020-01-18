
const axios = require('axios/index');
const logger = require('../Logger.js');
const Config = require('../Config.js');
const Utils = require('../Utils.js');
const Pdd = require('./Pdd');

async function getPddPage(page){
    let pages = await page.browser().pages();
    let myPage ;
    let find = false;
    for(var i=0;i<pages.length;i++){
        myPage = pages[i];
        if(myPage.url().indexOf("https://mms.pinduoduo.com")==0){
            logger.info("找到拼多多管理网页",myPage.url());
            find = true;
        }
        if(find && myPage.url().indexOf("/login") !=-1 && myPage.$(".login-info-section") !=null){
            // await Pdd.doLogin(myPage);
            // await myPage.evaluate(()=>{
            //     if($(".login-info-section").length==1){
            //         alert("这里不能自动登录，请先手动登录");
            //     }
            // });
            await page.evaluate(()=>{
                alert("拼多多不能自动登录，请先手动登录");
            });
        }

        if(find){
            break;
        }
    }
    if(!find){
        await page.evaluate(()=>{
            alert("没有找到拼多多的管理后台，自己打开吧");
        });
    }
    return myPage;
}


async function startCollection(page) {
    logger.info('startCollection');

    let title = await page.$eval('.d-title', e => e ? e.innerText : null);
    if (title != null && title.length > 0) {
        title = title.replace(/[/#$=\\()\[\]^%*!@{}"':;]/g,"").replace(/\s+/g,"");
        logger.info("商品标题：" + title);
    }


    
    //详情图可以直接从缓存里取
    const detailImgList = await page.$$eval('#mod-detail-description img', e => {
        let arr = [];
        for (let i = 0; i < e.length; i++) {
            if(e[i].parentNode.tagName=="A"){ //带超链接的图片不要
                continue;
            }
            let src = e[i].src;
            if(arr.indexOf(src)==-1){
                arr.push(src);
            }
        }
        console.log("detailImgList",arr);
        return arr;
    });
    // await Utils.downloadListCache(page, detailImgList, "../images/alibaba/" + title + "/detail/");
    let detailImgPathArr = await Utils.downloadList( detailImgList, "../images/alibaba/" + title + "/详情图/");
    //头图需要解析，从url里下载
    const headImgList = await page.$$eval('.tab-content-container li', e => {
        let arr = [];
        for (let i = 0; i < e.length; i++) {
            //{"preview":"https://cbu01.alicdn.com/img/ibank/2019/369/639/12228936963_1399159108.400x400.jpg","original":"https://cbu01.alicdn.com/img/ibank/2019/369/639/12228936963_1399159108.jpg"}
            let li = e[i];
            if(li.hasAttribute("data-imgs")){
                let imgData = JSON.parse(li.getAttribute("data-imgs"));
                arr.push(imgData.original);
            }
        }
        console.log("headImgList",arr);
        return arr;
    });

    let headImgPathArr = await Utils.downloadList(headImgList, "../images/alibaba/" + title + "/头图/");



    let costEntries = await page.evaluate(() => {
        let cost = $(".cost-entries:eq(0)").text().replace(/[^\d.]/g, "");
        if(cost == ""){
            return 0;
        }
        return cost;
    });
    if(costEntries==0){
        costEntries = 5;
    }
    
    let itemArrTemp  = await page.evaluate((title)=>{
        let arr = [];
        $(".d-content .table-sku tr").each(function(){
            var tds = $(this).find("td");        
            let obj = {};    
            let name  = JSON.parse($(this).attr("data-sku-config"))["skuName"].replace("（","(").replace("）",")");
            if($(tds[0]).find("img").length!=0){
                let dataImg  = $(tds[0]).find("span:eq(0)").attr("data-imgs");
                let dataObj = JSON.parse(dataImg);
                let imgUrl = dataObj.original;
                let fileName = name + "-" + imgUrl.split("/").slice(-1)[0];
                obj.imgUrl = dataObj.original;
                obj.fileName = "../images/alibaba/" + title + "/头图/"+fileName;
            }
            let price = tds[1].innerText.replace(/[^\d.]/g, "");
            let count = tds[2].innerText.replace(/[^\d.]/g, "");
            if(name.length > 18){
                if(name.indexOf("(")!=-1){
                    let namePart = name.split(/[(+]/);
                    let lastNamePart = "("+namePart[namePart.length-1];
                    name = name.substring(0,18-lastNamePart.length) + lastNamePart;
                }else{
                    name = name.substring(0,18);
                }                
            }
            obj.name = name;
            obj.price = price ;
            obj.count = count;
            console.log(obj);
            arr.push(obj);
        });
        return arr;
    },title);

    let itemArr = [];
    for(var i=0;i<itemArrTemp.length;i++){
        let obj = itemArrTemp[i];
        let itemInfo = "规格名: " +  obj.name + " , 价格：" + obj.price + " , 库存: " + obj.count;
        if(obj.imgUrl){
            await Utils.downloadFromUrl(obj.imgUrl,obj.fileName);
            itemInfo += " , 图片：" + obj.fileName;
        }
        itemArr.push(itemInfo);
    }
    

    let detail = await page.evaluate((title) => {
        let trs = $("#mod-detail-attributes tr");
        let detailArr = [];
        let mid = location.href.split("/").slice(-1)[0].split(".")[0];
        detailArr.push("编号ID：" + mid );
        trs.each(function(){
            var tds = $(this).find("td");
            var contentSub = [];
            tds.each(function(idx){
                if(idx%2==0){//每2个加一个换行符
                    contentSub.push("\r\n");
                }
                contentSub.push($(this).text());
            });
            detailArr.push(contentSub.join("\t\t"));
        });
        detailArr.push("");
        detailArr.push("");
        // $("#mod-detail-description").find("p").each(function(){
        //     var text = $(this).text().replace(/\s+/,"");
        //     if(text!=""){
        //         detailArr.push(text.replace(/\d{5,}/g,"13714608818"));
        //     }
        // });

        return detailArr.join("\r\n"); 
    },title);

    
    itemArr.unshift("邮费: "+costEntries);
    itemArr.unshift("标题："+title);

    itemArr.push("");
    itemArr.push("");
    itemArr.push(detail);
    detail = "\r\n规格信息:\r\n" + itemArr.join("\r\n")    ;


    let videoSrc = await page.evaluate(() => {
        let videos = $("video");
        let src = [];
        if(videos.length>0){
            for(var i=0;i<videos.length;i++){
                src.push(videos[i].src);
            }
        }
        return src;
    });

    if(videoSrc.length>0){
        let fileName = videoSrc[0].split("/").slice(-1)[0];
        fileName = "../images/alibaba/" + title + "/头图/"+fileName;
        await Utils.downloadFromUrl(videoSrc[0],fileName);
        if(videoSrc.length>1){
            ileName = videoSrc[1].split("/").slice(-1)[0];
            fileName = "../images/alibaba/" + title + "/详情图/"+fileName;
            await Utils.downloadFromUrl(videoSrc[1],fileName);
        }
    }

    await Utils.writeToFile( detail, "../images/alibaba/" + title + "/详细说明文字.txt");

    await Utils.disableButton(page, false);

    let pddPage = await getPddPage(page);
    logger.info("当前拼多多地址： " + pddPage.url());
    if(pddPage!=null && pddPage.url().indexOf("/login")==-1){        
        await pddPage.bringToFront();
        await pddPage.goto("https://mms.pinduoduo.com/goods/goods_list");//商品列表
        await pddPage.click(".goods-search-status button");
        await Utils.sleep(1000);
        logger.info("停1秒结束");
        // await pddPage.waitForNavigation();
        logger.info("等待完成，寻找最后一个标签页");
        pddPage = await page.browser().pages().slice(-1)[0];//最后一个标签
        logger.info("当前拼多多地址： " + pddPage.url());
        await pddPage.bringToFront();
        await pddPage.waitForSelector("button[data-testid=beast-core-modal-ok-button]");
        await pddPage.click("button[data-testid=beast-core-modal-ok-button]");
        await pddPage.focus("input");
        await pddPage.$eval("input",e=>e.value="");
        await pddPage.type("input",title);
        await pddPage.click("ul[data-testid=beast-core-search-panel] li");
        await pddPage.click("button[data-testid=beast-core-button]");
    }

    // await pddPage.waitForNavigation();
    pddPage = await page.browser().pages().slice(-1)[0];
    logger.info("当前拼多多地址： " + pddPage.url());
    await pddPage.bringToFront();
    await pddPage.waitForSelector("#goods_name"); //等待元素加载完成

    await pddPage.$eval("#goods_name",e=>e.value=title);//输入商品名字

    await pddPage.click(".bottom-switch p");//展示 商品详情

    const fileHandle = await pddPage.$("#picture input[type=file]");

    
    await fileHandle.uploadFile(headImgPathArr.slice(0,10)); //上传前10张头图

    
    const detailFileHandle = await pddPage.$("#detail_pic input[type=file]");
    await detailFileHandle.uploadFile(detailImgPathArr.slice(0,20)); //上传前10张详情图


    await pddPage.$eval(".desc textarea",e=>e.value=detail); //设置详情内容

    await pddPage.$eval("#tiny_name",e=>e.value=title.substring(0,10)); // 设置简称

    await pddPage.click(".goods-spec button"); //点击添加规格

    await pddPage.click(".ant-select-selection");//点击规格列表选择

    await pddPage.click(".ant-select-dropdown-menu li:nth-child(2)");//选择型号

    let price = 0;
    for(var i=0;i<itemArrTemp.length;i++){ //循环添加规格
        var obj = itemArrTemp[i];
        await pddPage.type(".goods-spec-row .mui-form-group-input",obj.name);
        await pddPage.click(".goods-spec-row-btn a");
        
        if( i==0 && obj.imgUrl != null){
            await pddPage.click(".goods-spec-check input");            
        }
        if(obj.fileName!=null){
            let itemImage = await pddPage.$(".item-image:last-child");
            if(itemImage!=null && itemImage.style.display!="none"){
                let itemImageFileHandle = await itemImage.$("input[type=file]");
                if(itemImageFileHandle!=null){
                    await itemImageFileHandle.uploadFile(obj.fileName);
                }
            }
        }

        let tr = await pddPage.$(".goods-add-sku-list table tbody tr");
        tr.children[1].children[0].children[0]=obj.count;
        tr.children[2].children[0].children[0]=obj.price;
        tr.children[3].children[0].children[0]=parseFloat(obj.price)+1;
        tr.children[4].children[0].children[0]=obj.name;
        if(price < parseInt(obj.price) ){
            price = parseInt(obj.price);
        }
    }



    await pddPage.type("#market_price",price + 1);


    logger.info("商品信息添加完成。。");

}




module.exports = {
    async init(page) {

        await page.evaluate(() => {
            let lastHeight = document.body.scrollHeight;
            function scrollToButtom() {
                lastHeight += 100;
                window.scrollTo(0, lastHeight);
                if (document.body.scrollHeight >= lastHeight + 100) {
                    setTimeout(scrollToButtom, 500);
                } else {
                    console.log("到底了，总高度是：" + document.body.scrollHeight + " , 当前值为： " + lastHeight);
                }
            }
            scrollToButtom();
        });
   

        await page.exposeFunction('ft2Click', async () => {
            await Utils.disableButton(page, true);
            await startCollection(page);
        }).catch(() => {
        });

        

        logger.info("页面加载完,等待2秒后增加采集按键");

        await Utils.sleep(2000);

        await Utils.addCollectionButton(page);

        logger.info("采集按键已装载，等待操作!!");

    }
};
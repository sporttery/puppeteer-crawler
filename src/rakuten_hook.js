/*乐天网的数据采集，采集关键字搜索出来第一页的所有标题，以及评论最多前5的标题，将所有脚本复制到控制台直接执行就可以了 
要在 https://search.rakuten.co.jp/search/mall 页面执行
*/
function doSearchCallBack(parentKeyword) {
    var arr = window["g_search"][parentKeyword];
    return function (d) {
        d = safeHtml(d);
        var html, keyword;
        idx = d.indexOf("<div class=\"dui-container nav\">");
        endIdx = d.indexOf("<div class=\"dui-container main\">");
        if (idx > 0 && endIdx > idx) {
            nav = d.substring(idx, endIdx);
            keyword = $(nav).find(".keyword").text().split(/[「」]/)[1];
            console.log("检索关键字[" + keyword + "] 完成");
            window["g_cache"][keyword] = d;
            idx = d.indexOf("relatedkeywords");
            endIdx = d.indexOf('<div class="adBta">');
            if (idx != -1 && endIdx > idx) {
                count = d.match(/<span class="count _medium">(.+?)<\/span>/)[1].split(/[（）]/)[1];
                html = "<div class=\"dui-container " + d.substring(idx, endIdx).replace("</h3>", count + "</h3>");
            } else {
                body = $(d);
                count = body.find(".count._medium").text().split(/[（）]/)[1];
                html = body.find(".relatedkeywords").prop("outerHTML");
                if (html) {
                    html = html.replace("</h3>", count + "</h3>");
                } else {
                    console.log("关键字[" + keyword + "] 找不到指定的数据");
                    return;
                }
            }
            $(".main").append(html);
            $(html).find(".item").each((idx, el) => {
                var subkeyword = $(el).text();
                if (!window["g_search"][keyword]) {
                    window["g_search"][keyword] = [];
                }
                window["g_search"][keyword].push(subkeyword);
            });
            if (keyword == arr[arr.length - 1]) {
                setTimeout(() => {
                    layer.closeAll();
                    var html = ['<h3>'];
                    html.push('<a href="javascript:searchAll()" class="dui-button" style="color:red">采集数据</a>&nbsp;&nbsp;');
                    html.push('<a href="javascript:downloadData(0)" class="dui-button download" style="color:blue;display:none;">下载数据</a>&nbsp;&nbsp;');
                    html.push('<a href="javascript:downloadData(1)" class="dui-button download" style="color:blue;display:none;">下载关键字</a>&nbsp;&nbsp;');
                    html.push('<a href="javascript:downloadData(2)" class="dui-button download" style="color:blue;display:none;">下载TOP5</a>&nbsp;&nbsp;');
                    html.push('</h3><br/>');
                    $(".main").append(html.join(''));
                    $(".relatedkeywords a").attr("target", "_blank");
                    // $(".item").each((idx, el) => {
                    //     txt = $(el).text();
                    //     $(el).append('<input type="checkbox" checked="true" value="' + txt + '" />')
                    // })
                }, 2000);
            }
        }
    }
}

function doSearch(keyword, parentKeyword) {
    $.get(searchBaseUrl + keyword + "/", doSearchCallBack(parentKeyword));
}
window["g_keyword_first"] = "";

function doKeywords() {
    layer.prompt({
        title: '输入关键字，并确认',
        formType: 0
    }, function (keyword, index) {
        layer.close(index);
        layer.load(0);
        window["g_search"] = {};
        window["g_data"] = {};
        window["g_cache"] = {};
        window["g_keyword_first"] = keyword;
        window["g_search"][keyword] = [];
        //直接搜索
        $.get(searchBaseUrl + keyword + "/", function (d) {
            d = safeHtml(d);
            var html, keyword;
            idx = d.indexOf("<div class=\"dui-container nav\">");
            endIdx = d.indexOf("<div class=\"dui-container main\">");
            if (idx > 0 && endIdx > idx) {
                nav = d.substring(idx, endIdx);
                keyword = $(nav).find(".keyword").text().split(/[「」]/)[1];
                console.log("检索关键字[" + keyword + "] 完成");
                window["g_cache"][keyword] = d;
                idx = d.indexOf("relatedkeywords");
                endIdx = d.indexOf('<div class="adBta">');
                if (idx != -1 && endIdx > idx) {
                    count = d.match(/<span class="count _medium">(.+?)<\/span>/)[1].split(/[（）]/)[1];
                    html = "<div class=\"dui-container " + d.substring(idx, endIdx).replace("</h3>", count + "</h3>");
                } else {
                    body = $(d);
                    count = body.find(".count._medium").text().split(/[（）]/)[1];
                    html = body.find(".relatedkeywords").prop("outerHTML").replace("</h3>", count + "</h3>");
                }
                $(".main").append(html);
                //获得关键字第2层深度
                $(".relatedkeywords .item").each((idx, el) => {
                    var subkeyword = $(el).text();
                    window["g_search"][keyword].push(subkeyword);
                    doSearch(subkeyword, keyword);
                });
            }
        })
    })
}

function safeHtml(d) {
    return d.replace(/[\r\n]/g, "").replace(/<script.+?<\/script>/g, "").replace(/<img.+?>/g, "").replace(/<link.+?>/g, "").replace(/<style.+?<\/style>/g, "").replace(/-big/g, "");
}

function sortBy(a, b) {
    return b.legend - a.legend;
}
window["g_download"] = 0;

function downloadData(flag) {
    var now = new Date().getTime();
    filename = "全部数据-" + now + ".txt";
    if (flag == 1) {
        filename = "全部关键字-" + now + ".txt";
    } else if (flag == 2) {
        filename = "TOP5数据-" + now + ".txt";
    }
    if (window["g_download"] == 1) {
        var titles = [];
        if (flag == 1) {
            var firstkey = window["g_keyword_first"];
            var arr = window["g_search"][firstkey];
            titles.push(firstkey);
            for (var i = 0; i < arr.length; i++) {
                titles.push("\t" + arr[i]);
                var arr1 = window["g_search"][arr[i]];
                for (var j = 0; j < arr1.length; j++) {
                    titles.push("\t\t" + arr1[j]);
                }
            }
        } else {
            for (var key in window["g_data"]) {
                if (key != "keywords") {
                    var arr = window["g_data"][key];
                    if (flag == 0) {
                        titles.push("\n\n" + key);
                    }
                    top5 = [];
                    for (var i = 0; i < arr.length; i++) {
                        if (flag == 0) {
                            titles.push("\t" + arr[i].title);
                        }
                        if (i < 5) {
                            top5.push("\t" + arr[i].title);
                        }
                    }
                    titles.push(key + " (TOP5)");
                    titles.push(top5.join("\n"))
                }
            }
        }
        var content = titles.join("\n");
        var textArea = $("#textarea");
        if (textArea.length == 0) {
            $(".main").append('<textarea rows="50" id="textarea" autofocus="autofocus" readonly cols="280">' + content + '</textarea>')
        } else {
            textArea.val(content);
        }
        var textFileAsBlob = new Blob([content], {
            type: 'text/plain'
        });
        var downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.click();
        $(downloadLink).remove();
        return;
    }
    layer.alert("还没有准备好数据，请先获取数据");
}

function searchFinished(keyword) {
    var allKeywords = window["g_data"]["keywords"];
    window["g_data"][keyword].sort(sortBy);
    if (keyword == allKeywords[allKeywords.length - 1]) { //最后一个了
        // console.log(window["g_data"][keyword].slice(0, 5));
        setTimeout(() => {
            layer.close(window["loadIdx"]);
            $(".download").show();
            window["g_download"] = 1;
        }, 2000);
    }
}

function searchAllCallBack(d) {
    var html, keyword;
    idx = d.indexOf("<div class=\"dui-container nav\">");
    endIdx = d.indexOf("<div class=\"dui-container main\">");
    if (idx > 0 && endIdx > idx) {
        nav = d.substring(idx, endIdx);
        keyword = $(nav).find(".keyword").text().split(/[「」]/)[1];
        console.log("检索关键字[" + keyword + "] 完成");
        window["g_cache"][keyword] = d;
        window["g_data"][keyword] = [];
        idx = d.indexOf("searchresults");
        endIdx = d.indexOf("relatedkeywords");
        if (idx != -1 && endIdx > idx) {
            d = "<div class=\"dui-container " + d.substring(idx, endIdx) + "\"></div>";
            body = $(d);
            body.find(".searchresultitem").each((idx, el) => {
                var title = $(el).find(".title").text();
                var score = $(el).find(".score").text();
                var legend = $(el).find(".legend").text();
                if (score == "") {
                    score = 0;
                }
                if (legend == "") {
                    legend = 0;
                } else {
                    legend = parseInt(legend.replace(/[^\d]/g, ""));
                }
                if (title.substring(0, 2) != "PR" /* && legend > 0*/ ) {
                    window["g_data"][keyword].push({
                        title,
                        legend,
                        score
                    });
                }
            });
        }
        searchFinished(keyword);
    }

}

function searchAll() {
    window["g_data"] = {};
    window["g_data"]["keywords"] = [];
    window["loadIdx"] = layer.load(0);
    $(".download").hide();
    window["g_download"] = 0;
    $(".relatedkeywords .item").each((idx, el) => {
        var keyword = $(el).text();
        if (window["g_data"]["keywords"].indexOf(keyword) == -1) {
            window["g_data"]["keywords"].push(keyword);
            var d = window["g_cache"][keyword];
            if (d) {
                searchAllCallBack(d);
            } else {
                $.get(searchBaseUrl + keyword + "/", function (d) {
                    d = safeHtml(d);
                    searchAllCallBack(d);
                });
            }
        }
    });
}
//searchBaseUrl="/search/mall/";
function doHook() {
    if (location.href.indexOf("//search.rakuten.co.jp/search/mall") ==-1){
        if (confirm("只支持在指定页面运行，是否调到指定页面？")) {
            location.href = "//search.rakuten.co.jp/search/mall";
            return;
        }
    }
    if (typeof searchBaseUrl == "undefined") {
        searchBaseUrl = "/search/mall/";
    }
    var head = document.querySelector("head");
    if (typeof jQuery == "undefined") {
        if (!document.getElementById("hasJquery")) {
            console.error("开始注入标准库1");
            let jQuerySc = document.createElement("scr"+"ipt");
            jQuerySc.src = "http://libs.baidu.com/jquery/2.1.4/jquery.min.js";
            jQuerySc.id = "hasJquery";
            head.appendChild(jQuerySc);
        }
        console.error(new Date() + " 标准库1注入未完成，等待中....");
        setTimeout(doHook, 2000);
        return;
    }
    console.info("标准库1已经完成注入");
    if (typeof layer == "undefined") {
        if (!document.getElementById("hasLayer")) {
            console.error("开始注入标准库2");
            // jQuery("head").append('<link href="https://cdn.bootcdn.net/ajax/libs/layer/2.3/skin/layer.css" rel="stylesheet">'+
            // '<script src="https://cdn.bootcdn.net/ajax/libs/layer/2.3/layer.js" id="hasLayer"></script>');
            let layerJs = document.createElement("scr"+"ipt");
            layerJs.src = "https://cdn.bootcdn.net/ajax/libs/layer/2.3/layer.js";
            layerJs.id = "hasLayer";
            head.appendChild(layerJs);
            let layerCss = document.createElement("li"+"nk");
            layerCss.href="https://cdn.bootcdn.net/ajax/libs/layer/2.3/skin/layer.css";
            layerCss.rel="stylesheet";
            head.appendChild(layerCss);
        }
        console.error(new Date() + " 标准库2注入未完成，等待中....");
        setTimeout(doHook, 2000);
        return;
    }
    console.info("标准库2已经完成注入");
    $(".header,.nav,.footer,.anshin,.corporate,.tooltip,.overlay").remove();
    $(".main").html('<h1>脚本注入成功，功能说明：</h1><h3>1.输入<a href="javascript:doKeywords()" class="dui-button -big" style="color:red">关键字</a><br/>2.点搜索<br/>3.下拉到页面底部，找到热搜词 <br/>4.点击热搜词<br/>5.抓取打开页面评论最多的前5个，如果都不足5个，有多少取多少。（标题和图片）<br/>6 抓取整页的所有关键词，除打广告的除外<br/>7 重复456步骤，将第3步的所有热搜词和整页的词全部抓取一次<br/>8 完成第7步后，分别统计前5标题的词频和全面标题的词频<br/><br/> </h3>');
}

doHook();
const Puppeteer = require('puppeteer');
const log4js = require('log4js');
const Path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('assert');

let programName = process.argv0.split(/[\/\\]/g).pop();
if (programName.startsWith('node') && process.argv.length > 1) {
	programName = process.argv[1].split(/[\/\\]/g).pop();
}

log4js.configure({
	appenders: {
		console: {
			//记录器1:输出到控制台
			type: 'console'
		},
		log_file: {
			//记录器2：输出到文件
			type: 'file',
			filename: process.cwd() + `/logs/${programName}.log`, //文件目录，当目录文件或文件夹不存在时，会自动创建
			maxLogSize: 20971520, //文件最大存储空间（byte），当文件内容超过文件存储空间会自动生成一个文件test.log.1的序列自增长的文件
			backups: 3, //default value = 5.当文件内容超过文件存储空间时，备份文件的数量
			//compress : true,//default false.是否以压缩的形式保存新文件,默认false。如果true，则新增的日志文件会保存在gz的压缩文件内，并且生成后将不被替换，false会被替换掉
			encoding: 'utf-8' //default "utf-8"，文件的编码
		}
	},
	categories: {
		default: {
			appenders: ['console', 'log_file'],
			level: 'info'
		} //默认log类型，输出到控制台 log文件 log日期文件 且登记大于info即可
		// production: {appenders: ['data_file'], level: 'warn'},  //生产环境 log类型 只输出到按日期命名的文件，且只输出警告以上的log
		// console: {appenders: ['console'], level: 'debug'}, //开发环境  输出到控制台
		// debug: {appenders: ['console', 'log_file'], level: 'debug'}, //调试环境 输出到log文件和控制台
		// error_log: {appenders: ['error_file'], level: 'error'}//error 等级log 单独输出到error文件中 任何环境的errorlog 将都以日期文件单独记录
	}
});
const logger = log4js.getLogger();
logger.level = 'debug';

async function addCollectionButton(page, options) {
	if (!options) {
		options = {};
	}

	let first = await page.evaluate(options => {
		let first = 0;
		let button = document.getElementById('_pp_id');
		if (button == null) {
			first = 1;
			button = document.createElement('button');
			button.setAttribute('id', '_pp_id');
			button.addEventListener('click', () => {
				window.ft2Click();
			});
			document.body.appendChild(button);
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
			button.style.outline = 'none';
			button.style.fontWeight = 'bold';
			button.style.fontSize = '21px';
			window.btnCollect = button;
		}

		button.style.color = options.color || 'white';
		button.style.background = options.background || 'red';
		button.innerText = options.text || '采集';
		return first;
	}, options);
	if (first == 1) {
		// await addTaobaoLogo(page);
	}
}

async function addTaobaoLogo(page) {
	await page.evaluate(() => {
		jQuery('img').each((idx, img) => {
			let width = jQuery(img).width();
			let height = jQuery(img).height();
			if (width > 120 && height > 120 ) {
                let offset = jQuery(img).offset();
                let id = 'taobao_img_' + idx;
				let imgTaobao = document.getElementById(id);
				if (imgTaobao==null) {
					imgTaobao = new Image();
					imgTaobao.src =
						'http://cbu01.alicdn.com/cms/upload/2015/891/153/2351198_1367035968.png';
					imgTaobao.width = 118;
                    imgTaobao.height = 20;
                    imgTaobao.id = id;
					imgTaobao.addEventListener(
						'click',
						idx => {
							window.tbClick(idx);
						},
						idx
                    );
                    jQuery('<img src="http://cbu01.alicdn.com/cms/upload/2015/891/153/2351198_1367035968.png" title="淘宝找货源" style="cursor:pointer;margin-bottom:10px;width:128px;" onclick="tbClick('+idx+')"/><hr/>').insertBefore(jQuery(img).parents("div:eq(0)").children()[0])				
				}
			}
		});
	});
}

async function disableButton(page, options) {
	if (!options) {
		options = {};
	}

	await page.evaluate(options => {
		let button = document.getElementById('_pp_id');
		button.innerText = options.text || '采集中';
		button.style.color = options.color || '#999';
		button.style.background = options.background || '#D5D5D5';
		button.disabled = options.disable === false ? false : true;
	}, options);
}

async function getResourceContent(page, imgUrl) {
	const client = await page.target().createCDPSession();
	await client.send('Page.enable');
	await client.send('Network.enable');
	const { content, base64Encoded } = await client.send(
		'Page.getResourceContent',
		{
			frameId: String(page.mainFrame()._id),
			url: imgUrl
		}
	);
	assert.equal(base64Encoded, true);
	return content;
}

async function downloadFromCache(page, imgUrl, filePath) {
	await mkdirSync(Path.dirname(filePath));
	logger.info('下载图片:', imgUrl);
	const content = await getResourceContent(page, imgUrl);
	const contentBuffer = Buffer.from(content, 'base64');
	// fs.writeFileSync(filePath, contentBuffer, 'base64');
	await fs.writeFileSync(filePath, contentBuffer, 'base64');
	logger.info('保存图片完成:', imgUrl, ' -> ', filePath);
}
async function mkdirSync(dirname) {
	if (fs.existsSync(dirname)) {
		return true;
	}
	if (mkdirSync(Path.dirname(dirname))) {
		fs.mkdirSync(dirname);
		return true;
	}
	return false;
}

async function writeToFile(content, file, logContent = true) {
	logger.info(file, Path.dirname(file));
	await mkdirSync(Path.dirname(file));
	logger.info('开始写入文件,写入内容：');
	if (logContent) {
		logger.info(content);
	} else {
		logger.info('长度：' + content.length);
	}
	await fs.writeFileSync(file, content);
	logger.info('写入文件完成');
}

function getFolderName(str) {
	if (!str || str.length == 0) {
		return '未知文件夹';
	}
	return str.replace(/[<>:;.'@$%&^!~`#"/\\|?*\s]/g, '');
}

console.log('start .......', process.execPath, process.cwd());

const wordCountUrl =
	'https://mjzj.com/mai-jia-gong-ju/dan-ci-ci-shu-tong-ji.html';
const Config = {
	defaultHomeUrls: ['https://ranking.rakuten.co.jp', wordCountUrl]
};

(async () => {
	let startOpt = {
		headless: false,
		// devtools:true
		defaultViewport: {
			width: 1600,
			height: 900
		}
	};
	// console.log(process.pkg);
	const executablePath = Path.resolve(
		process.cwd(),
		'chrome-win',
		'chrome.exe'
	);
	if (fs.existsSync(executablePath)) {
		logger.info('executablePath:' + executablePath);
		startOpt.executablePath = executablePath;
	}
	// const puppeteerPath = Path.resolve(process.cwd(), "puppeteer");
	// if(fs.existsSync(puppeteerPath)){
	//     logger.info("puppeteerPath:" + puppeteerPath);
	//     Puppeteer = require("./puppeteer");
	// }
	await Puppeteer.launch(startOpt).then(async browser => {
		browser.on('targetcreated', async target => {
			let page = await target.page();
			let url = await target.url();
			await addEvent(page, url).catch(e => {
				if (e.message.indexOf("on' of null") == -1) {
					logger.error(e);
				}
			});
		});
		browser.on('targetchanged', async target => {
			let page = await target.page();
			let url = await target.url();
			await addEvent(page, url).catch(e => {
				if (e.message.indexOf("on' of null") == -1) {
					logger.error(e);
				}
			});
		});

		let addrs = Config.defaultHomeUrls;
		let pages = await browser.pages();
		try {
			pages[0].goto(addrs[0]);
		} catch (e) {
			logger.error(e);
		}
		if (addrs.length > 1) {
			for (let i = 1; i < addrs.length; i++) {
				let currentUrl = addrs[i];
				logger.info('再开一个标签：' + currentUrl);
				const page = await browser.newPage();
				try {
					page.goto(currentUrl);
				} catch (e) {
					logger.error(e);
				}
			}
		}
		await pages[0].bringToFront();
	});
})();

async function addEvent(page, url) {
	await page.on('domcontentloaded', async () => {
		if (
			url.endsWith('.jpg') ||
			url.endsWith('.gif') ||
			url.endsWith('.png') ||
			url.indexOf('mjzj.com') != -1
		) {
			return;
		}
		if (url.indexOf('about:blank') != -1 || url.indexOf('file://') != -1) {
			return;
		}
		await init(page, url);
	});
	await page.on('error', () => {
		page.close();
	});
	await page.on('close', () => {});
	// await page.on('console', msg => logger.info(url + '\n', ...msg.args));
}

async function startCollection(page) {
	let rnkRankingMain = await page.$('#rnkRankingMain');
	let sale_desc_imgs = await page.evaluate(() => {
		let results = [];
		jQuery('.sale_desc img').each((idx, img) => {
			results.push(jQuery(img).attr('src'));
		});
		return results;
	});
	let searchWords = await page.evaluate(() => {
		return jQuery('#ri-cmn-hdr-sitem').val();
	});
	if (rnkRankingMain != null) {
		logger.info('开始数据采集->热销排名表');
		await disableButton(page);
		await ranking(page);
	} else if (sale_desc_imgs.length > 0) {
		logger.info('开始数据采集->商品详情说明图片');
		await disableButton(page);
		await saleDesc(page, sale_desc_imgs);
	} else if (searchWords && searchWords.length > 0) {
		logger.info('开始数据采集->搜索列表图片');
		await disableButton(page);
		await searchPage(page, searchWords);
	} else {
		let confirm = await page.evaluate(() => {
            alert('这个页面还没有适配，暂时不能采集');
            // return confirm('这个页面还没有适配，如果继续，将抓取所有图片');
        });
		// if (confirm) {
		// 	logger.info('开始数据采集->所有图片');
		// 	await disableButton(page);
		// 	await allImgs(page);
		// }
	}
}

async function init(page, addr) {
	logger.info('请求:', addr);

	let imgCount = await page.evaluate(() => {
		window.imgLoad = 0;
		if (typeof jQuery == 'undefined') {
			return 0;
		}
		return jQuery('img').each(function(idx, img) {
			if (img.complete) {
				window.imgLoad = window.imgLoad + 1;
			} else {
				img.onload = function() {
					window.imgLoad = window.imgLoad + 1;
				};
			}
		}).length;
	});

	if (imgCount == 0) {
		logger.info('这个页面没有图片');
		return;
	}
	await page.waitForFunction(
		imgCount => window.imgLoad + 3 >= imgCount,
		{},
		imgCount
	);

	await addCollectionButton(page, {
		background: 'yellow',
		color: 'red'
	});

	let findFt2Click = await page.evaluate(() => {
		return window['ft2Click'];
	});
	if (!findFt2Click) {
		findFt2Click = async function() {
			await startCollection(page);
		};
		await page.exposeFunction('ft2Click', findFt2Click).catch(() => {});
	}

	let findTbClick = await page.evaluate(() => {
		return window['tbClick'];
	});
	if (!findTbClick) {
		findTbClick = async function(idx) {
			console.log(idx);
			let img = await page.evaluate(idx => {
				return jQuery('img:eq(' + idx + ')');
			}, idx);
            console.log(img);
            page.evaluate(()=>{
                alert("功能完成中");
            });
		};
		await page.exposeFunction('tbClick', findTbClick).catch(() => {});
	}

	let findSaveImg = await page.evaluate(() => {
		return window['saveImg'];
	});
	if (!findSaveImg) {
		findSaveImg = async function(imgSrc, fileName, dir, idx, imgCount) {
			if (imgSrc === 0) {
				logger.info('再次抓取');
				let obj = await page.evaluate(idx => {
					let img = jQuery('#downloadImg' + idx);
					img.hide();
					return {
						imgSrc: img.attr('src'),
						dir: img.attr('data-dir'),
						fileName: img.attr('data-fileName')
					};
				}, idx);
				logger.info(obj);
				imgSrc = obj.imgSrc;
				dir = obj.dir;
				fileName = obj.fileName;
			}
			let filePath = Path.resolve(dir, fileName);
			if (!fs.existsSync(filePath)) {
				logger.info('saveImg .....', imgSrc, fileName, dir, filePath);
				try {
					await downloadFromCache(page, imgSrc, filePath); //保存大圖
					if (idx + 1 >= imgCount) {
						//最后一张图片了
						logger.info('数据采集完成');
						await disableButton(page, {
							disable: false,
							background: 'red',
							color: 'white',
							text: '采集完'
						});
					}
				} catch (e) {
					logger.error('下载失败，重试开始', e);
					await page.evaluate(
						(imgSrc, fileName, dir, idx, imgCount) => {
							jQuery(
								'<img src="' +
									imgSrc +
									'" id="downloadImg' +
									idx +
									'" onload="saveImg(0,0,0,' +
									idx +
									',' +
									imgCount +
									')" data-dir="' +
									dir +
									'" data-fileName="' +
									fileName +
									'"  />'
							).appendTo('#footer');
						},
						imgSrc,
						fileName,
						dir,
						idx,
						imgCount
					);
					// await findSaveImg(imgSrc, fileName, dir, idx, imgCount);
				}
			}
		};
		await page.exposeFunction('saveImg', findSaveImg).catch(e => {
			logger.info(e);
		});
	}
}

async function ranking(page) {
	let pageInfo = await page.evaluate(() => {
		let title = jQuery('#rnkContentsTitleMain a:first')
			.text()
			.replace(/\s+/g, '');
		if (title == '') {
			title = jQuery('#rnkRanking_topBanner img:first')
				.attr('alt')
				.replace(/\s+/g, '');
		}
		let date = jQuery('#rnkGenreRanking_updateDate')
			.text()
			.replace(/\s+/g, '');
		if (date == '') {
			date = jQuery('#rnkRanking_updateDate')
				.text()
				.replace(/\s+/g, '');
		}
		let qijian = jQuery('.genreRankingSearchCondition .current')
			.text()
			.replace(/\s+/g, '');
		if (qijian == '') {
			qijian = jQuery('#rnkRankingTab dt[class*=_on]').attr('id');
			if (qijian) {
				qijian = qijian.replace('rnkRanking', '').replace(/\s+/g, '');
			}
		}
		if (title == '') {
			alert('此页面没有适配成功，暂时不能采集');
		}
		return {
			title,
			date,
			qijian
		};
	});
	logger.info('页面信息：', pageInfo);

	if (pageInfo.title == '') {
		return;
	}

	let fileDir = Path.resolve(
		'download',
		pageInfo.title,
		pageInfo.date,
		pageInfo.qijian
	);
	await mkdirSync(fileDir);
	logger.info('创建目录' + fileDir);

	let list = await page.evaluate(fileDir => {
		let imgList = [];
		// let footer = jQuery("#footer");
		let imgs = jQuery(
			'#rnkRankingMain .rnkRanking_image .rnkRanking_imageBox:visible'
		);
		let imgCount = imgs.length;
		imgs.each((i, div) => {
			let href = jQuery(div)
				.find('a:first')
				.attr('href');
			let src = jQuery(div)
				.find('img:first')
				.attr('src');
			let alt = jQuery(div)
				.find('img:first')
				.attr('alt');
			let srcBig = src.split('?')[0];
			let fileNameExt = srcBig.split('.').pop();
			let fileNameMin = i + 1 + '-min.' + fileNameExt;
			let fileName = i + 1 + '.' + fileNameExt;
			imgList.push({
				href,
				src,
				alt,
				srcBig,
				fileNameMin,
				fileName,
				fileDir
			});
			// jQuery('<img src="' + srcBig + '" class="downloadImg" onload="saveImg(this,0,0,'+i+','+imgCount+')" data-dir="'+fileDir+'" data-fileName="'+fileDir+'"  />').appendTo(footer);
			var img = new Image(); //创建一个Image对象，实现图片的预下载
			img.src = srcBig;

			if (img.complete) {
				// 如果图片已经存在于浏览器缓存，直接调用回调函数
				saveImg(srcBig, fileName, fileDir, i, imgCount);
				return; // 直接返回，不用再处理onload事件
			}
			img.onload = function() {
				//图片下载完毕时异步调用callback函数。
				saveImg(srcBig, fileName, fileDir, i, imgCount);
			};
		});
		return imgList;
	}, fileDir);
	let from =
		'采集自：' + page.url() + ' ,时间:' + new Date().toLocaleString();
	logger.info(from + ' 写到 ' + fileDir);
	let txt = [];
	let html = [
		'<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><head><style type="text/css">* { margin: 0; padding:0;}.left {float: left;margin:10px 10px;font-size:13px;overflow:auto;}.right {display: inline-block;margin:10px 10px;vertical-align: top; }.right table{ border-right:1px solid #F00;border-bottom:1px solid #F00}.right table td{border-left:1px solid #F00;border-top:1px solid #F00} .right table th{border-left:1px solid #F00;border-top:1px solid #F00} .left table{ border-right:1px solid #000;border-bottom:1px solid #000}.left table td{border-left:1px solid #000;border-top:1px solid #000} .left table th{border-left:1px solid #000;border-top:1px solid #000}</style><body>'
	];
	txt.push(pageInfo.title, pageInfo.date, pageInfo.qijian);
	txt.push('');
	txt.push('');
	// html.push("<p>" + from + "</p>");
	html.push('<h1>' + pageInfo.title + '</h1>');
	html.push('<h1>' + pageInfo.date + '</h1>');
	html.push('<h1>' + pageInfo.qijian + '</h1>');
	html.push(
		'<div class="left"><table><tr><th>排序</th><th>图片</th><th>标题</th></tr>'
	);
	for (let i = 0; i < list.length; i++) {
		let imgInfo = list[i];
		txt.push(imgInfo.alt);
		html.push(
			'<tr><td>' +
				(i + 1) +
				'</td><td><a href="' +
				imgInfo.href +
				'"><img src="min/' +
				imgInfo.fileNameMin +
				'" alt="' +
				imgInfo.alt +
				'"/></a></td><td>' +
				imgInfo.alt +
				'</td></tr>'
		);
		try {
			await downloadFromCache(
				page,
				imgInfo.src,
				Path.resolve(fileDir, 'min', imgInfo.fileNameMin)
			); //保存小圖
		} catch (e) {
			logger.error(e);
		}
	}
	html.push('</table></div>');
	await wordsCount(page, txt, html, fileDir);
}

let wordCountPage = null;
let filterWords = null;

async function doWordsCount(page, txt, html, fileDir, wordCountPage) {
	let fileNameHtml = Path.resolve(fileDir, '說明.html');
	let fileNameTxt = Path.resolve(fileDir, '說明.txt');
	let content = txt.slice(5).join(os.EOL);
	await wordCountPage.evaluate(content => {
		if (!window.App) {
			window.App = {
				login: true
			};
		} else {
			window.App.login = true;
		}
		jQuery('#tool-word-counter textarea')
			.val(content)[0]
			.dispatchEvent(new Event('input'));
		jQuery('#tool-word-counter textarea')
			.val(content)[0]
			.dispatchEvent(new Event('input'));
		jQuery('#tool-word-counter select:last')
			.val(100)[0]
			.dispatchEvent(new Event('change'));
		// jQuery("#tool-word-counter select:last").val(100)[0].dispatchEvent(new Event('change'));
		jQuery('#tool-word-counter .btn-primary')[0].dispatchEvent(
			new Event('click')
		);
	}, content);
	await page.waitFor(3000);
	let countResult = await wordCountPage.evaluate(() => {
		let results = [];
		jQuery('#tool-word-counter table tr').each((idx, tr) => {
			let words = jQuery(tr)
				.find('td:eq(0)')
				.text();
			if (
				/^\d{1,}$/.test(words) ||
				/^\d{5,}$/.test(words.replace(/\D/g, ''))
			) {
				//纯数字的过滤，已经超过5个数字的过滤
				console.log('过滤词：' + words);
			} else if (words.length > 1) {
				results.push({
					words,
					count: jQuery(tr)
						.find('td:eq(1)')
						.text()
				});
			}
		});
		let html = jQuery('#tool-word-counter table').prop('outerHTML');
		let rtn = {
			results,
			html
		};
		console.log(rtn);
		window['RTN'] = rtn;
		return rtn;
	});

	// logger.info("統計結果：", countResult);
	let countList = countResult['results'];
	if (countList && filterWords && filterWords.length > 0) {
		let results = [];
		for (let i = 0; i < countList.length; i++) {
			if (filterWords[countList[i]]) {
				continue;
			}
			results.push(countList[i]);
		}
		countList = results;
	}
	if (countList && countList.length > 0) {
		html.push('<div class="right"><table>');
		txt.push('');
		txt.push('');
		for (let i = 0; i < countList.length; i++) {
			txt.push(countList[i].words + '\t' + countList[i].count);
			html.push(
				'<tr><td>' +
					countList[i].words +
					'</td><td>' +
					countList[i].count +
					'</td></tr>'
			);
		}
		html.push(
			'</table></br><a style="cursor:pointer;color:#ccc;font-size:11px;" onclick="toggle(\'#filterBefore\')">查看未过滤前的词频</a></div>'
		);
	}
	//border="1"
	html.push(
		"<script type=\"text/javascript\">function toggle(id){let el = document.querySelector(id);if(el!=null){if(el.style.display=='none'){el.style.display='block';}else{el.style.display='none';}}}</script>"
	);
	html.push(
		"<div style='display:none' id='filterBefore'><p>过滤前的词频</p>" +
			countResult['html'].replace(
				'class="table table-hover"',
				'border="1"'
			) +
			'</div>'
	);

	html.push('</body></html>');
	await writeToFile(txt.join(os.EOL), fileNameTxt, false);
	await writeToFile(html.join(''), fileNameHtml, false);
	let tempPage = await page.browser().newPage();
	tempPage.goto('file:///' + fileNameHtml);
	// page.bringToFront();
	// await page.bringToFront();
}
async function wordsCount(page, txt, html, fileDir) {
	// var btnTxt = await page.evaluate(() => {
	//     if (typeof btnCollect != "undefined") {
	//         return btnCollect.innerText;
	//     }
	//     return "找不到";
	// });
	// if (btnTxt != "采集完") {
	//     logger.info("没有采集完，当前状态：" + btnTxt);
	//     setTimeout(wordsCount, 1000 * 30, page, txt, html, fileDir);
	//     return;
	// }
	if (wordCountPage == null) {
		let pages = await page.browser().pages();
		for (let i = 0; i < pages.length; i++) {
			if (pages[i].url() == wordCountUrl) {
				wordCountPage = pages[i];
				console.log('找到原来打开的词频网站了');
			}
		}
	}
	if (filterWords == null) {
		filterWordsFile = Path.resolve(process.cwd(), 'filterWords.txt');
		if (fs.existsSync(filterWordsFile)) {
			filterWords = fs.readFileSync(filterWordsFile, 'utf-8');
			if (filterWords && filterWords.length > 0) {
				let arr = filterWords.split(/\s+/g);
				filterWords = {
					length: arr.length
				};
				for (let i = 0; i < arr.length; i++) {
					filterWords[arr[i]] = true;
				}
			}
		}
	}
	if (wordCountPage == null) {
		wordCountPage = await page.browser().newPage();
		await wordCountPage.on('domcontentloaded', async () => {
			await doWordsCount(page, txt, html, fileDir, wordCountPage);
		});
		wordCountPage.goto(
			'https://mjzj.com/mai-jia-gong-ju/dan-ci-ci-shu-tong-ji.html'
		);
		page.bringToFront();
	} else {
		await doWordsCount(page, txt, html, fileDir, wordCountPage);
	}
	// await wordCountPage.bringToFront();
}

async function saleDesc(page, sale_desc_imgs) {
	let title = await page.$eval('title', el => el.innerText);
	title = getFolderName(title);
	let fileDir = Path.resolve('download', '产品详情', title);
	await mkdirSync(fileDir);
	logger.info('创建目录' + fileDir);
	let imgCount = sale_desc_imgs.length;
	for (let i = 0; i < imgCount; i++) {
		let src = sale_desc_imgs[i];
		let fileName = i + 1 + '.' + src.split('.').pop();
		try {
			await downloadFromCache(page, src, Path.resolve(fileDir, fileName)); //保存小圖
		} catch (e) {
			logger.error(e);
			await page.evaluate(
				(src, fileName, fileDir, i, imgCount) => {
					var img = new Image(); //创建一个Image对象，实现图片的预下载
					img.src = src;
					if (img.complete) {
						// 如果图片已经存在于浏览器缓存，直接调用回调函数
						saveImg(src, fileName, fileDir, i, imgCount);
						return; // 直接返回，不用再处理onload事件
					}
					img.onload = function() {
						//图片下载完毕时异步调用callback函数。
						saveImg(src, fileName, fileDir, i, imgCount);
					};
				},
				src,
				fileName,
				fileDir,
				i,
				imgCount
			);
		}
	}
	await disableButton(page, {
		disable: false,
		background: 'red',
		color: 'white',
		text: '采集完'
	});
}

async function searchPage(page, title) {
	title = getFolderName(title);
	let fileDir = Path.resolve('download', '搜索列表', title);
	await mkdirSync(fileDir);
	logger.info('创建目录' + fileDir);
	await page.evaluate(fileDir => {
		let imgs = jQuery('.searchresults .image img');
		if (imgs && imgs.length > 0) {
			let imgCount = imgs.length;
			imgs.each((idx, img) => {
				let src = jQuery(img).attr('src');
				src = src.split('?')[0];
				let fileName = idx + 1 + '.' + src.split('.').pop();
				var imgNew = new Image(); //创建一个Image对象，实现图片的预下载
				imgNew.src = src;
				if (imgNew.complete) {
					// 如果图片已经存在于浏览器缓存，直接调用回调函数
					saveImg(src, fileName, fileDir, idx, imgCount);
					return; // 直接返回，不用再处理onload事件
				}
				imgNew.onload = function() {
					//图片下载完毕时异步调用callback函数。
					saveImg(src, fileName, fileDir, idx, imgCount);
				};
			});
		}
	}, fileDir);
	// if(imgs && imgs.length > 0 ){
	//     let imgCount = imgs.length;
	//     for (let i = 0; i < imgCount; i++) {
	//         let src = imgs[i];
	//         let fileName = (i + 1) + "." + src.split(".").pop();
	//         try {
	//             await downloadFromCache(page, src, Path.resolve(fileDir, fileName)); //保存小圖
	//         } catch (e) {
	//             logger.error(e);
	//             await page.evaluate((src,fileName,fileDir,i,imgCount)=>{
	//                 var img = new Image(); //创建一个Image对象，实现图片的预下载
	//                 img.src = src;
	//                 if (img.complete) { // 如果图片已经存在于浏览器缓存，直接调用回调函数
	//                     saveImg(src, fileName, fileDir, i, imgCount);
	//                     return; // 直接返回，不用再处理onload事件
	//                 }
	//                 img.onload = function () { //图片下载完毕时异步调用callback函数。
	//                     saveImg(src, fileName, fileDir, i, imgCount);
	//                 };
	//             },src,fileName,fileDir,i,imgCount);
	//         }
	//     }
	// }
}

async function allImgs(page) {
	let title = await page.$eval('title', el => el.innerText);
	title = getFolderName(title);
	let fileDir = Path.resolve('download', '页面图片', title);
	await mkdirSync(fileDir);
	logger.info('创建目录' + fileDir);
	await page.evaluate(fileDir => {
		let imgs = jQuery('img');
		if (imgs && imgs.length > 0) {
			let imgCount = imgs.length;
			imgs.each((idx, img) => {
				let width = jQuery(img).width();
				let height = jQuery(img).height();
				if (width < 120 && height > 120) {
					return;
				}
				let src = jQuery(img).attr('src');
				src = src.split('?')[0];
				let fileName = idx + 1 + '.' + src.split('.').pop();
				var imgNew = new Image(); //创建一个Image对象，实现图片的预下载
				imgNew.src = src;
				if (imgNew.complete) {
					// 如果图片已经存在于浏览器缓存，直接调用回调函数
					saveImg(src, fileName, fileDir, idx, imgCount);
					return; // 直接返回，不用再处理onload事件
				}
				imgNew.onload = function() {
					//图片下载完毕时异步调用callback函数。
					saveImg(src, fileName, fileDir, idx, imgCount);
				};
			});
		}
	}, fileDir);
}

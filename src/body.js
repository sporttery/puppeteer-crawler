let str = `<p>
<img align="absmiddle" src="https://img.alicdn.com/imgextra/i3/20836614/TB2xorTnlTH8KJjy0FiXXcRsXXa_!!20836614.jpg" style="max-width: 750.0px;">
<img align="absmiddle" src="https://img.alicdn.com/imgextra/i2/20836614/TB2DmINXU6FK1Jjy0FlXXXntVXa_!!20836614.jpg" style="max-width: 750.0px;">
<img align="absmiddle" src="https://img.alicdn.com/imgextra/i3/20836614/TB2HxOvXoEIL1JjSZFFXXc5kVXa_!!20836614.jpg" style="max-width: 750.0px;">
<img align="absmiddle" src="https://img.alicdn.com/imgextra/i4/20836614/TB2FR7LXTzGK1JjSspmXXaq7pXa_!!20836614.jpg" style="max-width:750.0px;">
<img align="absmiddle" src="https://img.alicdn.com/imgextra/i3/20836614/TB2ONMKXMvGK1Jjy0FbXXb4vVXa_!!20836614.jpg" class="" style="max-width: 750.0px;" width="790" height="714">
<img align="absmiddle" src="//img.alicdn.com/tps/i4/T10B2IXb4cXXcHmcPq-85-85.gif" class="" data-ks-lazyload="https://img.alicdn.com/imgextra/i1/20836614/TB2xWcQXU6FK1Jjy0FoXXXHqVXa_!!20836614.jpg" style="max-width: 750.0px;" width="790" height="843">
<img align="absmiddle" src="//img.alicdn.com/tps/i4/T10B2IXb4cXXcHmcPq-85-85.gif" class="" data-ks-lazyload="https://img.alicdn.com/imgextra/i4/20836614/TB2pCSvXo3IL1JjSZFMXXajrFXa_!!20836614.jpg" style="max-width: 750.0px;" width="790" height="824">
<img align="absmiddle" src="//img.alicdn.com/tps/i4/T10B2IXb4cXXcHmcPq-85-85.gif" class="" data-ks-lazyload="https://img.alicdn.com/imgextra/i2/20836614/TB2UzRHdeuSBuNjSsplXXbe8pXa_!!20836614.jpg" style="max-width: 750.0px;" width="790" height="1094">
<img align="absmiddle" src="//img.alicdn.com/tps/i4/T10B2IXb4cXXcHmcPq-85-85.gif" class="" data-ks-lazyload="https://img.alicdn.com/imgextra/i3/20836614/TB2XNh9dbSYBuNjSspfXXcZCpXa_!!20836614.jpg" style="max-width: 750.0px;" width="790" height="1200">
<img align="absmiddle" src="//img.alicdn.com/tps/i4/T10B2IXb4cXXcHmcPq-85-85.gif" class="" data-ks-lazyload="https://img.alicdn.com/imgextra/i3/20836614/TB2ScGjXm3PL1JjSZPcXXcQgpXa_!!20836614.jpg" style="max-width: 750.0px;" width="790" height="992">
<img align="absmiddle" src="//img.alicdn.com/tps/i4/T10B2IXb4cXXcHmcPq-85-85.gif" class="" data-ks-lazyload="https://img.alicdn.com/imgextra/i2/20836614/TB2hVl7dkSWBuNjSszdXXbeSpXa_!!20836614.jpg" style="max-width: 750.0px;" width="790" height="519">
</p>`;

let imgReg = /<img.*?(?:>|\/>)/gi;
let srcReg = /src=[\'\"]?([^\'\"]*)[\'\"]?/i;
let arr = str.match(imgReg);
let images = [];
for (let i = 0; i < arr.length; i++) {
    let src = arr[i].match(srcReg);
    //获取图片地址
    if(src[1]){
        images.push(src[1])
    }
}
console.info(images);
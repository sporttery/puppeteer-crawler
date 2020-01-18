require('@babel/polyfill');
const Config = require('./Config');
let args = process.argv.splice(2);
if (args.length === 2) {
    console.log('设置的账户和密码为：%s,%s', args[0], args[1]);
    Config.phone = args[0];
    Config.password = args[1];
}
if (Config.phone === '' || Config.password === '') {
    args = process.argv;
    console.log('请参照使用说明先设置账户密码');
    console.log('或者执行：\n\n%s %s 您的手机号 您的密码\n\n', args[0], args[1]);
    console.log('退出退出');
    return;
}
module.exports = require('./main');

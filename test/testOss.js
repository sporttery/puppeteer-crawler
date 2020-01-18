const axios = require('axios/index');
const fs = require('fs');
const path = require('path');

let url = 'https://img.alicdn.com/imgextra/i4/20836614/TB2nEGKsZuYBuNkSmRyXXcA3pXa_!!20836614.jpg';


(async () => {
      await downloadFile(url, './images', '123456789.png');
      console.info('su');
})();

async function downloadFile(url, filepath, name) {
   if (!fs.existsSync(filepath)) {
      fs.mkdirSync(filepath);
   }
   const filePath = path.resolve(filepath, name);
   const writer = fs.createWriteStream(filePath);
   const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
   });
   await response.data.pipe(writer);
   return new Promise((resolve, reject) => {
      writer.on("finish", async () => {
         console.info('download success');
         return  await resolve()
      });
      writer.on("error", async () => {
         console.info('download error');
         return await reject();
      });
   });
}
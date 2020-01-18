const axios = require('axios/index');
const Config = require('./Config');

let token = undefined;

let instance = axios.create({
    baseURL: Config.apiUrl + '/api',
    timeout: 5000
});

function getToken() {
    return new Promise((resolve, reject) => {
        if (token !== undefined) {
            resolve(token);
        } else {
            instance.post(`/manager/m/manager/login?mobile=${Config.phone}&password=${Config.password}&useSession=true`).then((res) => {
                if (res.data.code === 200) {
                    token = res.data.data.managerToken;
                    return resolve(token);
                } else {
                    reject(res);
                }
            }).catch((e) => {
                reject(e);
            });
        }
    });
}

module.exports = {
    getToken
};
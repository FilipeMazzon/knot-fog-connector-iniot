export const execute = (client) => (event) => (method) => (...args) => {
    return new Promise(async (resolve, reject) => {
        try {
            method(...args);
            client.once(event, ret => resolve(ret));
            client.once('error', (err) => {
                reject(new Error(err));
            });
        } catch (e) {
            reject(e);
        }
    })
};

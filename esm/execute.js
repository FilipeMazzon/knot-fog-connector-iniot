export const execute = (client) => (event) => (method) => (...args) => {
    return new Promise(async (resolve, reject) => {
        try {
            method(...args);
            client.on(event, (response) => resolve(response))
        } catch (e) {
            reject(e);
        }
    })
};

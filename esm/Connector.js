import {parseDeviceToCloud} from './util/parseDeviceToCloud';
import {execute} from './execute';

class Connector {
    constructor(settings) {
        this.settings = settings;
        this.client = null;
        this.clientThings = {};// eslint-disable-line no-useless-constructor, no-unused-vars
    }

    async connectGateway() {
        const {uuid, token} = this.settings;
        this.client = await this.createConnection(uuid, token);
        this.listenToConnectionStatus();
    }

    async start() { // eslint-disable-line no-empty-function
    };

    async addDevice(device) { // eslint-disable-line no-empty-function, no-unused-vars
    };

    removeDevice(id) { // eslint-disable-line no-empty-function, no-unused-vars
    };

    async createConnection(id, token) {
        const client = new Client({
            hostname: this.settings.hostname,
            port: this.settings.port,
            id,
            token,
        });
        await execute(client)('ready')(client.connect.bind(client));
        return client;
    }

    async listDevices() { // eslint-disable-line no-empty-function
        const devices = await execute(this.client)('devices')(this.client.getDevices.bind(this.client))({type: 'knot:thing'});
        return devices.map(parseDeviceToCloud);
    };

    // Device (fog) to cloud
    async publishData(id, dataList) { // eslint-disable-line no-empty-function, no-unused-vars
    }

    async updateSchema(id, schemaList) { // eslint-disable-line no-empty-function, no-unused-vars
    }

    async updateProperties(id, properties) { // eslint-disable-line no-empty-function, no-unused-vars
    }

    // Cloud to device (fog)

    // cb(event) where event is { id, config: [{}] }
    async onConfigUpdated(cb) {
        this.onDataRequestedCb = cb;
    }

    // cb(event) where event is { id, properties: {} }
    async onPropertiesUpdated(cb) {
        this.onDataUpdatedCb = cb;
    }

    // cb(event) where event is { id, sensorId }
    async onDataRequested(cb) {
        this.onDisconnectedCb = cb;
    }

    // cb(event) where event is { id, sensorId, data }
    async onDataUpdated(cb) {
        this.onReconnectedCb = cb;
    }
}

export {Connector}; // eslint-disable-line import/prefer-default-export

import {parseDeviceToCloud} from './util/parseDeviceToCloud';
import {execute} from './execute';
import {baseUrl,port} from './config/urls';
import _ from 'lodash';
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

    async start() {
        this.onDataRequestedCb = () => undefined;
        this.onDataUpdatedCb = () => undefined;
        this.onDisconnectedCb = () => undefined; //_.noop()
        this.onReconnectedCb = () => undefined; //_.noop()
        await this.connectGateway();
        await this.connectThings();
    };
    async connectThings() {
        const things = await this.listDevices();
        const connections = await Promise.all(things.map(thing => this.setupThingConnection(thing.id)));
        this.clientThings = _.chain(connections)
            .filter(value => value.client)
            .keyBy('id')
            .mapValues(value => value.client)
            .value();
    }


    async setupThingConnection(id) {
        const gatewayClient = await this.createConnection(this.settings.uuid, this.settings.token);
        try {
            const thingClient = await this.resetTokenAndConnect(gatewayClient, id);
            await this.listenToCommands(id, thingClient);
            return { id, client: thingClient };
        } catch (err) {
            return { id };
        } finally {
            gatewayClient.close();
        }
    }
    async resetTokenAndConnect(client, id) {
        const token = await execute(client, 'created', client.createSessionToken.bind(client), id);
        return this.createConnection(id, token);
    }
    async createConnection(id, token) {
        const client = new Client({
            hostname: baseUrl,
            port,
            id,
            token,
        });
        await execute(client, 'ready', client.connect.bind(client));
        return client;
    }

    listenToConnectionStatus() {
        this.client.on('reconnect', () => this.onDisconnectedCb());
        this.client.on('ready', () => this.onReconnectedCb());
    }

    async listenToCommands(id, client) {
        client.on('command', (cmd) => {
            const { name, args } = cmd.payload;
            switch (name) {
                case 'getData':
                    this.onDataRequestedCb(id, args);
                    break;
                case 'setData':
                    this.onDataUpdatedCb(id, args);
                    break;
                default:
                    throw Error(`Unrecognized command ${name}`);
            }
        });
    }
    async addDevice(device) {
        const properties = device;
        properties.type = 'knot:thing';
        const newDevice = await promisify(this.client, 'registered', this.client.register.bind(this.client), properties);
        const client = await this.createConnection(
            newDevice.knot.id,
            newDevice.token,
        );
        this.clientThings[newDevice.knot.id] = client;
        this.listenToCommands(newDevice.knot.id, client);
        return { id: newDevice.knot.id, token: newDevice.token };
    }

    async removeDevice(id) {
        const thingClient = this.clientThings[id];
        thingClient.close();
        delete this.clientThings[id];
        await execute(this.client, 'unregistered', this.client.unregister.bind(this.client), id);
    }

    async listDevices() { // eslint-disable-line no-empty-function
        const devices = await execute(this.client)('devices')(this.client.getDevices.bind(this.client))({type: 'knot:thing'});
        return devices.map(parseDeviceToCloud);
    };
    // Device (fog) to cloud
    async publishData(id, dataList) {
        const client = this.clientThings[id];
        return Promise.all(dataList.map(data => (
            execute(client, 'published', client.publishData.bind(client), data.sensorId, data.value)
        )));
    }

    async updateSchema(id, schemaList) {
        const thingClient = this.clientThings[id];
        return execute(thingClient, 'updated', thingClient.updateSchema.bind(thingClient), schemaList);
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

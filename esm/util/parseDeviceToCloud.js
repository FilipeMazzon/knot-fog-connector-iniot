export const parseDeviceToCloud = (device) => (
    {
        id: device.knot.id,
        name: device.metadata.name,
        schema: device.schema,
    }
);

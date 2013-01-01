module.exports = {
    port: 8001,
    env: process.env.NODE_ENV || 'development',
    apiKey: 'OPXD3SEEPSTE104',
    apiVersion: '2.0',
    dbUrl: 'mongodb://localhost/keolis',
    apiHost: 'data.keolis-rennes.com',
    apiPath: '/json/',
    refreshPeriod: 180, // 3 minutes
}

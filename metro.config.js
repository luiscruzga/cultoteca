const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// server/ es el backend (repositorio independiente cultoteca-api): nunca debe resolverse ni empaquetarse en la app
const serverDir = path.resolve(__dirname, 'server').replace(/[/\\]/g, '[/\\\\]');
const serverPattern = new RegExp(`^${serverDir}([/\\\\].*)?$`);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  serverPattern,
];

module.exports = config;

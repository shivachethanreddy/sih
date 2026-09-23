const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blacklistRE = /android[\\/]\.gradle[\\/]/;

module.exports = config;
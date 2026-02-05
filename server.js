/**
 * PowerWiki Server - Compatibility Layer
 * 
 * ⚠️ DEPRECATED: This file is deprecated and will be removed in version 2.0
 * Please use 'src/main.js' directly or update your scripts to use the new entry point.
 * 
 * This file exists for backward compatibility only.
 */

// 显示弃用警告
console.warn('\n⚠️  DEPRECATION WARNING:');
console.warn('   The root server.js file is deprecated and will be removed in PowerWiki v2.0');
console.warn('   Please update your scripts to use: src/main.js');
console.warn('   Current usage: node server.js → Future usage: node src/main.js');
console.warn('   This compatibility layer will be removed in the next major version.\n');

// 直接加载并执行新的主文件
try {
  require('./src/main.js');
} catch (error) {
  console.error('❌ Failed to load src/main.js:', error.message);
  console.error('   Please ensure src/main.js exists and is properly configured.');
  process.exit(1);
}

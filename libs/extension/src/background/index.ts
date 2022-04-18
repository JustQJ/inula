import { checkData, packagePayload } from '../utils/transferTool';
import { requestAllVNodeTreeInfos, initDevToolPageConnection } from '../utils/constants';

// 多个页面、tab页共享一个 background，需要建立连接池，给每个tab建立连接
const connections = {};

// panel 代码中调用 let backgroundPageConnection = chrome.runtime.connect({...}) 会触发回调函数
chrome.runtime.onConnect.addListener(function (port) {
  function extensionListener(message) {
    const isHorizonMessage = checkData(message);
    if (isHorizonMessage) {
      console.log('received message', message);
      const { payload } = message;
      const { type, data } = payload;
      let passMessage;
      if (type === initDevToolPageConnection) {
        if (!connections[data]) {
          // 获取 panel 所在 tab 页的tabId
          connections[data] = port;
        }
        passMessage = packagePayload({ type: requestAllVNodeTreeInfos });
      } else {
        passMessage = message;
      }
      console.log('post message:', passMessage);
      // 查询参数有 active 和 currentWindow， 如果开发者工具与页面分离，会导致currentWindow为false才能找到
      // 所以只用 active 参数查找，但不确定这么写是否会引发查询错误的情况
      // 或许需要用不同的查询参数查找两次
      chrome.tabs.query({ active: true }, function (tabs) {
        if (tabs.length) {
          chrome.tabs.sendMessage(tabs[0].id, passMessage);
          console.log('post message end');
        } else {
          console.log('do not find message');
        }
      });
    }
  }
  // Listen to messages sent from the DevTools page
  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function (port) {
    port.onMessage.removeListener(extensionListener);

    const tabs = Object.keys(connections);
    for (let i = 0, len = tabs.length; i < len; i++) {
      if (connections[tabs[i]] == port) {
        delete connections[tabs[i]];
        break;
      }
    }
  });
});

// 监听来自 content script 的消息，并将消息发送给对应的 devTools page，也就是 panel
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Messages from content scripts should have sender.tab set
  if (sender.tab) {
    const tabId = sender.tab.id;
    if (tabId in connections && checkData(request)) {
      connections[tabId].postMessage(request);
    } else {
      console.log('Tab not found in connection list.');
    }
  } else {
    console.log('sender.tab not defined.');
  }
  return true;
});

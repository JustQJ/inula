/**
 * 提供：vNode的“遍历”，“查找”，“判断”的相关工具方法
 */

import type {VNode} from '../Types';

import {DomComponent, DomPortal, DomText, TreeRoot} from './VNodeTags';
import {isComment} from '../../dom/utils/Common';
import {getNearestVNode} from '../../dom/DOMInternalKeys';

export function getSiblingVNode(node) {
  let siblingVNode = null;
  const index = node.cIndex;
  if (node && node.parent && node.parent.children && node.parent.children.length > index + 1) {
    siblingVNode = node.parent.children[index + 1];
  }
  return siblingVNode;
}

export function getFirstChild(vNode: VNode) {
  return (vNode.children && vNode.children.length) ? vNode.children[0] : null;
}

// 从beginVNode开始深度遍历vNode树，对每个vNode调用handleVNode方法
export function travelVNodeTree(
  beginVNode: VNode,
  handleVNode: Function,
  childFilter: Function = () => false, // 返回true不处理child
  finishVNode?: VNode, // 结束遍历节点，有时候和beginVNode不相同
  handleWhenToParent?: Function
): VNode | null {
  const overVNode = finishVNode || beginVNode;
  let node = beginVNode;

  while (true) {
    const ret = handleVNode(node);
    // 如果处理一个vNode时有返回值，则中断遍历
    if (ret) {
      return ret;
    }

    // 找子节点
    const childVNode = getFirstChild(node);
    if (childVNode !== null && !childFilter(node)) {
      childVNode.parent = node;
      node = childVNode;
      continue;
    }

    // 回到开始节点
    if (node === overVNode) {
      return null;
    }

    // 找兄弟，没有就往上再找兄弟
    while (getSiblingVNode(node) === null) {
      if (node.parent === null || node.parent === overVNode) {
        return null;
      }
      node = node.parent;

      if (typeof handleWhenToParent === 'function') {
        handleWhenToParent(node);
      }
    }
    // 找到兄弟
    const siblingVNode = getSiblingVNode(node);
    siblingVNode.parent = node.parent;
    node = siblingVNode;
  }
}

// 置空vNode
export function clearVNode(vNode: VNode) {
  clearOneVNode(vNode);
}

function clearOneVNode(vNode: VNode) {
  vNode.children = [];
  vNode.depContexts = [];
  vNode.dirtyNodes = [];
  vNode.oldProps = null;
  vNode.state = null;
  vNode.hooks = [];
  vNode.suspenseChildStatus = '';
  vNode.props = null;
  vNode.parent = null;
  vNode.suspensePromises = null;
  vNode.changeList = null;
  vNode.effectList = [];
  vNode.updates = null;

  vNode.oldHooks = [];
  vNode.oldState = null;
  vNode.oldRef = null;
  vNode.suspenseChildThrow = false;
  vNode.oldSuspenseChildStatus = '';
  vNode.oldChildren = null;

  vNode.path = [];
  vNode.toUpdateNodes = null;
}

// 是dom类型的vNode
export function isDomVNode(node: VNode) {
  return node.tag === DomComponent || node.tag === DomText;
}

// 是容器类型的vNode
function isDomContainer(vNode: VNode): boolean {
  return (
    vNode.tag === DomComponent ||
    vNode.tag === TreeRoot ||
    vNode.tag === DomPortal
  );
}

// 找到DOM类型的父
export function findDomParent(vNode: VNode) {
  let parent = vNode.parent;

  while (parent !== null) {
    switch (parent.tag) {
      case DomComponent:
        return {parent, parentDom: parent.realNode};
      case TreeRoot:
      case DomPortal:
        return {parent, parentDom: parent.outerDom};
    }
    parent = parent.parent;
  }

  return null;
}

export function findDomVNode(vNode: VNode): VNode | null {
  return travelVNodeTree(vNode, (node) => {
    if (node.tag === DomComponent || node.tag === DomText) {
      return node;
    }
  });
}

export function findDOMByClassInst(inst) {
  const vNode = inst._vNode;
  if (vNode === undefined) {
    throw new Error('Unable to find the vNode by class instance.');
  }

  const domVNode = findDomVNode(vNode);

  return domVNode !== null ? domVNode.realNode : null;
}

// 判断dom树是否已经挂载
export function isMounted(vNode: VNode) {
  const rootNode = getTreeRootVNode(vNode);
  // 如果根节点是 Dom 类型节点，表示已经挂载
  return rootNode.tag === TreeRoot;
}

function getTreeRootVNode(vNode) {
  let node = vNode;
  while (node.parent) {
    node = node.parent;
  }
  return node;
}

// 找到相邻的DOM
export function getSiblingDom(vNode: VNode): Element | null {
  let node: VNode = vNode;

  findSibling: while (true) {
    // 没有兄弟节点，找父节点
    while (getSiblingVNode(node) === null) {
      // 没父节点，或父节点已经是根节点，则返回
      if (node.parent === null || isDomContainer(node.parent)) {
        return null;
      }
      node = node.parent;
    }

    const siblingVNode = getSiblingVNode(node);
    siblingVNode.parent = node.parent;
    node = siblingVNode;

    // 如果不是dom节点，往下找
    while (!isDomVNode(node)) {
      // 如果节点也是Addition
      if (node.flags.Addition) {
        continue findSibling;
      }

      // 没有子节点，或是DomPortal
      if (!node.children || !node.children.length || node.tag === DomPortal) {
        continue findSibling;
      } else {
        const childVNode = getFirstChild(node);
        childVNode.parent = node;
        node = childVNode;
      }
    }

    if (!node.flags.Addition) {
      // 找到
      return node.realNode;
    }
  }
}

function isSameContainer(
  container: Element,
  targetContainer: EventTarget,
): boolean {
  if (container === targetContainer) {
    return true;
  }
  // 注释类型的节点
  if (isComment(container) && container.parentNode === targetContainer) {
    return true
  }
  return false;
}

function isPortalRoot(vNode, targetContainer) {
  if (vNode.tag === DomPortal) {
    let topVNode = vNode.parent;
    while (topVNode !== null) {
      const grandTag = topVNode.tag;
      if (grandTag === TreeRoot || grandTag === DomPortal) {
        const topContainer = topVNode.outerDom;
        // 如果topContainer是targetContainer，不需要在这里处理
        if (isSameContainer(topContainer, targetContainer)) {
          return true;
        }
      }
      topVNode = topVNode.parent;
    }
    return false;
  }
  return false;
}

// 获取根vNode节点
export function getExactNode(targetVNode, targetContainer) {
  // 确认vNode节点是否准确，portal场景下可能祖先节点不准确
  let vNode = targetVNode;
  while (vNode !== null) {
    if (vNode.tag === TreeRoot || vNode.tag === DomPortal) {
      let container = vNode.outerDom;
      if (isSameContainer(container, targetContainer)) {
        break;
      }
      if (isPortalRoot(vNode, targetContainer)) {
        return null;
      }
      while (container !== null) {
        const parentNode = getNearestVNode(container);
        if (parentNode === null) {
          return null;
        }
        if (parentNode.tag === DomComponent || parentNode.tag === DomText) {
          vNode = parentNode;
          return getExactNode(vNode, targetContainer);
        }
        container = container.parentNode;
      }
    }
    vNode = vNode.parent;
  }
  if (vNode === null) {
    return null;
  }
  return targetVNode;
}


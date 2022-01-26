import type {VNode} from '../Types';
import {createVNodeChildren} from './BaseComponent';

export function bubbleRender() {}

function captureFragment(processing: VNode) {
  const newElement = processing.props;
  processing.child = createVNodeChildren(processing, newElement);
  return processing.child;
}

export function captureRender(processing: VNode): VNode | null {
  return captureFragment(processing);
}

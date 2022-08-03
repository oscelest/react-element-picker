import React from "react";
import {Point, Rect, SimpleRect, SimplePoint} from "@noxy/geometry";

module Utility {

  export function setState<T>(fn: (value: T) => void, value: T | undefined) {
    if (value !== undefined) fn(value);
  }

  export function getPointFromEvent(event: React.MouseEvent | MouseEvent) {
    return new Point(event.pageX, event.pageY);
  }

  export function getRelativePoint<T extends HTMLElement>(container: T, point: SimplePoint) {
    const {scrollLeft, scrollTop, clientLeft, clientTop, scrollWidth, scrollHeight} = container;
    const {top, left} = container.getBoundingClientRect();
    return Point.translateByCoords(point, -left - clientLeft + scrollLeft, -top - clientTop + scrollTop)
      .clampX(0, scrollWidth)
      .clampY(0, scrollHeight);
  }

  export function getScrollPoint<T extends HTMLElement>(container: T, point: SimplePoint, speed: number = 20) {
    const {clientLeft, clientWidth, clientTop, clientHeight} = container;
    const {top, left} = container.getBoundingClientRect();
    const dx = point.x - left - clientLeft;
    const dy = point.y - top - clientTop;
    return new Point(getSpeed(dx, dx - clientWidth, speed), getSpeed(dy, dy - clientHeight, speed));
  }

  function getSpeed(min: number, max: number, speed: number) {
    return Math.ceil(Math.tanh(Math.max(Math.min(0, min), max) / 100) * speed);
  }

  export function getRelativeRect<T extends HTMLElement>(container: T, rect: SimpleRect) {
    const {scrollLeft, scrollTop, clientLeft, clientTop} = container;
    const {left, top} = container.getBoundingClientRect();
    return Rect.translateByCoords(rect, left + clientLeft - scrollLeft, top + clientTop - scrollTop);
  }

  export function getEmptySelection<T extends HTMLElement>(container: T): boolean[] {
    return Array(container.children.length).fill(false);
  }

  export function getRectSelection<T extends HTMLElement>(container: T, rect: Rect, selection: boolean[], ctrl: boolean = false): boolean[] {
    selection = selection.slice(0, container.children.length);
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children.item(i);
      const intersection = !!(child && rect.intersectsRect(child.getBoundingClientRect()));
      selection[i] = !ctrl !== !intersection;
    }
    return selection;
  }

  export function getClickSelection(children: HTMLCollection, rect: Rect, selection: boolean[], ctrl: boolean, shift: boolean) {
    selection = selection.slice(0, children.length);
    if (shift) {
      const rect_list = [] as SimpleRect[];
      for (let i = 0; i < children.length; i++) {
        if (!selection[i]) continue;

        const child = children.item(i);
        if (!child) continue;

        rect_list.push(child.getBoundingClientRect());
      }
      rect = Rect.union(rect, ...rect_list);
    }

    return getSelection(children, rect, selection, ctrl, shift);
  }

  export function getSelection(children: HTMLCollection, rect: Rect, selection: boolean[], ctrl: boolean, shift: boolean) {
    selection = selection.slice(0, children.length);
    for (let i = 0; i < children.length; i++) {
      const child = children.item(i);
      const select = selection[i];
      const hover = !!child && rect.intersectsRect(child.getBoundingClientRect());

      // |---------------------------------------|
      // | Select  | Hover | Ctrl  | Shift | Res | (select && !hover && ctrl) ||
      // |---------------------------------|-----| (select && !hover && shift) ||
      // |    F    |   F   |   F   |   F   |  F  | (!select && hover && !shift) ||
      // |    F    |   F   |   F   |   T   |  F  | (hover && !ctrl)
      // |    F    |   F   |   T   |   F   |  F  |
      // |    F    |   F   |   T   |   T   |  F  |
      // |    F    |   T   |   F   |   F   |  T  |
      // |    F    |   T   |   F   |   T   |  T  |
      // |    F    |   T   |   T   |   F   |  T  |
      // |    F    |   T   |   T   |   T   |  F  |
      // |    T    |   F   |   F   |   F   |  F  |
      // |    T    |   F   |   F   |   T   |  T  |
      // |    T    |   F   |   T   |   F   |  T  |
      // |    T    |   F   |   T   |   T   |  T  |
      // |    T    |   T   |   F   |   F   |  T  |
      // |    T    |   T   |   F   |   T   |  T  |
      // |    T    |   T   |   T   |   F   |  F  |
      // |    T    |   T   |   T   |   T   |  F  |
      // |---------------------------------------|
      selection[i] = (select && !hover && ctrl && !shift) || (select && !ctrl && shift) || (!select && hover && !shift) || (hover && !ctrl);
    }
    return selection;
  }

}

export default Utility;

import React from "react";
import {Point, Rect, SimpleRect, SimplePoint} from "@noxy/geometry";

module Utility {

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

  export function getRelativeRect<T extends HTMLElement>(container: T, rect: SimpleRect) {
    const {scrollLeft, scrollTop, clientLeft, clientTop} = container;
    const {left, top} = container.getBoundingClientRect();
    return Rect.translateByCoords(rect, left + clientLeft - scrollLeft, top + clientTop - scrollTop);
  }

  export function getFocusSelectionRect<T extends HTMLElement>(container: T, rect: SimpleRect, code: string) {
    switch (code) {
      case "ArrowUp":
        return new Rect(rect.x, -container.scrollTop, rect.width, rect.y + rect.height);
      case "ArrowDown":
        return new Rect(rect.x, rect.y, rect.width, Infinity);
      case "ArrowLeft":
        return new Rect(-container.scrollLeft, rect.y, rect.x + rect.width, rect.height);
      case "ArrowRight":
        return new Rect(rect.x, rect.y, Infinity, rect.height);
    }
  }

  export function getFocus<T extends HTMLElement>(container: T, point: Point) {
    const focus = {distance: Infinity, index: undefined as number | undefined};
    const {scrollLeft, scrollTop, clientLeft, clientTop} = container;
    const {left, top} = container.getBoundingClientRect();
    point.translateByCoords(left + clientLeft - scrollLeft, top + clientTop - scrollTop)

    for (let i = 0; i < container.children.length; i++) {
      const child = container.children.item(i);
      if (!child) continue;
      const rect = Rect.fromSimpleRect(child.getBoundingClientRect());
      if (rect.containsPoint(point)) {
        const distance = point.getDistanceToPoint(rect.getCenterPoint());
        if (distance < focus.distance) {
          focus.distance = distance;
          focus.index = i;
        }
      }
    }

    return focus.index;
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

    return getDragSelection(children, rect, selection, ctrl, shift);
  }

  export function getDragSelection(children: HTMLCollection, rect: Rect, selection: boolean[], ctrl: boolean, shift: boolean) {
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

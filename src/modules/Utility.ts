import React from "react";
import {Point, Rect, SimpleRect, SimplePoint} from "@noxy/geometry";

module Utility {

  export function resolveEvent<E extends React.SyntheticEvent>(event: E, handler?: React.EventHandler<E>, condition?: boolean): boolean {
    handler?.(event);
    return !event.defaultPrevented && condition;
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
      default:
        return undefined;
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

  export function getClickSelection(children: Element[], rect: Rect, selection: boolean[], ctrl: boolean, shift: boolean) {
    selection = selection.slice(0, children.length);
    
    if (shift) {
      rect = Rect.union(rect, ...children.reduce((result, child, index) => selection[index] ? [...result, child.getBoundingClientRect()] : result, [] as SimpleRect[]));
    }

    return getDragSelection(children, rect, selection, ctrl, shift);
  }

  export function getDragSelection(children: Element[], rect: Rect, selection: boolean[], ctrl: boolean, shift: boolean) {
    selection = selection.slice(0, children.length);

    return children.map((child, index) => {
      const select = selection[index];
      const hover = !!child && rect.intersectsRect(child.getBoundingClientRect());
      
      // |-------------------------------------------|
      // | Select  | Hover | Ctrl  | Shift | Result  | (select && !hover && ctrl) ||
      // |---------------------------------|---------| (select && !hover && shift) ||
      // |    F    |   F   |   F   |   F   |    F    | (!select && hover && !shift) ||
      // |    F    |   F   |   F   |   T   |    F    | (hover && !ctrl)
      // |    F    |   F   |   T   |   F   |    F    |
      // |    F    |   F   |   T   |   T   |    F    |
      // |    F    |   T   |   F   |   F   |    T    |
      // |    F    |   T   |   F   |   T   |    T    |
      // |    F    |   T   |   T   |   F   |    T    |
      // |    F    |   T   |   T   |   T   |    F    |
      // |    T    |   F   |   F   |   F   |    F    |
      // |    T    |   F   |   F   |   T   |    T    |
      // |    T    |   F   |   T   |   F   |    T    |
      // |    T    |   F   |   T   |   T   |    T    |
      // |    T    |   T   |   F   |   F   |    T    |
      // |    T    |   T   |   F   |   T   |    T    |
      // |    T    |   T   |   T   |   F   |    F    |
      // |    T    |   T   |   T   |   T   |    F    |
      // |-------------------------------------------|
      return (select && !hover && ctrl && !shift) || (select && !ctrl && shift) || (!select && hover && !shift) || (hover && !ctrl);
    })
  }

}

export default Utility;

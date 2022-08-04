import React from "react";
import {Point, Rect, SimpleRect, SimplePoint, TransformationOrigin} from "@noxy/geometry";

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

  export function getFocusSelectionRect(rect: SimpleRect, code: string) {
    switch (code) {
      case "ArrowUp":
        return new Rect(rect.x, 0, rect.width, rect.y + rect.height);
      case "ArrowDown":
        return new Rect(rect.x, rect.y, rect.width, Infinity);
      case "ArrowLeft":
        return new Rect(0, rect.y, rect.x + rect.width, rect.height);
      case "ArrowRight":
        return new Rect(rect.x, rect.y, Infinity, rect.height);
    }
  }

  // export function getCursorSelectionAndFocus<T extends HTMLElement>(container: T, focus_element: Element, rect: SimpleRect, selection: boolean[], ctrl: boolean, shift: boolean) {
  //
  //
  //   selection = selection.slice(0, children.length);
  //
  //   const focus = {element: focus_element, distance: shift ? -Infinity : Infinity};
  //   const center = Rect.getCenterPoint(focus_element.getBoundingClientRect());
  //
  //   const focus_rect = rect;
  //   const selection_rect = rect.clone();
  //
  //   // if (ctrl && shift) {
  //   //   selection_rect.union(...Array.from(children).reduce(
  //   //     (result, child, index) => selection[index] ? [...result, child.getBoundingClientRect()] : result,
  //   //     [] as SimpleRect[]
  //   //   ));
  //   // }
  //
  //   for (let i = 0; i < children.length; i++) {
  //     const child = children.item(i);
  //     if (!child) {
  //       selection[i] = false;
  //       continue;
  //     }
  //
  //     const child_rect = child.getBoundingClientRect();
  //     selection[i] = (ctrl && selection[i]) || selection_rect.intersectsRect(child_rect);
  //
  //     if (child !== focus_element && focus_rect.intersectsRect(child_rect)) {
  //       const distance = center.getDistanceToPoint(Rect.getCenterPoint(child.getBoundingClientRect()));
  //
  //       if (!shift && distance < focus.distance) {
  //         focus.element = child;
  //         focus.distance = distance;
  //       }
  //
  //       if (shift && distance > focus.distance) {
  //         focus.element = child;
  //         focus.distance = distance;
  //       }
  //     }
  //   }
  //
  //   return {focus: focus.element, selection};
  // }

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

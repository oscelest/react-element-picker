import React from "react";
import {Point, Rect, SimpleRect} from "@noxy/geometry";

module Utility {


  export function getPointInRect<T extends HTMLElement>({pageX, pageY}: React.MouseEvent<T> | MouseEvent, element: T) {
    const {scrollLeft, scrollTop, clientLeft, clientTop, scrollWidth, scrollHeight} = element;
    const {top, left} = element.getBoundingClientRect();
    const x = Math.min(Math.max(pageX - left - clientLeft + scrollLeft, 0), scrollWidth);
    const y = Math.min(Math.max(pageY - top - clientTop + scrollTop, 0), scrollHeight);
    return new Point(x, y);
  }

  export function getRelativeSelectionRect<T extends HTMLElement>(rect: SimpleRect, element: T) {
    const {scrollLeft, scrollTop, clientLeft, clientTop} = element;
    const {left,top} = element.getBoundingClientRect();
    return Rect.translateByCoords(rect, left + clientLeft - scrollLeft, top + clientTop - scrollTop);
  }

}

export default Utility;

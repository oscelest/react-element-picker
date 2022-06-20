import Style from "./ElementPicker.module.scss";
import React, {useRef, useState, useCallback, CSSProperties} from "react";
import Point from "./Point";
import Rect from "./Rect";
import {Property} from "csstype";

function ElementPicker(props: ElementPickerProps) {
  const ref_container = useRef<HTMLDivElement>(null);
  const [selection_point, setSelectionPoint] = useState<Point>();
  const [selection_rect, setSelectionRect] = useState<Rect>();

  const [scroll_timer, setScrollTimer] = useState<number>();
  const [scroll_speed_x, setScrollSpeedX] = useState<number>(0);
  const [scroll_speed_y, setScrollSpeedY] = useState<number>(0);

  const ref_variables = useRef<Reference>();
  ref_variables.current = {selection_rect, selection_point, scroll_timer, scroll_speed_x, scroll_speed_y};

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if (!ref_container.current) throw new Error("Reference element does not exist. No element to select inside.");
    setSelectionPoint(new Point(event.pageX, event.pageY).confineToElement(ref_container.current));
    setScrollTimer(window.setInterval(() => {
      if (!ref_container.current || !ref_variables.current) return;

      const {selection_rect, scroll_speed_x, scroll_speed_y} = ref_variables.current;
      if (!selection_rect || scroll_speed_x === 0 && scroll_speed_y === 0) return;

      const scroll = scrollElementBy(ref_container.current, scroll_speed_x, scroll_speed_y);
      if (!scroll.y) setScrollSpeedY(0);
      if (!scroll.x) setScrollSpeedX(0);

      const rect = extendRectWithin(selection_rect, ref_container.current, scroll_speed_x, scroll_speed_y);
      setSelectionRect(rect);
      props.onHover?.(getElementListInRect(ref_container.current, rect, props.threshold), rect);
    }, 20));
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!ref_variables.current?.selection_point) throw new Error("Selection point has not been created before window.onMouseMove event was triggered.");
    if (!ref_container.current) throw new Error("Reference element does not exist. No element to select inside.");

    const cursor = new Point(event.pageX, event.pageY);
    const point = new Point(event.pageX, event.pageY).confineToElement(ref_container.current);
    if (!ref_variables.current.selection_rect && point.distanceToPoint(ref_variables.current.selection_point) < 8) return;

    const rect = Rect.fromPoints(point, ref_variables.current.selection_point);
    props.onHover?.(getElementListInRect(ref_container.current, rect, props.threshold), rect);
    setSelectionRect(rect);

    const {x, y} = getScrollSpeed(ref_container.current.getBoundingClientRect(), cursor, props.scroll_coefficient);
    console.log(x, y);
    setScrollSpeedX(x);
    setScrollSpeedY(y);
  }, []);

  const onMouseUp = useCallback((event: MouseEvent) => {
    window.clearInterval(ref_variables.current?.scroll_timer);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
    if (!ref_container.current) throw new Error("Reference element does not exist. No element to select inside.");
    if (!ref_variables.current?.selection_point) throw new Error("Selection point has not been created before window.onMouseUp event was triggered.");

    const rect = ref_variables.current?.selection_rect ?? Rect.fromPoints(Point.fromEventPage(event).confineToElement(ref_container.current), ref_variables.current.selection_point);
    const element_list = getElementListInRect(ref_container.current, rect, props.threshold);

    if (!ref_variables.current?.selection_rect) props.onClick?.(element_list.findIndex(value => value), rect, event);
    props.onHover?.(getEmptyList(ref_container.current), rect);
    props.onSelect?.(element_list, rect, event);
    setSelectionRect(undefined);
    setSelectionPoint(undefined);
    setScrollTimer(undefined);
    setScrollSpeedX(0);
    setScrollSpeedY(0);
  }, []);

  const position_rect = {"--display": "none"} as ElementPickerRectCSSProperties & CSSProperties;
  if (selection_rect) {
    delete position_rect["--display"];
    position_rect["--top"] = `${selection_rect.y}px`;
    position_rect["--left"] = `${selection_rect.x}px`;
    position_rect["--width"] = `${selection_rect.width}px`;
    position_rect["--height"] = `${selection_rect.height}px`;
    position_rect["--border"] = props.style?.border;
    position_rect["--background"] = props.style?.background;
  }

  return (
    <div ref={ref_container} className={Style.Component} style={position_rect} onMouseDown={onMouseDown}>
      {props.children}
    </div>
  );
}

function getScrollSpeed(rect: DOMRect, cursor: Point, coefficient: number = 15) {
  const speed = {x: 0, y: 0};
  const scroll_coefficient = 1 / coefficient * 100;

  if (rect.y > cursor.y) {
    speed.y = (cursor.y - rect.y) / scroll_coefficient;
  }
  else if (rect.y + rect.height < cursor.y) {
    speed.y = (cursor.y - rect.y - rect.height) / scroll_coefficient;
  }
  else {
    speed.y = 0;
  }

  if (rect.x > cursor.x) {
    speed.x = (cursor.x - rect.x - rect.width) / scroll_coefficient;
  }
  else if (rect.x + rect.width < cursor.x) {
    speed.x = (cursor.x - rect.x) / scroll_coefficient;
  }
  else {
    speed.x = 0;
  }

  return speed;
}

function extendRectWithin(rect: Rect, element: HTMLElement, x: number, y: number) {
  if (x < 0) {
    const delta = rect.x - Math.max(0, rect.x + x);
    rect.x -= delta;
    rect.width += delta;
  }
  else if (x > 0) {
    rect.width -= rect.x + rect.width - Math.min(element.scrollWidth, rect.x + rect.width + x);
  }

  if (y < 0) {
    const delta = rect.y - Math.max(0, rect.y + y);
    rect.y -= delta;
    rect.height += delta;
  }
  else if (y > 0) {
    rect.height -= rect.y + rect.height - Math.min(element.scrollHeight, rect.y + rect.height + y);
  }

  return rect;
}

function scrollElementBy(element: HTMLElement, left: number, top: number) {
  let {scrollTop: x, scrollLeft: y} = element;
  element.scrollBy({behavior: "auto", left, top});
  x = element.scrollLeft - x;
  y = element.scrollTop - y;
  return {x, y};
}

function getElementListInRect(element: HTMLElement, rect: Rect, threshold: number = 0.2) {
  threshold = Math.min(1, Math.max(0, threshold)) / 2;
  const element_list = [] as boolean [];
  const element_bounds = element.getBoundingClientRect();
  const {children, clientLeft, clientTop, scrollLeft, scrollTop} = element;
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i);
    if (!child) continue;

    const {left, top, width, height} = child.getBoundingClientRect();
    const x = (left - element_bounds.left - clientLeft + scrollLeft) + threshold * width;
    const y = top - element_bounds.top - clientTop + scrollTop + threshold * height;
    const child_rect = new Rect(x, y, width - threshold * width * 2, height - threshold * height * 2);
    element_list.push(rect.intersectsRect(child_rect));
  }

  return element_list;
}

function getEmptyList(element: HTMLElement) {
  const element_list = [] as boolean [];
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children.item(i);
    if (child) element_list.push(false);
  }
  return element_list;
}

interface Reference {
  selection_point?: Point;
  selection_rect?: Rect;
  scroll_timer?: number;
  scroll_speed_x: number;
  scroll_speed_y: number;
}

export interface ElementPickerRectCSSProperties {
  "--display"?: Property.Display;
  "--top"?: Property.Top;
  "--left"?: Property.Left;
  "--width"?: Property.Height;
  "--height"?: Property.Width;
  "--border"?: Property.Border;
  "--background"?: Property.Background;
}

export interface ElementPickerProps extends React.PropsWithChildren {
  threshold?: number;
  scroll_coefficient?: number;

  style?: {
    border?: Property.Border
    background?: Property.Background
  };

  onClick?(values: number | undefined, rect: Rect, event: MouseEvent): void;
  onHover?(values: boolean[], rect: Rect): void;
  onSelect?(values: boolean[], rect: Rect, event: MouseEvent): void;
}

export default ElementPicker;

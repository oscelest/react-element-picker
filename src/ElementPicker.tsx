import Style from "./ElementPicker.module.scss";
import React, {useRef, useState, useCallback, CSSProperties} from "react";
import Point from "./Point";
import Rect from "./Rect";
import {Property} from "csstype";

function ElementPicker(props: ElementPickerProps) {
  const ref_container = useRef<HTMLDivElement>(null);

  const [flag_ctrl, setFlagCtrl] = useState(false);
  const [flag_shift, setFlagShift] = useState(false);
  const [selection_point, setSelectionPoint] = useState<Point>();
  const [selection_rect, setSelectionRect] = useState<Rect>();

  const [scroll_timer, setScrollTimer] = useState<number>();
  const [scroll_speed_x, setScrollSpeedX] = useState<number>(0);
  const [scroll_speed_y, setScrollSpeedY] = useState<number>(0);

  const ref_variables = useRef<Reference>();
  ref_variables.current = {selection_rect, selection_point, scroll_timer, scroll_speed_x, scroll_speed_y, flag_ctrl, flag_shift};

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if (!ref_container.current) throw new Error("Reference element does not exist. No element to select inside.");

    // Shift and ctrl keys are locked on mouse down for the rest of the operation.
    if (event.shiftKey) setFlagShift(true);
    if (event.ctrlKey) setFlagCtrl(true);

    setSelectionPoint(new Point(event.pageX, event.pageY).confineToElement(ref_container.current));
    setScrollTimer(window.setInterval(() => {
      const {current: container} = ref_container;
      if (!container || !ref_variables.current) return;

      const {selection_rect, scroll_speed_x, scroll_speed_y} = ref_variables.current;
      if (scroll_speed_x === 0 && scroll_speed_y === 0) return;

      const scroll = scrollElementBy(container, scroll_speed_x, scroll_speed_y);
      if (!scroll.y) setScrollSpeedY(0);
      if (!scroll.x) setScrollSpeedX(0);

      if (selection_rect) {
        const rect = extendRectWithin(selection_rect, container, scroll.x, scroll.y);
        setSelectionRect(rect);
        props.onHover?.(getElementListInRect(container, rect, props.select_threshold), rect);
      }
    }, 20));

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    // Initialization to ensure variables exist in current context
    const {current: container} = ref_container;
    if (!container) throw new Error("Reference element does not exist. No element to select inside.");

    const selection_point = ref_variables.current?.selection_point;
    if (!selection_point) throw new Error("Selection point has not been created before window.onMouseMove event was triggered.");

    // Get scroll speed and update variables. Selection rect does not need to exist to start scrolling.
    const {x, y} = getScrollSpeed(container.getBoundingClientRect(), new Point(event.pageX, event.pageY), props.scroll_coefficient);
    setScrollSpeedX(x);
    setScrollSpeedY(y);

    // Check if selection rect exists and if not, ensure there's a certain a certain distance 
    // from origin point to current point, before creating the selection rect.
    const point = new Point(event.pageX, event.pageY).confineToElement(container);
    if (!ref_variables.current?.selection_rect && point.distanceToPoint(selection_point) < 8) return;

    const rect = Rect.fromPoints(point, selection_point);
    setSelectionRect(rect);

    const selection = getElementListInRect(container, rect, props.select_threshold);
    if (ref_variables.current?.flag_ctrl) {
      // If ctrl is held, we will expand and negate truthy selections
      selection.forEach((value, index) => {selection[index] = selection[index] || !props.selection?.[index]});
    }
    else if (ref_variables.current?.flag_shift) {
      // If shift is held, we will expand selection
      selection.forEach((value, index) => {selection[index] = selection[index] || !!props.selection?.[index]});
    }
    props.onHover?.(selection, rect);
  }, []);

  const onMouseUp = useCallback((event: MouseEvent) => {
    // Clear all handlers
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
    window.clearInterval(ref_variables.current?.scroll_timer);
    setScrollTimer(undefined);
    setScrollSpeedX(0);
    setScrollSpeedY(0);
    setFlagCtrl(false);
    setFlagShift(false);

    // Initialization to ensure variables exist in current context
    const {current: container} = ref_container;
    if (!container) throw new Error("Reference element does not exist. No element to select inside.");

    const selection_point = ref_variables.current?.selection_point;
    if (!selection_point) throw new Error("Selection point has not been created before window.onMouseUp event was triggered.");
    setSelectionPoint(undefined);

    // Calculate final selection rect, clear current selection rect and hover list.
    const selection_rect = ref_variables.current?.selection_rect ?? Rect.fromPoints(selection_point, Point.fromEventPage(event).confineToElement(container));
    props.onHover?.();
    setSelectionRect(undefined);

    if (ref_variables.current?.selection_rect) {
      // We have a drag selection
      const selection = getElementListInRect(container, selection_rect, props.select_threshold);
      if (ref_variables.current?.flag_ctrl) {
        // If ctrl is held, we will expand and negate truthy selections
        selection.forEach((value, index) => {selection[index] = selection[index] || !props.selection?.[index]});
      }
      else if (ref_variables.current?.flag_shift) {
        // If shift is held, we will expand selection
        selection.forEach((value, index) => {selection[index] = selection[index] || !!props.selection?.[index]});
      }
      props.onSelect?.(selection, selection_rect, event);
    }
    else {
      // Performig a normal click
      const selection = getEmptyList(container);
      if (ref_variables.current?.flag_ctrl) {
        getElementListInRect(container, selection_rect, props.select_threshold).forEach((value, index) => {selection[index] = !(props.selection?.[index] || !value) })
      }
      if (ref_variables.current?.flag_shift) {
        for (let i = 0; i < container.children.length; i++) {
          const child = container.children.item(i);
          if (child && props.selection?.[i]) selection_rect.union(child.getBoundingClientRect());
        }
      }


      if (ref_variables.current?.flag_shift) {
        // Shift and ctrl is held - Expand selection to include current selection 
        // and select all elements in the greater selection
        for (let i = 0; i < container.children.length; i++) {
          const child = container.children.item(i);
          if (child) selection_rect.union(child.getBoundingClientRect());
        }
        const selection = getElementListInRect(container, selection_rect, props.select_threshold);
        props.onSelect?.(selection, selection_rect, event);
      }
      if (ref_variables.current?.flag_shift) {
        // Shift is held - Find the focus and select everything 
        const focus = props.focus ?? 0;
        const element = container.children.item(focus);
        if (!element) throw new Error("Could not find focused element.");
        selection_rect.union(element.getBoundingClientRect());
        const selection = getElementListInRect(container, selection_rect, props.select_threshold);
        props.onSelect?.(selection, selection_rect, event);
      }
      if (props.selection && flag_ctrl) {
        const selection = getElementListInRect(container, selection_rect, props.select_threshold).reduce(
          (result, value, index) => {
            result[index] = value || result[index];
            return result;
          },
          [] as boolean[]
        );
        props.onSelect?.(selection, selection_rect, event);
      }

      if (props.selection && flag_shift) {
        // If we already have a selection, 

        const selection = getElementListInRect(container, selection_rect, props.select_threshold);
      }
    }

    props.onSelect?.(element_list, selection_rect, event);
    if (!ref_variables.current?.selection_rect) props.onClick?.(element_list.findIndex(value => value), selection_rect, event);
  }, []);

  const position_rect = {} as ElementPickerRectCSSProperties & CSSProperties;
  if (selection_rect) {
    position_rect["--display"] = "block";
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

function getScrollSpeed(rect: DOMRect, cursor: Point, coefficient: number = 15): {x: number, y: number} {
  const speed = {x: 0, y: 0};
  const scroll_coefficient = 1 / coefficient * 100;

  if (rect.y > cursor.y) {
    speed.y = (cursor.y - rect.y) / scroll_coefficient;
  }
  else if (rect.y + rect.height < cursor.y) {
    speed.y = (cursor.y - rect.y - rect.height) / scroll_coefficient;
  }

  if (rect.x > cursor.x) {
    speed.x = (cursor.x - rect.x - rect.width) / scroll_coefficient;
  }
  else if (rect.x + rect.width < cursor.x) {
    speed.x = (cursor.x - rect.x) / scroll_coefficient;
  }

  return speed;
}

function extendRectWithin<T extends Rect>(rect: T, element: HTMLElement, x: number, y: number): T {
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

function scrollElementBy(element: HTMLElement, left: number, top: number): {x: number, y: number} {
  let {scrollTop: x, scrollLeft: y} = element;
  element.scrollBy({behavior: "auto", left, top});
  x = element.scrollLeft - x;
  y = element.scrollTop - y;
  return {x, y};
}

function getElementListInRect(element: HTMLElement, rect: Rect, threshold: number = 0.2): boolean[] {
  threshold = Math.min(1, Math.max(0, threshold)) / 2;

  const element_list = [] as boolean[];
  const {children, offsetLeft, offsetTop, clientLeft, clientTop, scrollLeft, scrollTop} = element;
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i);
    if (!child) continue;

    const {left, top, width, height} = child.getBoundingClientRect();
    const x = left - offsetLeft - clientLeft + scrollLeft + threshold * width;
    const y = top - offsetTop - clientTop + scrollTop + threshold * height;
    element_list.push(rect.intersectsRect(new Rect(x, y, width - threshold * width * 2, height - threshold * height * 2)));
  }

  return element_list;
}

function getEmptyList(element: HTMLElement) {
  return Array(element.children.length).fill(false);
}

interface Reference {
  flag_ctrl: boolean;
  flag_shift: boolean;
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
  click_threshold?: number;
  select_threshold?: number;
  scroll_coefficient?: number;

  focus?: number;
  selection?: boolean[]
  style?: {
    border?: Property.Border
    background?: Property.Background
  };

  onClick?(values: number | undefined, rect: Rect, event: MouseEvent): void;
  onHover?(values?: boolean[], rect?: Rect): void;
  onSelect?(values: boolean[], rect: Rect, event: MouseEvent): void;
}

export default ElementPicker;

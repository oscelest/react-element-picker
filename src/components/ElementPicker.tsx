import Style from "./ElementPicker.module.css";
import React, {useRef, useState, CSSProperties, useEffect} from "react";
import {Property} from "csstype";
import {Rect, Point} from "@noxy/geometry";
import Utility from "../modules/Utility";

function ElementPicker(props: ElementPickerProps) {
  const [flag_ctrl, setFlagCtrl] = useState(false);
  const [flag_shift, setFlagShift] = useState(false);
  const [selection_point, setSelectionPoint] = useState<Point>();
  const [selection_rect, setSelectionRect] = useState<Rect>();

  const [scroll_timer, setScrollTimer] = useState<number>();
  const [scroll_speed_x, setScrollSpeedX] = useState<number>(0);
  const [scroll_speed_y, setScrollSpeedY] = useState<number>(0);

  const ref_container = useRef<HTMLDivElement>(null);
  const ref_point = useRef<Point>();
  const ref_rect = useRef<Rect>();

  useEffect(
    () => {
      if (!props.onHover || !ref_container.current) return;
      const children = ref_container.current.children;
      if (!ref_rect.current) return props.onHover?.(Array(children.length).fill(false));
      const rect = Utility.getRelativeSelectionRect(ref_rect.current, ref_container.current);
      props.onHover?.([...children].map(child => rect.intersectsRect(child.getBoundingClientRect())), rect);
    },
    [ref_rect.current]
  );

  const position_rect = {} as ElementPickerRectCSSProperties & CSSProperties;
  if (selection_rect) {
    position_rect["--selection-rect-display"] = "block";
    position_rect["--selection-rect-top"] = `${selection_rect.y}px`;
    position_rect["--selection-rect-left"] = `${selection_rect.x}px`;
    position_rect["--selection-rect-width"] = `${selection_rect.width}px`;
    position_rect["--selection-rect-height"] = `${selection_rect.height}px`;
  }

  const {className, style, config, ...component_method_props} = props;
  const {onClick, onHover, onCommit, onMouseDown, ...component_props} = component_method_props;
  const {clickThreshold = 8} = config ?? {};

  const classes = [Style.Component, "element-picker"];
  if (className) classes.push(className);

  return (
    <div {...component_props} ref={ref_container} className={classes.join(" ")} style={position_rect} onMouseDown={onComponentMouseDown}>
      {props.children}
    </div>
  );

  function onComponentMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (!ref_container.current) throw new Error("Container element has never or no longer exists.");

    // Shift and ctrl keys are locked on mouse down for the rest of the operation.
    if (event.shiftKey) setFlagShift(true);
    if (event.ctrlKey) setFlagCtrl(true);

    setSelectionPoint(ref_point.current = Utility.getPointInRect(event, ref_container.current));
    // setScrollTimer(window.setInterval(() => {
    //   const {current: container} = ref_container;
    //   if (!container) return;
    //   if (scroll_speed_x === 0 && scroll_speed_y === 0) return;
    //
    //   const scroll = scrollElementBy(container, scroll_speed_x, scroll_speed_y);
    //   if (!scroll.y) setScrollSpeedY(0);
    //   if (!scroll.x) setScrollSpeedX(0);
    //
    //   if (selection_rect) {
    //     const rect = extendRectWithin(selection_rect, container, scroll.x, scroll.y);
    //     setSelectionRect(rect);
    //     props.onHover?.(getSelectionFromElementAndRect(container, rect, [], event.ctrlKey, props.select_threshold), rect);
    //   }
    // }, 20));

    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("mousemove", onWindowMouseMove);
  }

  function onWindowMouseMove(event: MouseEvent) {
    if (!ref_container.current || !ref_point.current) return removeListeners();

    const point = Utility.getPointInRect(event, ref_container.current);
    const rect = Rect.fromPoints(point, ref_point.current);

    const distance = ref_point.current.getDistanceToPoint(point);
    if (!ref_rect.current && distance < clickThreshold) return;

    setSelectionRect(ref_rect.current = rect);
  }

  function onWindowMouseUp(event: MouseEvent) {
    removeListeners();

    setSelectionRect(ref_rect.current = undefined);
    setSelectionPoint(ref_point.current = undefined);
  }

  function removeListeners() {
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
    window.clearInterval(scroll_timer);
  }

  // const onMouseMove = useCallback((event: MouseEvent) => {
  //   // Get scroll speed and update variables. Selection rect does not need to exist to start scrolling.
  //   const {x, y} = getScrollSpeed(container.getBoundingClientRect(), new Point(event.pageX, event.pageY), props.scroll_coefficient);
  //   setScrollSpeedX(x);
  //   setScrollSpeedY(y);
  //
  //   // Check if selection rect exists and if not, ensure there's a certain distance
  //   // from origin point to current point, before creating the selection rect.
  //   const point = new Point(event.pageX, event.pageY).confineToElement(container);
  //   if (!ref_variables.current?.selection_rect && point.distanceToPoint(selection_point) < 8) return;
  //
  //   const rect = Rect.fromPoints(point, selection_point);
  //   setSelectionRect(rect);
  //   props.onHover?.(getSelectionFromElementAndRect(container, rect, props.selection, ref_variables.current?.flag_ctrl, props.select_threshold), rect);
  // }, []);
  //
  // const onMouseUp = useCallback((event: MouseEvent) => {
  //   // Clear all handlers
  //   window.removeEventListener("mouseup", onMouseUp);
  //   window.removeEventListener("mousemove", onMouseMove);
  //   window.clearInterval(ref_variables.current?.scroll_timer);
  //   setScrollTimer(undefined);
  //   setScrollSpeedX(0);
  //   setScrollSpeedY(0);
  //   setFlagCtrl(false);
  //   setFlagShift(false);
  //   setSelectionRect(undefined);
  //   setSelectionPoint(undefined);
  //   props.onHover?.();
  //
  //   // Initialization to ensure variables exist in current context
  //   const {current: container} = ref_container;
  //   if (!container) throw new Error("Reference element has not been initialized.");
  //   if (!ref_variables.current) throw new Error("Variable object has not been initialized.");
  //
  //   const {flag_ctrl, flag_shift, selection_point, selection_rect} = ref_variables.current;
  //   if (!selection_point) throw new Error("Selection point has not been created before window.onMouseUp event was triggered.");
  //
  //   // Calculate final selection rect, clear current selection rect and hover list.
  //   let current_rect = selection_rect ?? Rect.fromPoints(selection_point, Point.fromEventPage(event).confineToElement(container));
  //
  //   if (selection_rect) {
  //     // We have a drag selection
  //     // TODO: This needs to be changed
  //     const selection = getSelectionFromElementAndRect(container, selection_rect, [], flag_ctrl, props.select_threshold);
  //     props.onSelect?.(selection, selection_rect, event);
  //   }
  //   else {
  //     // Performing a normal click
  //     const cursor_selection = getSelectionFromElementAndRect(container, current_rect, [], false, props.select_threshold);
  //     const cursor_focus = cursor_selection.reduce((result, value, index) => value ? [...result, index] : result, [] as number[]);
  //     props.onClick?.(cursor_focus, current_rect, event);
  //
  //     let current_selection = flag_ctrl && props.selection ? [...props.selection] : [];
  //     if (flag_shift) {
  //       const focus = container.children.item(props.focus ?? 0);
  //       if (!focus) throw new Error("Focused element does not exist.");
  //
  //       current_rect = Rect.union(current_rect, focus.getBoundingClientRect());
  //       current_selection = getSelectionFromElementAndRect(container, current_rect, current_selection, flag_ctrl, props.select_threshold);
  //       props.onSelect?.(current_selection, current_rect, event);
  //     }
  //     else {
  //       props.onSelect?.(cursor_selection, current_rect, event);
  //     }
  //   }
  // }, []);


}


// function getScrollSpeed(rect: DOMRect, cursor: Point, coefficient: number = 15): {x: number, y: number} {
//   const speed = {x: 0, y: 0};
//   const scroll_coefficient = 1 / coefficient * 100;
//
//   if (rect.y > cursor.y) {
//     speed.y = (cursor.y - rect.y) / scroll_coefficient;
//   }
//   else if (rect.y + rect.height < cursor.y) {
//     speed.y = (cursor.y - rect.y - rect.height) / scroll_coefficient;
//   }
//
//   if (rect.x > cursor.x) {
//     speed.x = (cursor.x - rect.x - rect.width) / scroll_coefficient;
//   }
//   else if (rect.x + rect.width < cursor.x) {
//     speed.x = (cursor.x - rect.x) / scroll_coefficient;
//   }
//
//   return speed;
// }
//
// function extendRectWithin<T extends Rect>(rect: T, element: HTMLElement, x: number, y: number): T {
//   if (x < 0) {
//     const delta = rect.x - Math.max(0, rect.x + x);
//     rect.x -= delta;
//     rect.width += delta;
//   }
//   else if (x > 0) {
//     rect.width -= rect.x + rect.width - Math.min(element.scrollWidth, rect.x + rect.width + x);
//   }
//
//   if (y < 0) {
//     const delta = rect.y - Math.max(0, rect.y + y);
//     rect.y -= delta;
//     rect.height += delta;
//   }
//   else if (y > 0) {
//     rect.height -= rect.y + rect.height - Math.min(element.scrollHeight, rect.y + rect.height + y);
//   }
//
//   return rect;
// }
//
// function scrollElementBy(element: HTMLElement, left: number, top: number): {x: number, y: number} {
//   let {scrollTop: x, scrollLeft: y} = element;
//   element.scrollBy({behavior: "auto", left, top});
//   x = element.scrollLeft - x;
//   y = element.scrollTop - y;
//   return {x, y};
// }

// function getSelectionFromElementAndRect(element: HTMLElement, rect: Rect, current_selection: boolean[] = [], inverse: boolean = false, threshold: number = 0.2) {
//   threshold = Math.min(1, Math.max(0, threshold));
//
//   const list = [] as boolean[];
//   for (let i = 0; i < element.children.length; i++) {
//     const child = element.children.item(i);
//     if (child) {
//       const {left, top, width, height} = child.getBoundingClientRect();
//       if (rect.intersectsRect(new Rect(left, top, width, height).relateToElement(element).scale(1 - threshold))) {
//         list[i] = inverse ? !!current_selection.at(i) : true;
//       }
//     }
//     else {
//       list[i] = false;
//     }
//   }
//
//   return list;
// }


export interface ElementPickerRectCSSProperties {
  "--selection-rect-display"?: Property.Display;
  "--selection-rect-top"?: Property.Top;
  "--selection-rect-left"?: Property.Left;
  "--selection-rect-width"?: Property.Height;
  "--selection-rect-height"?: Property.Width;
}

export interface ElementPickerConfig {
  clickThreshold: number;
}

type ElementPickerBaseProps = Omit<React.HTMLAttributes<HTMLDivElement>, OmittedElementPickerBaseProps>;
type OmittedElementPickerBaseProps = "onClick"

export interface ElementPickerProps extends ElementPickerBaseProps {
  config?: ElementPickerConfig;

  clickThreshold?: number;
  selectThreshold?: number;
  scrollCoefficient?: number;

  focus?: number;
  selection?: boolean[];
  rectStyle?: {
    border?: Property.Border
    background?: Property.Background
  };

  onClick?(values: number[], rect: Rect): void;
  onHover?(values: boolean[], rect?: Rect): void;
  onCommit?(values: boolean[], rect: Rect): void;
}

export default ElementPicker;

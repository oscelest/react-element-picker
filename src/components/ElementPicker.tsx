import Style from "./ElementPicker.module.css";
import React, {useRef, useState, useEffect} from "react";
import {Property} from "csstype";
import {Rect, Point} from "@noxy/geometry";
import Utility from "../modules/Utility";

function ElementPicker(props: ElementPickerProps) {
  const {className, style = {}, selection = [], config, ...component_method_props} = props;
  const {onClick, onHover, onCommit, onMouseDown, ...component_props} = component_method_props;
  const {clickThreshold = 8, scrollSpeed = 100, scrollUpdateRate = 5} = config ?? {};

  const [internal_selection, setInternalSelection] = useState<boolean[]>(selection);
  const [selection_rect, setSelectionRect] = useState<Rect>();
  const [scroll_timer, setScrollTimer] = useState<number>();

  const ref_selection = useRef<boolean[]>(internal_selection);
  const ref_container = useRef<HTMLDivElement>(null);
  const ref_rect = useRef<Rect>();
  const ref_point = useRef<Point>();
  const ref_scroll = useRef<Point>();
  const ref_shift = useRef<boolean>(false);
  const ref_ctrl = useRef<boolean>(false);

  useEffect(() => Utility.setState(setInternalSelection, ref_selection.current = props.selection!), [props.selection]);

  if (selection_rect) {
    style["--selection-rect-display"] = "block";
    style["--selection-rect-top"] = `${selection_rect.y}px`;
    style["--selection-rect-left"] = `${selection_rect.x}px`;
    style["--selection-rect-width"] = `${selection_rect.width}px`;
    style["--selection-rect-height"] = `${selection_rect.height}px`;
  }

  const classes = [Style.Component, "element-picker"];
  if (className) classes.push(className);

  return (
    <div {...component_props} ref={ref_container} className={classes.join(" ")} style={style} onMouseDown={onComponentMouseDown}>
      {props.children}
    </div>
  );

  function onComponentMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (event.defaultPrevented || event.button !== 0 || !ref_container.current) return;

    ref_shift.current = event.shiftKey;
    ref_ctrl.current = event.ctrlKey;
    ref_point.current = Utility.getRelativePoint(ref_container.current, Utility.getPointFromEvent(event));

    setScrollTimer(window.setInterval(onInterval, Math.round(1000 / scrollUpdateRate)));
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("mousemove", onWindowMouseMove);
  }

  function onWindowMouseMove(event: MouseEvent) {
    if (!ref_container.current || !ref_point.current) return removeListeners();

    const point = Utility.getPointFromEvent(event);
    ref_scroll.current = Utility.getScrollPoint(ref_container.current, point, Math.round(1 / scrollUpdateRate * scrollSpeed));

    const rect_point = Utility.getRelativePoint(ref_container.current, point);
    const distance = ref_point.current.getDistanceToPoint(rect_point);
    if (ref_rect.current || distance > clickThreshold) hover(Rect.fromPoints(rect_point, ref_point.current));
  }

  function onWindowMouseUp() {
    removeListeners();
    if (!ref_container.current) return;
    // If there is a rect, we're performing a drag selection
    if (ref_rect.current) {
      const rect = Utility.getRelativeRect(ref_container.current, ref_rect.current);
      const selection = Utility.getSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
      commit(selection, rect);
    }
    // If there is a point but no rect, we're performing a click
    else if (ref_point.current) {
      const rect = Utility.getRelativeRect(ref_container.current, new Rect(ref_point.current.x, ref_point.current.y, 0, 0));
      const selection = Utility.getClickSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
      commit(selection, rect);
    }
    hover();

    ref_ctrl.current = false;
    ref_shift.current = false;
    ref_rect.current = undefined;
    ref_point.current = undefined;
    ref_scroll.current = undefined;
    setSelectionRect(undefined);
  }

  function onInterval() {
    if (!ref_container.current) return removeListeners();
    if (!ref_rect.current || !ref_scroll.current) return;
    const scroll = ref_scroll.current;
    const {scrollLeft, scrollWidth, scrollTop, scrollHeight} = ref_container.current;

    if (!scroll.x && !scroll.y) return;
    ref_container.current.scrollBy(ref_scroll.current.x, ref_scroll.current.y);
    scroll.x = ref_container.current.scrollLeft - scrollLeft;
    scroll.y = ref_container.current.scrollTop - scrollTop;

    const rect = Rect.fromSimpleRect(ref_rect.current);
    if (scroll.x < 0) {
      const dx = rect.x + scroll.x < 0 ? -rect.x : scroll.y;
      rect.x += dx;
      rect.width -= dx;
    }
    else {
      rect.width = Math.min(scrollWidth - rect.x, rect.x + rect.width + scroll.x);
    }

    if (scroll.y < 0) {
      const dy = rect.y + scroll.y < 0 ? -rect.y : scroll.y;
      rect.y += dy;
      rect.height -= dy;
    }
    else {
      rect.height = Math.min(scrollHeight - rect.y, rect.y + rect.height + scroll.y);
    }
    hover(rect);
  }

  function hover(rect?: Rect) {
    setSelectionRect(ref_rect.current = rect);
    if (!props.onHover || !ref_container.current) return;
    if (!ref_rect.current) return props.onHover?.();

    rect = Utility.getRelativeRect(ref_container.current, ref_rect.current);
    const selection = Utility.getSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
    props.onHover?.(selection, rect);
  }

  function commit(current_selection: boolean[], rect?: Rect) {
    ref_selection.current = current_selection;
    setInternalSelection(current_selection);
    onCommit?.(current_selection, rect);
  }

  function removeListeners() {
    window.clearInterval(scroll_timer);
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
  }
}


export interface ElementPickerRectCSSProperties {
  "--selection-rect-display"?: Property.Display;
  "--selection-rect-top"?: Property.Top;
  "--selection-rect-left"?: Property.Left;
  "--selection-rect-width"?: Property.Height;
  "--selection-rect-height"?: Property.Width;
}

export interface ElementPickerConfig {
  clickThreshold?: number;
  scrollUpdateRate?: number;
  scrollSpeed?: number;
}

type ElementPickerBaseProps = Omit<React.HTMLAttributes<HTMLDivElement>, OmittedElementPickerBaseProps>;
type OmittedElementPickerBaseProps = "onClick" | "style"

export interface ElementPickerProps extends ElementPickerBaseProps {
  config?: ElementPickerConfig;
  selection?: boolean[];
  style?: React.CSSProperties & ElementPickerRectCSSProperties;

  onClick?(values: number[], rect: Rect): void;
  onHover?(values?: boolean[], rect?: Rect): void;
  onCommit?(values: boolean[], rect?: Rect): void;
}

export default ElementPicker;

import Style from "./ElementPicker.module.css";
import React, {useRef, useState, useEffect} from "react";
import {Property} from "csstype";
import {Rect, Point} from "@noxy/geometry";
import Utility from "../modules/Utility";

function ElementPicker(props: ElementPickerProps) {
  const {className, style = {}, selection, config, ...component_method_props} = props;
  const {onClick, onHover, onCommit, onMouseDown, onMouseEnter, onMouseLeave, ...component_props} = component_method_props;
  const {clickThreshold = 8, scrollSpeed = 2500} = config ?? {};

  const [selection_rect, setSelectionRect] = useState<Rect>();
  const [internal_selection, setInternalSelection] = useState<boolean[]>(selection ?? []);

  const ref_container = useRef<HTMLDivElement>(null);
  const ref_selection = useRef<boolean[]>(internal_selection);

  const ref_rect = useRef<Rect>();
  const ref_point = useRef<Point>();
  const ref_scroll = useRef<Point>();
  const ref_origin = useRef<Point>();
  const ref_interval = useRef<{id: number, elapsed: number}>({id: 0, elapsed: 0});

  const ref_ctrl = useRef<boolean>(false);
  const ref_shift = useRef<boolean>(false);

  useEffect(() => selection && setInternalSelection(ref_selection.current = selection), [selection]);

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
    <div {...component_props} ref={ref_container} className={classes.join(" ")} style={style}
         onMouseDown={onComponentMouseDown} onMouseEnter={onComponentMouseEnter} onMouseLeave={onComponentMouseLeave}>
      {props.children}
    </div>
  );

  function onComponentMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    if (ref_interval.current) cancelAnimationFrame(ref_interval.current.id);
    onMouseEnter?.(event);
    if (event.defaultPrevented) return;
  }

  function onComponentMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
    onMouseEnter?.(event);
    if (event.defaultPrevented || !ref_container.current || !ref_origin.current || !ref_point.current || !ref_rect.current) return;
    ref_scroll.current = new Point(0, 0);
    ref_interval.current = {id: requestAnimationFrame(onInterval), elapsed: performance.now()};
  }

  function onComponentMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (event.defaultPrevented || event.button !== 0 || !ref_container.current) return;

    ref_ctrl.current = event.ctrlKey;
    ref_shift.current = event.shiftKey;
    ref_origin.current = Utility.getRelativePoint(ref_container.current, Utility.getPointFromEvent(event));

    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("mousemove", onWindowMouseMove);
  }

  function onWindowMouseMove(event: MouseEvent) {
    if (!ref_container.current || !ref_origin.current) return removeListeners();

    ref_point.current = Utility.getPointFromEvent(event);
    const rect_point = Utility.getRelativePoint(ref_container.current, ref_point.current);
    const distance = ref_origin.current.getDistanceToPoint(rect_point);
    if (ref_rect.current || distance > clickThreshold) hover(Rect.fromPoints(ref_origin.current, rect_point));
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
    else if (ref_origin.current) {
      const rect = Utility.getRelativeRect(ref_container.current, new Rect(ref_origin.current.x, ref_origin.current.y, 0, 0));
      const selection = Utility.getClickSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
      commit(selection, rect);
    }

    hover();
    ref_ctrl.current = false;
    ref_shift.current = false;
    ref_rect.current = undefined;
    ref_point.current = undefined;
    ref_origin.current = undefined;
    ref_scroll.current = undefined;
    setSelectionRect(undefined);
  }

  function onInterval(elapsed: number) {
    if (!ref_container.current || !ref_origin.current || !ref_point.current || !ref_scroll.current) return removeListeners();
    const updateRate = 1000 / (elapsed - ref_interval.current.elapsed);
    const {current: scroll} = ref_scroll;
    const {scrollLeft, scrollWidth, clientWidth, scrollTop, scrollHeight, clientHeight} = ref_container.current;
    const {left, top, width, height} = ref_container.current.getBoundingClientRect();
    const {x, y} = ref_point.current;

    if (x < left && scrollLeft > 0) {
      scroll.x += scrollSpeed / updateRate * Math.tanh(x / 100);
    }
    else if (x > left + width && scrollLeft + clientWidth < scrollWidth) {
      scroll.x += scrollSpeed / updateRate * Math.tanh((x - left - width) / 100);
    }
    else {
      scroll.x = 0;
    }

    if (y < top && scrollTop > 0) {
      scroll.y += scrollSpeed / updateRate * Math.tanh(y / 100);
    }
    else if (y > top + height && scrollTop + clientHeight < scrollHeight) {
      scroll.y += scrollSpeed / updateRate * Math.tanh((y - top - height) / 100);
    }
    else {
      scroll.y = 0;
    }

    if (scroll.y !== 0 || scroll.x !== 0) {
      const sx = Math.floor(scroll.x);
      const sy = Math.floor(scroll.y);

      scroll.x -= sx;
      scroll.y -= sy;
      ref_container.current.scrollBy(sx, sy);
      hover(Rect.fromPoints(ref_origin.current, Utility.getRelativePoint(ref_container.current, Point.translateByCoords(ref_point.current, sx, sy))));
    }

    ref_interval.current.elapsed = elapsed;
    ref_interval.current.id = requestAnimationFrame(onInterval);
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
    if (ref_interval.current) cancelAnimationFrame(ref_interval.current.id);
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

import Style from "./ElementPicker.module.css";
import React, {useRef, useState, useEffect} from "react";
import {Property} from "csstype";
import {Rect, Point, SimpleRect} from "@noxy/geometry";
import Utility from "../modules/Utility";

function ElementPicker(props: ElementPickerProps) {
  const {className, selection, focus, config, tabIndex = -1, style = {}, ...component_method_props} = props;
  const {onHover, onCommit, onKeyDown, onMouseDown, onMouseEnter, onMouseLeave, ...component_props} = component_method_props;
  const {clickThreshold = 8, scrollSpeed = 2500} = config ?? {};

  const [selection_rect, setSelectionRect] = useState<Rect>();
  const [internal_focus, setInternalFocus] = useState<number>(0);
  const [internal_selection, setInternalSelection] = useState<boolean[]>(selection ?? []);

  const ref_container = useRef<HTMLDivElement>(null);
  const ref_selection = useRef<boolean[]>(internal_selection);

  const ref_rect = useRef<Rect>();
  const ref_point = useRef<Point>();
  const ref_scroll = useRef<Point>();
  const ref_origin = useRef<Point>();
  const ref_interval_id = useRef<number>(0);
  const ref_interval_offset = useRef<number>(0);

  const ref_ctrl = useRef<boolean>(false);
  const ref_shift = useRef<boolean>(false);

  useEffect(() => { focus !== undefined && setInternalFocus(focus); }, [focus]);
  useEffect(() => { selection !== undefined && setInternalSelection(ref_selection.current = selection); }, [selection]);

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
    <div {...component_props} ref={ref_container} className={classes.join(" ")} style={style} tabIndex={tabIndex}
         onKeyDown={onComponentKeyDown} onMouseDown={onComponentMouseDown} onMouseEnter={onComponentMouseEnter} onMouseLeave={onComponentMouseLeave}>
      {props.children}
    </div>
  );

  function onComponentKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !ref_container.current?.children.length) return;

    const focus_element = ref_container.current?.children.item(internal_focus);
    if (!focus_element) throw new Error("No focus element could not be found.");

    const focus_rect = focus_element.getBoundingClientRect();
    const focus_center = Rect.getCenterPoint(focus_rect);
    const focus_selection_rect = Utility.getFocusSelectionRect(ref_container.current, focus_rect, event.code);
    if (!focus_selection_rect) return;
    event.preventDefault();

    const focus = {element: focus_element, distance: event.shiftKey ? -Infinity : Infinity, index: internal_focus, rect: focus_rect};
    for (let i = 0; i < ref_container.current?.children.length; i++) {
      const child = ref_container.current?.children.item(i);
      if (!child || child === focus_element) continue;

      const child_rect = child.getBoundingClientRect();
      if (focus_selection_rect.intersectsRect(child_rect)) {
        const distance = focus_center.getDistanceToPoint(Rect.getCenterPoint(child_rect));
        if (!event.shiftKey && distance < focus.distance || event.shiftKey && distance > focus.distance) {
          focus.element = child;
          focus.rect = child_rect;
          focus.index = i;
          focus.distance = distance;
        }
      }
    }

    const child_list = Array.from(ref_container.current?.children).map(child => child.getBoundingClientRect());
    const selection_rect = Rect.fromSimpleRect(focus.rect);
    if (event.shiftKey) {
      selection_rect.union(focus_rect);
      if (event.ctrlKey) {
        selection_rect.union(...child_list.reduce((r, c, i) => internal_selection[i] ? [...r, c] : r, [] as SimpleRect[]));
      }
    }
    const selection = child_list.map((rect, i) => (event.ctrlKey && internal_selection[i]) || selection_rect.intersectsRect(rect));
    return commit(selection, focus.index);
  }

  function onComponentMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    cancelAnimationFrame(ref_interval_id.current);
    onMouseEnter?.(event);
    if (event.defaultPrevented) return;
  }

  function onComponentMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
    onMouseEnter?.(event);
    if (event.defaultPrevented || !ref_container.current || !ref_origin.current || !ref_point.current || !ref_rect.current) return;
    ref_scroll.current = new Point(0, 0);
    ref_interval_id.current = requestAnimationFrame(onInterval);
    ref_interval_offset.current = performance.now();
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
    if (!ref_container.current || !ref_origin.current) return;

    // If there is a rect, we're performing a drag selection
    if (ref_rect.current) {
      const rect = Utility.getRelativeRect(ref_container.current, ref_rect.current);
      const selection = Utility.getDragSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
      const focus = Utility.getFocus(ref_container.current, ref_origin.current) ?? internal_focus;
      commit(selection, focus);
    }
    // If there is a point but no rect, we're performing a click
    else if (ref_origin.current) {
      const rect = Utility.getRelativeRect(ref_container.current, new Rect(ref_origin.current.x, ref_origin.current.y, 0, 0));
      const selection = Utility.getClickSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
      const focus = Utility.getFocus(ref_container.current, ref_origin.current) ?? internal_focus;
      commit(selection, focus);
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
    const updateRate = 1000 / (elapsed - ref_interval_offset.current);
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

    ref_interval_id.current = requestAnimationFrame(onInterval);
    ref_interval_offset.current = elapsed;
  }

  function hover(rect?: Rect) {
    setSelectionRect(ref_rect.current = rect);
    if (!props.onHover || !ref_container.current || !ref_origin.current) return;
    if (!ref_rect.current) return props.onHover?.();

    rect = Utility.getRelativeRect(ref_container.current, ref_rect.current);
    const selection = Utility.getDragSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
    props.onHover?.(selection);
  }

  function commit(current_selection: boolean[], focus: number) {
    ref_selection.current = current_selection;
    setInternalFocus(focus);
    setInternalSelection(current_selection);
    onCommit?.(current_selection, focus);
  }

  function removeListeners() {
    cancelAnimationFrame(ref_interval_id.current);
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
type OmittedElementPickerBaseProps = "style"

export interface ElementPickerProps extends ElementPickerBaseProps {
  config?: ElementPickerConfig;
  focus?: number;
  selection?: boolean[];
  style?: React.CSSProperties & ElementPickerRectCSSProperties;

  onHover?(values?: boolean[]): void;
  onCommit?(values: boolean[], focus: number): void;
}

export default ElementPicker;

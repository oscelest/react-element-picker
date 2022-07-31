import Style from "./ElementPicker.module.css";
import React, {useRef, useState, CSSProperties, useEffect} from "react";
import {Property} from "csstype";
import {Rect, Point} from "@noxy/geometry";
import Utility from "../modules/Utility";
import getEmptySelection = Utility.getEmptySelection;

function ElementPicker(props: ElementPickerProps) {
  const [selection, setSelection] = useState<boolean[]>(props.selection ?? []);
  const [selection_rect, setSelectionRect] = useState<Rect>();
  const [scroll_timer, setScrollTimer] = useState<number>();

  const ref_selection = useRef<boolean[]>(selection);
  const ref_container = useRef<HTMLDivElement>(null);
  const ref_rect = useRef<Rect>();
  const ref_point = useRef<Point>();
  const ref_scroll = useRef<Point>();
  const ref_shift = useRef<boolean>(false);
  const ref_ctrl = useRef<boolean>(false);

  useEffect(() => Utility.setState(setSelection, ref_selection.current = props.selection!), [props.selection]);

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
    if (event.shiftKey) ref_shift.current = true;
    if (event.ctrlKey) ref_ctrl.current = true;
    ref_point.current = Utility.getRelativePoint(ref_container.current, Utility.getPointFromEvent(event));

    setScrollTimer(window.setInterval(onInterval, 100));
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("mousemove", onWindowMouseMove);
  }

  function onWindowMouseMove(event: MouseEvent) {
    if (!ref_container.current || !ref_point.current) return removeListeners();

    const point = Utility.getPointFromEvent(event);
    ref_scroll.current = Utility.getScrollPoint(ref_container.current, point, config?.scrollSpeed);

    const rect_point = Utility.getRelativePoint(ref_container.current, point);
    const distance = ref_point.current.getDistanceToPoint(rect_point);
    if (ref_rect.current || distance > clickThreshold) hover(Rect.fromPoints(rect_point, ref_point.current));
  }

  function onWindowMouseUp(event: MouseEvent) {
    removeListeners();
    if (ref_container.current) {
      if (ref_point.current) {
        // If there is a rect, we're performing a drag selection
        if (ref_rect.current) {
          const rect = Utility.getRelativeRect(ref_container.current, ref_rect.current);
          const selection = Utility.getSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
          commit(selection, rect);
        }
        // Otherwise it's a click selection
        else {
          const rect = Utility.getRelativeRect(ref_container.current, new Rect(ref_point.current.x, ref_point.current.y, 0, 0));
          const selection = Utility.getClickSelection(ref_container.current.children, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
          commit(selection, rect);
        }
      }
      onHover?.(getEmptySelection(ref_container.current));
    }

    ref_ctrl.current = false;
    ref_shift.current = false;
    ref_rect.current = undefined;
    ref_point.current = undefined;
    ref_scroll.current = undefined;
    setSelectionRect(undefined);
  }

  function onInterval() {
    if (!ref_container.current) return removeListeners();
    if (!ref_rect.current || !ref_scroll.current || !ref_scroll.current.x && !ref_scroll.current.y) return;
    ref_container.current.scrollBy(ref_scroll.current.x, ref_scroll.current.y);
    const rect = Rect.fromSimpleRect(ref_rect.current);
    rect.x += ref_scroll.current.x;
    rect.y += ref_scroll.current.y;
    if (ref_scroll.current.x < 0) rect.width += ref_scroll.current.x;
    if (ref_scroll.current.y < 0) rect.height += ref_scroll.current.y;
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
    setSelection(current_selection);
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
  scrollSpeed?: number;
}

type ElementPickerBaseProps = Omit<React.HTMLAttributes<HTMLDivElement>, OmittedElementPickerBaseProps>;
type OmittedElementPickerBaseProps = "onClick"

export interface ElementPickerProps extends ElementPickerBaseProps {
  config?: ElementPickerConfig;
  selection?: boolean[];

  onClick?(values: number[], rect: Rect): void;
  onHover?(values?: boolean[], rect?: Rect): void;
  onCommit?(values: boolean[], rect?: Rect): void;
}

export default ElementPicker;

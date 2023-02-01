import {Point, Rect, SimpleRect} from "@noxy/geometry";
import React, {CSSProperties, DetailedHTMLProps, HTMLAttributes, Ref, useEffect, useRef, useState} from "react";
import Utility from "../modules/Utility";
import Style from "./ElementPicker.module.css";
function ElementPicker(props: ElementPickerProps) {
  const {className, selection, focus, clickThreshold = 8, scrollSpeed = 2500, tabIndex, style, children, ...component_method_props} = props;
  const {onHover, onCommit, onKeyDown, onMouseDown, onMouseEnter, onMouseLeave, ...component_props} = component_method_props;
  
  const [selection_rect, setSelectionRect] = useState<Rect>();
  const [internal_focus, setInternalFocus] = useState<number>(0);
  const [internal_selection, setInternalSelection] = useState<boolean[]>(selection ?? []);
  
  const ref_indicator = useRef<HTMLDivElement>();
  const ref_container = useRef<HTMLDivElement>();
  
  const ref_selection = useRef<boolean[]>(internal_selection);
  
  const ref_rect = useRef<Rect>();
  const ref_point = useRef<Point>();
  const ref_scroll = useRef<Point>();
  const ref_origin = useRef<Point>();
  const ref_interval_id = useRef<number>(0);
  const ref_interval_offset = useRef<number>(0);
  
  const ref_ctrl = useRef<boolean>(false);
  const ref_shift = useRef<boolean>(false);
  
  useEffect(() => { selection !== undefined && setInternalSelection(ref_selection.current = selection); }, [selection]);
  
  const tab_index = Math.max(0, tabIndex || 0);
  const element_list = ref_container.current ? Array.from(ref_container.current.children).slice(ref_container.current.children.item(0) === ref_indicator.current ? 1 : 0) : [];
  
  const classes = [Style.Component, "element-picker"];
  if (className) classes.push(className);
  
  return (
    <div {...component_props} ref={ref_container} className={classes.join(" ")} tabIndex={tab_index}
         onKeyDown={onComponentKeyDown} onMouseDown={onComponentMouseDown} onMouseEnter={onComponentMouseEnter} onMouseLeave={onComponentMouseLeave}>
      {renderSelectionRect(selection_rect, ref_indicator)}
      {children}
    </div>
  );
  
  function onComponentMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (!Utility.resolveEvent(event, onMouseDown, event.button === 0 && !!ref_container.current)) return;
    
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
      const selection = Utility.getDragSelection(element_list, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
      const focus = Utility.getFocus(ref_container.current, ref_origin.current) ?? internal_focus;
      commit(selection, focus);
    }
    // If there is a point but no rect, we're performing a click
    else if (ref_origin.current) {
      const rect = Utility.getRelativeRect(ref_container.current, new Rect(ref_origin.current.x, ref_origin.current.y, 0, 0));
      const selection = Utility.getClickSelection(element_list, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
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
  
  function onComponentKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!Utility.resolveEvent(event, onKeyDown, !!element_list.length)) return;
    
    const focus_element = element_list[internal_focus];
    if (!focus_element) throw new Error("No focus element could not be found.");
    
    const focus_rect = focus_element.getBoundingClientRect();
    const focus_center = Rect.getCenterPoint(focus_rect);
    const focus_selection_rect = Utility.getFocusSelectionRect(ref_container.current, focus_rect, event.code);
    if (!focus_selection_rect) return;
    event.preventDefault();
    
    const focus = {element: focus_element, distance: event.shiftKey ? -Infinity : Infinity, index: internal_focus, rect: focus_rect};
    for (let index in element_list) {
      const child = element_list[index];
      if (child === focus_element) continue;
      const child_rect = child.getBoundingClientRect();
      if (focus_selection_rect.intersectsRect(child_rect)) {
        const distance = focus_center.getDistanceToPoint(Rect.getCenterPoint(child_rect));
        if (!event.shiftKey && distance < focus.distance || event.shiftKey && distance > focus.distance) {
          focus.element = child;
          focus.rect = child_rect;
          focus.index = +index;
          focus.distance = distance;
        }
      }
    }
    
    const child_rect_list = element_list.map(child => child.getBoundingClientRect());
    const selection_rect = Rect.fromSimpleRect(focus.rect);
    if (event.shiftKey) {
      selection_rect.union(focus_rect);
      if (event.ctrlKey) {
        selection_rect.union(...child_rect_list.reduce((result, child, index) => internal_selection[index] ? [...result, child] : result, [] as SimpleRect[]));
      }
    }
    
    const selection = child_rect_list.map((rect, index) => (event.ctrlKey && internal_selection[index]) || selection_rect.intersectsRect(rect));
    return commit(selection, focus.index);
  }
  
  function onComponentMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    cancelAnimationFrame(ref_interval_id.current);
    onMouseEnter?.(event);
    if (event.defaultPrevented) return;
  }
  
  function onComponentMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
    if (!Utility.resolveEvent(event, onMouseEnter, !!ref_container.current)) return;

    ref_scroll.current = new Point(0, 0);
    ref_interval_id.current = requestAnimationFrame(onInterval);
    ref_interval_offset.current = performance.now();
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
      const dx = Math.floor(scroll.x);
      const dy = Math.floor(scroll.y);
      
      scroll.x -= dx;
      scroll.y -= dy;
      ref_container.current.scrollBy(dx, dy);
      hover(Rect.fromPoints(ref_origin.current, Utility.getRelativePoint(ref_container.current, Point.translateByCoords(ref_point.current, dx, dy))));
    }
    
    ref_interval_id.current = requestAnimationFrame(onInterval);
    ref_interval_offset.current = elapsed;
  }
  
  function hover(rect?: Rect) {
    setSelectionRect(ref_rect.current = rect);
    if (!onHover || !ref_container.current || !ref_origin.current) return;
    if (!rect) return onHover();
    
    rect = Utility.getRelativeRect(ref_container.current, ref_rect.current);
    const selection = Utility.getDragSelection(element_list, rect, ref_selection.current, ref_ctrl.current, ref_shift.current);
    onHover(selection);
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

function renderSelectionRect(rect: Rect, ref: Ref<HTMLDivElement>) {
  if (!rect) return null;
  
  const style: CSSProperties = {
    top: `${rect.y}px`,
    left: `${rect.x}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
  
  return (
    <div ref={ref} className={"element-picker-rect"} style={style}/>
  );
}

type HTMLComponentProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>

export interface ElementPickerProps extends HTMLComponentProps {
  clickThreshold?: number;
  scrollSpeed?: number;
  
  focus: number;
  selection: boolean[];

  
  onHover(values?: boolean[]): void;
  onCommit(values: boolean[], focus: number): void;
}

export default ElementPicker;

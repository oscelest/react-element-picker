import {Rect} from "@noxy/geometry";
import React, {CSSProperties, DetailedHTMLProps, HTMLAttributes, Ref, useEffect, useState} from "react";
import {ComponentLogic} from "../classes/ComponentLogic";
import Style from "./ElementPicker.module.css";

const keydown_list = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

function ElementPicker(props: ElementPickerProps) {
  const {className, selection, focus, clickThreshold = 8, scrollSpeed = 2500, tabIndex, style, children, ...component_method_props} = props;
  const {onHover, onCommit, onKeyDown, onMouseDown, onMouseEnter, onMouseLeave, ...component_props} = component_method_props;
  
  // We use an external state class object because we have a lot of ref
  const [rect, setRect] = useState<Rect>();
  const [logic] = useState<ComponentLogic>(new ComponentLogic(selection, scrollSpeed, clickThreshold));
  
  useEffect(() => { logic.focus = focus; }, [focus]);
  useEffect(() => { logic.selection = selection; }, [selection]);
  
  const tab_index = Math.max(0, tabIndex || 0);
  
  const classes = [Style.Component, "element-picker"];
  if (className) classes.push(className);
  
  return (
    <div {...component_props} ref={logic.ref_container} className={classes.join(" ")} tabIndex={tab_index}
         onKeyDown={onComponentKeyDown} onMouseDown={onComponentMouseDown} onMouseEnter={onComponentMouseEnter} onMouseLeave={onComponentMouseLeave}>
      {renderSelectionRect(rect, logic.ref_indicator)}
      {children}
    </div>
  );
  
  function onComponentMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (!ComponentLogic.resolveEvent(event, onMouseDown, event.button === 0)) return;
    logic.startMouseSelect(event);
    if (logic.mouse_active) {
      setRect(undefined);
      window.addEventListener("mouseup", onWindowMouseUp);
      window.addEventListener("mousemove", onWindowMouseMove);
    }
  }
  
  function onWindowMouseMove(event: MouseEvent) {
    logic.updateMouseSelect(event, !!onHover);
    triggerHover();
  }
  
  function onWindowMouseUp(event: MouseEvent) {
    removeListeners();
    logic.endMouseSelect(event);
    
    onHover?.();
    onCommit(logic.mouse_selection, logic.focus);
    setRect(undefined);
  }
  
  function onComponentKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!ComponentLogic.resolveEvent(event, onKeyDown, !logic.mouse_active && keydown_list.includes(event.code))) return;
    logic.startKeyboardSelect(event);
    onCommit(logic.keyboard_selection, logic.focus);
  }
  
  function onComponentMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    if (logic.mouse_active) {
      cancelAnimationFrame(logic.scroll_id);
    }
  
    onMouseEnter?.(event);
  }
  
  function onComponentMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
    if (!ComponentLogic.resolveEvent(event, onMouseLeave, logic.mouse_active)) return;
    
    logic.startScroll(requestAnimationFrame(onInterval));
  }
  
  function onInterval(elapsed: number) {
    if (!logic.mouse_active) return removeListeners();
    
    logic.updateScroll(elapsed, requestAnimationFrame(onInterval));
    triggerHover();
  }
  
  function triggerHover() {
    if (logic.mouse_multiple && onHover) {
      setRect(Rect.fromPoints(logic.mouse_origin, logic.mouse_point));
      onHover(logic.mouse_selection);
    }
  }
  
  function removeListeners() {
    cancelAnimationFrame(logic.scroll_id);
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
  }
}

function renderSelectionRect(rect: Rect | undefined, ref: Ref<HTMLDivElement>) {
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
  
  
  onHover?(values?: boolean[]): void;
  onCommit(values: boolean[], focus: number): void;
}

export default ElementPicker;

import {Point, Rect} from "@noxy/geometry";
import React, {RefObject, useRef} from "react";

export class ComponentLogic {
  public focus: number;
  public selection: boolean[];
  public element_list: HTMLElement[];
  
  public ref_container: RefObject<HTMLDivElement>;
  public ref_indicator: RefObject<HTMLDivElement>;
  
  public mouse_point: Point;
  public mouse_origin: Point;
  public mouse_active: boolean;
  public mouse_multiple: boolean;
  public mouse_threshold: number;
  public mouse_selection: boolean[];
  
  public keyboard_selection: boolean[];
  
  public scroll_id: number;
  public scroll_time: number;
  public scroll_rate: number;
  public scroll_speed: number;
  public scroll_point: Point;
  public scroll_offset: Point;
  
  public flag_ctrl: boolean;
  public flag_shift: boolean;
  
  constructor(selection: boolean[], speed: number, threshold: number) {
    this.focus = 0;
    this.selection = selection;
    this.element_list = [];
    
    this.ref_container = useRef<HTMLDivElement>(null);
    this.ref_indicator = useRef<HTMLDivElement>(null);
    
    this.mouse_point = new Point(0, 0);
    this.mouse_origin = new Point(0, 0);
    this.mouse_active = false;
    this.mouse_multiple = false;
    this.mouse_threshold = threshold;
    this.mouse_selection = [];
    
    this.scroll_id = 0;
    this.scroll_time = 0;
    this.scroll_rate = 0;
    this.scroll_speed = speed;
    this.scroll_point = new Point(0, 0);
    this.scroll_offset = new Point(0, 0);
    
    this.keyboard_selection = [];
    
    this.flag_ctrl = false;
    this.flag_shift = false;
  }
  
  public static resolveEvent<E extends React.SyntheticEvent>(event: E, handler?: React.EventHandler<E>, condition?: boolean): boolean {
    handler?.(event);
    return !event.defaultPrevented && (condition ?? true);
  }
  
  public startMouseSelect(event: React.MouseEvent) {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    // We need to ensure the mousedown event is inside the container
    const {offsetLeft, offsetTop, clientLeft, clientTop, clientWidth, clientHeight} = this.ref_container.current;
    const x_min = offsetLeft + clientLeft;
    const y_min = offsetTop + clientTop;
    const x_max = x_min + clientWidth;
    const y_max = y_min + clientHeight;
    if (event.pageX < x_min && event.pageX > x_max && event.pageY < y_min && event.pageY > y_max) return;
    
    // We set basic stateful values first
    this.flag_ctrl = event.ctrlKey;
    this.flag_shift = event.shiftKey;
    this.mouse_active = true;
    this.mouse_multiple = false;
    
    // We update origin and element list to the current DOM
    this.mouse_origin = this.getPointInsideContainer(event.pageX, event.pageY);
    this.element_list = this.getElementList();
    
    return this;
  }
  
  public updateMouseSelect(event: MouseEvent, hover_selection: boolean) {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    // We update points and element list as the mouse moves around
    this.mouse_point = this.getPointInsideContainer(event.pageX, event.pageY);
    this.scroll_point = new Point(event.pageX, event.pageY);
    this.element_list = this.getElementList();
    
    // We check if the mouse has moved far enough away from the origin to create a rect
    this.mouse_multiple = this.mouse_multiple || this.mouse_origin.getDistanceToPoint(this.mouse_point) > this.mouse_threshold;
    if (this.mouse_multiple && hover_selection) {
      // If it has, we started updating the selection
      this.mouse_selection = this.getSelection();
    }
    
    return this;
  }
  
  public endMouseSelect(event: MouseEvent) {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    // We update point and list to ensure we can get focus and selection from the latest DOM
    this.mouse_point = this.getPointInsideContainer(event.pageX, event.pageY);
    this.element_list = this.getElementList();
    
    // Mouse selection has ended, and we update focus and selection, so it can be used for any callback
    this.focus = this.getFocus();
    this.mouse_selection = this.getSelection();
    
    // We clean up the state values
    this.mouse_active = false;
    this.mouse_multiple = false;
    
    return this;
  }
  
  public startScroll(id: number) {
    this.scroll_id = id;
    this.scroll_time = performance.now();
    this.scroll_point = new Point(0, 0);
  }
  
  public updateScroll(elapsed: number, id: number) {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    this.scroll_rate = 1000 / (elapsed - this.scroll_time);
    
    const {clientLeft, clientTop, clientWidth, clientHeight, scrollLeft, scrollTop, scrollWidth, scrollHeight, offsetLeft, offsetTop} = this.ref_container.current;
    this.scroll_offset.x = this.getScrollSpeed(this.scroll_point.x, scrollLeft, offsetLeft + clientLeft, offsetLeft + clientLeft + clientWidth, scrollWidth - clientWidth);
    this.scroll_offset.y = this.getScrollSpeed(this.scroll_point.y, scrollTop, offsetTop + clientTop, offsetTop + clientTop + clientHeight, scrollHeight - clientHeight);
    
    if (this.ref_container.current && (this.scroll_offset.y !== 0 || this.scroll_offset.x !== 0)) {
      const dx = Math.floor(this.scroll_offset.x);
      const dy = Math.floor(this.scroll_offset.y);
      
      this.scroll_offset.x -= dx;
      this.scroll_offset.y -= dy;
      this.ref_container.current?.scrollBy(dx, dy);
      
      this.mouse_point = this.getPointInsideContainer(this.scroll_point.x + dx, this.scroll_point.y + dy);
      this.mouse_selection = this.getSelection();
    }
    
    this.scroll_id = id;
    this.scroll_time = elapsed;
  }
  
  public startKeyboardSelect(event: React.KeyboardEvent) {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    this.element_list = this.getElementList();
    const focus_element = this.element_list[this.focus];
    if (!focus_element) throw new Error("No focus element could be found.");
    
    event.preventDefault();
    this.flag_ctrl = event.ctrlKey;
    this.flag_shift = event.shiftKey;
    
    let focus_rect = focus_element.getBoundingClientRect();
    let focus_index = this.focus;
    let focus_distance = event.shiftKey ? -Infinity : Infinity;
    const focus_center = Rect.getCenterPoint(focus_rect);
    
    const focus_x = event.code === "ArrowLeft" ? -focus_element.scrollLeft : focus_rect.left;
    const focus_y = event.code === "ArrowUp" ? -focus_element.scrollTop : focus_rect.top;
    const focus_width = event.code === "ArrowRight" ? Infinity : focus_rect.x + focus_rect.width - focus_x;
    const focus_height = event.code === "ArrowDown" ? Infinity : focus_rect.y + focus_rect.height - focus_y;
    const focus_selection_rect = new Rect(focus_x, focus_y, focus_width, focus_height);
    
    for (let index in this.element_list) {
      if (+index === this.focus) continue;
      
      const child = this.element_list[index];
      const child_rect = child.getBoundingClientRect();
      
      if (focus_selection_rect.intersectsRect(child_rect)) {
        const distance = focus_center.getDistanceToPoint(Rect.getCenterPoint(child_rect));
        
        if (!this.flag_shift && distance < focus_distance || this.flag_shift && distance > focus_distance) {
          focus_rect = child_rect;
          focus_distance = distance;
          focus_index = +index;
        }
      }
    }
    
    const selection_rect = Rect.fromSimpleRect(focus_rect);
    const child_rect_list = this.element_list.map(child => child.getBoundingClientRect());
    if (this.flag_shift) {
      selection_rect.union(focus_element.getBoundingClientRect());
      if (this.flag_ctrl) {
        for (let index in child_rect_list) {
          const child_rect = child_rect_list[index];
          if (this.selection[index]) {
            selection_rect.union(child_rect);
          }
        }
      }
    }
    
    this.focus = focus_index;
    this.keyboard_selection = child_rect_list.map((rect, index) => (event.ctrlKey && this.selection[index]) || selection_rect.intersectsRect(rect));
    return this;
  }
  
  public getScrollSpeed(point: number, scroll: number, edge_min: number, edge_max: number, scroll_max: number) {
    if (point < edge_min && scroll > 0) {
      return this.scroll_speed / this.scroll_rate * Math.tanh(point / 100);
    }
    
    if (point > edge_max && scroll < scroll_max) {
      return this.scroll_speed / this.scroll_rate * Math.tanh((point - edge_max) / 100);
    }
    
    return 0;
  }
  
  public getFocus() {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    const {scrollLeft, scrollTop, clientLeft, clientTop} = this.ref_container.current;
    const {left, top} = this.ref_container.current.getBoundingClientRect();
    const point = Point.translateByCoords(this.mouse_origin, left + clientLeft - scrollLeft, top + clientTop - scrollTop);
    
    let focus_distance = Infinity;
    let focus_index = this.focus;
    for (let index in this.element_list) {
      const child = this.element_list[index];
      const rect = Rect.fromSimpleRect(child.getBoundingClientRect());
      if (rect.containsPoint(point)) {
        const distance = point.getDistanceToPoint(rect.getCenterPoint());
        if (distance < focus_distance) {
          focus_distance = distance;
          focus_index = +index;
        }
      }
    }
    
    return focus_index;
  }
  
  private getElementList() {
    const result = [] as HTMLElement[];
    
    for (let element of this.ref_container.current?.children ?? []) {
      if (element instanceof HTMLElement && element !== this.ref_indicator.current) {
        result.push(element);
      }
    }
    
    return result;
  }
  
  private getPointInsideContainer(x: number, y: number) {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    const {offsetLeft, offsetTop, clientLeft, clientTop, scrollLeft, scrollTop, scrollWidth, scrollHeight} = this.ref_container.current;
    return new Point(x, y)
    .translateByCoords(-offsetLeft, -offsetTop) // Translate relative to element position in the dom
    .translateByCoords(-clientLeft, -clientTop) // Translate relative to border of the element
    .translateByCoords(scrollLeft, scrollTop)   // Translate relative to the scroll position of the element
    .clampX(0, scrollWidth)                     // Ensure point doesn't leave the element horizontally
    .clampY(0, scrollHeight);                   // Ensure point doesn't leave the element vertically
  }
  
  private getSelection() {
    if (!this.ref_container.current) throw new Error("Reference container element does not exist.");
    
    const {offsetLeft, clientLeft, offsetTop, clientTop, scrollLeft, scrollTop} = this.ref_container.current;
    const rect = Rect.fromPoints(this.mouse_origin, this.mouse_point).translateByCoords(offsetLeft + clientLeft - scrollLeft, offsetTop + clientTop - scrollTop);
    
    if (this.flag_shift) {
      for (let index in this.element_list) {
        if (this.selection[index]) {
          rect.union(this.element_list[index].getBoundingClientRect());
        }
      }
    }
    
    return this.element_list.map((child, index) => {
      const select = this.selection[index];
      const hover = !!child && rect.intersectsRect(child.getBoundingClientRect());
      
      // |-------------------------------------------|
      // | Select  | Hover | Ctrl  | Shift | Result  | (select && !hover && ctrl) ||
      // |---------------------------------|---------| (select && !hover && shift) ||
      // |    F    |   F   |   F   |   F   |    F    | (!select && hover && !shift) ||
      // |    F    |   F   |   F   |   T   |    F    | (hover && !ctrl)
      // |    F    |   F   |   T   |   F   |    F    |
      // |    F    |   F   |   T   |   T   |    F    |
      // |    F    |   T   |   F   |   F   |    T    |
      // |    F    |   T   |   F   |   T   |    T    |
      // |    F    |   T   |   T   |   F   |    T    |
      // |    F    |   T   |   T   |   T   |    F    |
      // |    T    |   F   |   F   |   F   |    F    |
      // |    T    |   F   |   F   |   T   |    T    |
      // |    T    |   F   |   T   |   F   |    T    |
      // |    T    |   F   |   T   |   T   |    T    |
      // |    T    |   T   |   F   |   F   |    T    |
      // |    T    |   T   |   F   |   T   |    T    |
      // |    T    |   T   |   T   |   F   |    F    |
      // |    T    |   T   |   T   |   T   |    F    |
      // |-------------------------------------------|
      return select && !hover && this.flag_ctrl && !this.flag_shift
        || select && !this.flag_ctrl && this.flag_shift
        || !select && hover && !this.flag_shift
        || hover && !this.flag_ctrl;
    });
  }
}

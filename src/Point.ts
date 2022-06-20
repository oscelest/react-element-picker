import Rect from "./Rect";

export default class Point {

  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public translateX(x: number) {
    this.x += x;
    return this;
  }

  public translateY(y: number) {
    this.y += y;
    return this;
  }

  public translateByCoords(x: number, y: number) {
    this.translateX(x);
    this.translateY(y);
    return this;
  }

  public translateByPoint(point: Point) {
    this.translateByCoords(point.x, point.y);
    return this;
  }

  public clampX(min: number, max: number) {
    this.x = Math.min(max, Math.max(min, this.x));
    return this;
  }

  public clampY(min: number, max: number) {
    this.y = Math.min(max, Math.max(min, this.y));
    return this;
  }

  public clampByRect(rect: Rect) {
    this.clampX(rect.x, rect.x + rect.width);
    this.clampY(rect.x, rect.x + rect.width);
    return this;
  }

  public distanceToPoint(point: Point) {
    return Math.sqrt(Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2));
  }

  public confineToElement({scrollTop, scrollLeft, clientTop, clientLeft, offsetLeft, offsetTop, scrollWidth, scrollHeight}: HTMLElement) {
    return this.translateByCoords(-offsetLeft + scrollLeft - clientLeft, -offsetTop + scrollTop - clientTop).clampX(0, scrollWidth).clampY(0, scrollHeight);
  }

  public static fromEventPage({pageX, pageY}: {pageX: number, pageY: number}) {
    return new Point(pageX, pageY);
  }

}

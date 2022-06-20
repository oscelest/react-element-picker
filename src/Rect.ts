import Point from "./Point";

export default class Rect {

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = width < 0 ? x + width : x;
    this.y = height < 0 ? y + height : y;
    this.width = Math.abs(width);
    this.height = Math.abs(height);
  }

  public clone() {
    return new Rect(this.x, this.y, this.width, this.height);
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
  }

  public translateByPoint(point: Point) {
    this.translateByCoords(point.x, point.y);
  }

  public intersectsRect(target: Rect) {
    return this.x < target.x + target.width && this.x + this.width > target.x && this.y < target.y + target.height && this.y + this.height > target.y;
  }

  public union(...rect_list: (Rect | DOMRect)[]) {
    for (let i = 0; i < rect_list.length; i++) {
      const rect = rect_list.at(i);
      if (!rect) continue;

      const x1 = Math.min(this.x, rect.x);
      const x2 = Math.max(this.x + this.width, rect.x + rect.width);
      const y1 = Math.min(this.y, rect.y);
      const y2 = Math.max(this.y + this.height, rect.y + rect.height);

      this.x = x1;
      this.y = y1;
      this.width = x2 - x1;
      this.height = y2 - y1;
    }
    return this;
  }

  public static union(...rect_list: (Rect | DOMRect)[]) {
    if (rect_list.length < 1) throw new Error("Cannot create union of Rects from empty list.");

    const x1 = Math.min(...rect_list.map(v => v.x));
    const y1 = Math.min(...rect_list.map(v => v.y));
    const x2 = Math.max(...rect_list.map(v => v.x + v.width));
    const y2 = Math.max(...rect_list.map(v => v.y + v.height));

    return new Rect(x1, y1, x2 - x1, y2 - y1);
  }

  public static fromPoints(point_1: Point, point_2: Point) {
    const x1 = Math.min(point_1.x, point_2.x);
    const x2 = Math.max(point_1.x, point_2.x);
    const y1 = Math.min(point_1.y, point_2.y);
    const y2 = Math.max(point_1.y, point_2.y);
    return new Rect(x1, y1, x2 - x1, y2 - y1);
  }

  public static containsPoint(rect: Rect | DOMRect, point: Point) {
    return rect.x <= point.x && point.x <= rect.x + rect.width && rect.y <= point.y && point.y <= rect.y + rect.height;
  }


}

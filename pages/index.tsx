import type {NextPage} from "next";
import ElementPicker from "../src/ElementPicker";
import Style from "./index.module.scss";
import Rect from "../src/Rect";
import {useState} from "react";

const IndexPage: NextPage = () => {

  const [element_list, setElementList] = useState<Array<undefined>>(Array(5).fill(undefined));
  const [hovered, setHovered] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [focused, setFocused] = useState<number | undefined>(undefined);

  function onSelect(values: boolean[], rect: Rect, event: MouseEvent) {
    setSelected(values);
  }

  function onHover(values: boolean[], rect: Rect, event: MouseEvent) {
    setHovered(values);
  }

  function onClick(value: number | undefined, rect: Rect, event: MouseEvent) {
    setFocused(value);
  }

  return (
    <ElementPicker onSelect={onSelect} onHover={onHover} onClick={onClick}>
      {element_list.map((value, index) => {
        const className = [Style.Large];
        if (focused === index) className.push(Style.Focused);
        if (selected[index]) {
          className.push(Style.Selected);
        }
        else if (hovered[index]) {
          className.push(Style.Hovered);
        }
        return (
          <div className={className.join(" ")} key={index}>{index}</div>
        );
      })}
    </ElementPicker>
  );
};

export default IndexPage;

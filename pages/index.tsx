import type {NextPage} from "next";
import Style from "./index.module.scss";
import {useState} from "react";
import {Rect} from "@noxy/geometry";
import {ElementPicker} from "../src";

const IndexPage: NextPage = () => {

  const [element_list, setElementList] = useState<Array<undefined>>(Array(5).fill(undefined));
  const [hovered, setHovered] = useState<boolean[]>();
  const [selected, setSelected] = useState<boolean[]>();
  const [focused, setFocused] = useState<number[]>();

  function onCommit(values: boolean[], rect?: Rect) {
    setSelected(values);
  }

  function onHover(values?: boolean[], rect?: Rect) {
    setHovered(values);
    // console.log("Hover", values);
  }

  function onClick(value?: number[], rect?: Rect) {
    setFocused(value);
  }

  return (
    <ElementPicker className={Style.ElementPicker} selection={selected} onCommit={onCommit} onHover={onHover} onClick={onClick}>
      {element_list.map((value, index) => {
        const className = [Style.Large];
        if (selected?.[index] && !hovered?.[index]) {
          className.push(Style.Deselected);
        }
        else {
          if (selected?.[index]) {
            className.push(Style.Selected);
          }
          if (hovered?.[index]) {
            className.push(Style.Hovered);
          }
        }

        return (
          <div className={className.join(" ")} key={index}>{index}</div>
        );
      })}
    </ElementPicker>
  );
};

export default IndexPage;

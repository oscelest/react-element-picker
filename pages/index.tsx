import type {NextPage} from "next";
import {useState} from "react";
import {ElementPicker} from "../src";
import Style from "./index.module.scss";

const IndexPage: NextPage = () => {
  const element_list = Array(5).fill(undefined);
  const [focus, setFocus] = useState<number>(0);
  const [hovered, setHovered] = useState<boolean[]>();
  const [selected, setSelected] = useState<boolean[]>([]);

  function onCommit(values: boolean[], focus: number) {
    setFocus(focus);
    setSelected(values);
  }

  function onHover(values?: boolean[]) {
    setHovered(values);
  }

  return (
    <ElementPicker className={Style.ElementPicker} focus={focus} selection={selected} onCommit={onCommit} onHover={onHover}>
      {element_list.map((value, index) => {
        const className = [Style.Large];
        if (focus === index) {
          className.push(Style.Focused);
        }
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

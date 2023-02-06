# react-element-picker

## Introduction

`react-element-picker` is a [React](https://reactjs.org/) functional component which acts as a container,
allowing contained elements to be selected in an OS explorer style way.
The component supports mouse drag-select and keyboard selection,
using ctrl and shift modifiers to change how selection works.

## Installation

To install run the following command:

```shell
npm install @noxy/react-element-picker@latest
```

Typescript types are already available in the library so no need to get external types.

## Usage

The following is an example of how to use the component:

```typescript jsx
import React, {HTMLProps, useState} from "react";
import {ElementPicker} from "@noxy/react-element-picker";

function TestComponent(props: HTMLProps<HTMLDivElement>) {
  
  return (
    <ElementPicker>
      <div>Hello World</div>
      <div>Another element</div>
      <div>A third element</div>
    </ElementPicker>
  );
}
```

## Properties

The `ElementPicker` component inherits all HTMLDivElement properties and applies them directly to the outermost element.
This includes the className property for those using CSS modules.

clickThreshold?: number;
scrollSpeed?: number;
focus: number;
selection: boolean[];
onHover?(values?: boolean[]): void;
onCommit(values: boolean[], focus: number): void;

### clickThreshold: number

Determines how many pixels the cursor needs to be dragged after a mousedown event to turn it into a click from a drag.

**Default value**: `8`

### scrollSpeed: number

The speed coefficient for scrolling the window once the cursor leaves the container while a drag select is in progress.

**Default value**: `2500`

### focus: number

The currently focused element from which a keyboard selection event will start from.

**Default value**: `0`

### selection: boolean[]

The elements currently selected inside the container based on index of the element inside the container.

**Default value**: `200`

### onHover(values: null | boolean[]): void;

An event fired whenever a drag select hovers over an element, returning a temporary array of hovered elements.
If no elements are hovered this value will be null.

**Default value**: `undefined`

### onCommit(values: boolean[], focus: number): void;

An event fired whenever a drag selection event or keyboard selection event is completed,
returning the list of elements selected based on index inside the container.

## Styling

The following are a list of properties which are designated as important.
To preserve component functionality, these should not be changed.
If you do need to change them however, please be advised that the component might stop working as intended.

```css
.element-picker {
  user-select: none !important;
  box-sizing:  border-box !important;
}

.element-picker-rect {
  position:   absolute !important;
  box-sizing: border-box !important;
}

```

## Notice

This is currently not in a v1.0.0 release. Undocumented breaking changes might happen between versions.

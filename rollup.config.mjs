import Resolve from "@rollup/plugin-node-resolve";
import CommonJS from "@rollup/plugin-commonjs";
import TypeScript from "@rollup/plugin-typescript";
import PostCSS from "rollup-plugin-postcss";
import DTS from "rollup-plugin-dts";
import Terser from "@rollup/plugin-terser";
import PeerDepsExternal from "rollup-plugin-peer-deps-external";
import Package from "./package.json" assert {type: "json"};

export default [
  {
    input:   "src/index.ts",
    output:  [
      {
        file:      "dist/cjs/index.js",
        format:    "cjs",
      },
      {
        file:      "dist/esm/index.js",
        format:    "esm",
      },
      {
        name:      Package.name.replace(/^@noxy\//, ""),
        file:      "dist/umd/index.js",
        format:    "umd",
        globals:   {
          "react": "React",
        },
      },
    ],
    plugins: [
      PeerDepsExternal(), // Ensure peer-dependencies are not included in the bundle.
      Resolve(),          // Resolve external libraries and adds them to the bundle.
      CommonJS(),
      TypeScript({tsconfig: "./tsconfig.build.json"}),
      PostCSS(),
      Terser({sourceMap: true}),
    ],
  },
  {
    input:    "dist/esm/index.d.ts",
    output:   [
      {
        file:   "dist/types/index.d.ts",
        format: "esm",
      },
    ],
    plugins:  [
      DTS(),
    ],
    external: [
      /\.css$/,
    ],
  },
];

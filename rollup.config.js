import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import dts from "rollup-plugin-dts";
import {terser} from "rollup-plugin-terser";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

const pkg = require("./package.json");

export default [
  {
    input:   "src/index.ts",
    output:  [
      {
        file:      pkg.main,
        format:    "cjs",
        sourcemap: true,
      },
      {
        file:      pkg.module,
        format:    "esm",
        sourcemap: true,
      },
      {
        file:      pkg.umd,
        format:    "umd",
        name:      pkg.name.replace(/^@noxy\//, "").split("-").map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(""),
        sourcemap: true,
        globals: {
          "react": "React",
        },
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({tsconfig: "./tsconfig.build.json"}),
      postcss(),
      terser(),
    ],
  },
  {
    input:    "dist/esm/index.d.ts",
    output:   [{file: "dist/types/index.d.ts", format: "esm"}],
    plugins:  [dts()],
    external: [/\.css$/],
  },
];

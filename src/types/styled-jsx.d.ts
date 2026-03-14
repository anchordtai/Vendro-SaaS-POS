declare module "styled-jsx" {
  import * as React from "react";

  interface StyleProps {
    jsx?: boolean;
    global?: boolean;
    children: React.ReactNode;
    id?: string;
  }

  export default function Style(props: StyleProps): JSX.Element;
}


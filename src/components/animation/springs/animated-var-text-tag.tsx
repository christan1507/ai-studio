// 📖 Docs: obsidian/frontend/components/animation-springs.md
import { Tags } from "@/types/springs";
import { animated } from "@react-spring/web";
import {
  createElement,
  CSSProperties,
  ElementType,
  forwardRef,
  ReactNode,
  useImperativeHandle,
  useRef,
} from "react";

export interface VarTextTagProps {
  tag?: Tags;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}
export const AnimatedVarTextTag = forwardRef<HTMLElement, VarTextTagProps>(
  ({ tag = "span", children, className, style, ...props }, outerRef) => {
    const ref = useRef<HTMLElement | null>(null);
    useImperativeHandle(outerRef, () => ref.current as HTMLElement);
    const Tag = animated[tag] as ElementType;

    // `createElement` (vs JSX) avoids TS intersecting children across the
    // `ElementType` union to `never` under React 19's stricter JSX types.
    return createElement(
      Tag,
      { ref, className, style, ...props },
      children,
    );
  },
);
AnimatedVarTextTag.displayName = "AnimatedVarTextTag";

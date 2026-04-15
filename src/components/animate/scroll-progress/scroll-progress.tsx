import { useTheme } from "@/theme/hooks";
import { type HTMLMotionProps, type MotionValue, m, useSpring } from "motion/react";
import type { CSSProperties } from "react";

interface Props extends HTMLMotionProps<"div"> {
	color?: string;
	scrollYProgress: MotionValue<number>;
	height?: number;
}

export function ScrollProgress({ scrollYProgress, height = 4, color, ...other }: Props) {
	const scaleX = useSpring(scrollYProgress, {
		stiffness: 100,
		damping: 30,
		restDelta: 0.001,
	});

	const { themeTokens } = useTheme();

	const backgroundColor = color || themeTokens.color.palette.primary.default;

	const style: CSSProperties = {
		transformOrigin: "0%",
		height,
		backgroundColor,
	};

	return <m.div style={{ scaleX, ...style }} {...other} />;
}

import type { MotionValue } from "motion/react";
import { useScroll } from "motion/react";
import { useMemo, useRef } from "react";


export type UseScrollProgressReturn = {
	scrollXProgress: MotionValue<number>;
	scrollYProgress: MotionValue<number>;
	elementRef: React.RefObject<HTMLDivElement | null>;
};


export type UseScrollProgress = "document" | "container";


export function useScrollProgress(target: UseScrollProgress = "document"): UseScrollProgressReturn {
	const elementRef = useRef<HTMLDivElement>(null);

	const options = { container: elementRef };

	const { scrollYProgress, scrollXProgress } = useScroll(target === "container" ? options : undefined);

	const memoizedValue = useMemo(
		() => ({ elementRef, scrollXProgress, scrollYProgress }),
		[scrollXProgress, scrollYProgress],
	);

	return memoizedValue;
}

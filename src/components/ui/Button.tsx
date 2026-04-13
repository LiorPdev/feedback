"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "outline" | "outline-brand" | "ghost";
type ButtonSize = "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      children,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : "",
      isLoading ? styles.loading : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <motion.button
        ref={ref}
        className={classNames}
        disabled={disabled || isLoading}
        whileHover={!disabled && !isLoading ? { scale: 1.01 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
        {...props}
      >
        {isLoading && <span className={styles.spinner} />}

        {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}

        {children}

        {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;

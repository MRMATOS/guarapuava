import React from "react";

type KeyProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Tecla travada/afundada (filtro ativo). Use `aria-current="page"` para navegação. */
  pressed?: boolean;
  /** `icon` reduz o respiro lateral para teclas só com ícone. */
  variant?: "label" | "icon";
};

/**
 * Tecla — o único botão do sistema "Painel de Rádio".
 * Alto-relevo em repouso, afunda ao toque e permanece afundada quando `pressed`.
 * Ver DESIGN.md › Components › Buttons.
 */
export const Key = React.forwardRef<HTMLButtonElement, KeyProps>(
  (
    {
      pressed,
      variant = "label",
      className = "",
      type = "button",
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={`key ${variant === "icon" ? "key--icon" : ""} ${className}`.trim()}
      {...rest}
    />
  )
);
Key.displayName = "Key";

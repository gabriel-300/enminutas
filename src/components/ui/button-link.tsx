import Link from "next/link";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./button-styles";

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Link de Next con la piel de un Button (navegar en vez de ejecutar una acción). */
export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonStyles(variant, size, className)} {...props} />;
}

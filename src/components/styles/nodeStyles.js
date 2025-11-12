import { colors } from "./colors";

// Nodo compacto, mismo tamaño que los botones
export const baseNodeStyle = {
  backgroundColor: colors.starBlue,
  color: colors.coldWhite,
  width: 120, // ancho igual al botón
  height: 40, // altura igual al botón
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  fontSize: 12,
  padding: 0, // sin padding para mantener tamaño
};

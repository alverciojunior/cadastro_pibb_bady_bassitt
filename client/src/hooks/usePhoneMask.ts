/**
 * Hook para aplicar máscara de telefone no formato (XX) XXXXX-XXXX
 * Aceita apenas números e formata automaticamente
 */
export function usePhoneMask() {
  const formatPhone = (value: string): string => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, "");

    // Limita a 11 dígitos (padrão brasileiro)
    const limited = cleaned.slice(0, 11);

    // Aplica a máscara
    if (limited.length === 0) return "";
    if (limited.length <= 2) return `(${limited}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const unformatPhone = (value: string): string => {
    // Remove tudo que não é número
    return value.replace(/\D/g, "");
  };

  return { formatPhone, unformatPhone };
}

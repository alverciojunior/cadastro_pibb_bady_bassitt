/**
 * Hook para aplicar máscara de CPF no formato XXX.XXX.XXX-XX
 * Inclui validação do dígito verificador (algoritmo do CPF)
 */
export function useCPFMask() {
  /**
   * Calcula o dígito verificador do CPF
   */
  const calculateCheckDigit = (cpfArray: number[]): number => {
    let sum = 0;
    let multiplier = cpfArray.length + 1;

    for (let i = 0; i < cpfArray.length; i++) {
      sum += cpfArray[i] * multiplier;
      multiplier--;
    }

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  /**
   * Valida se o CPF é válido (verifica dígitos verificadores)
   */
  const isValidCPF = (cpf: string): boolean => {
    // Remove caracteres não numéricos
    const cleaned = cpf.replace(/\D/g, "");

    // CPF deve ter exatamente 11 dígitos
    if (cleaned.length !== 11) return false;

    // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    // Converte para array de números
    const cpfArray = cleaned.split("").map(Number);

    // Valida primeiro dígito verificador
    const firstDigit = calculateCheckDigit(cpfArray.slice(0, 9));
    if (cpfArray[9] !== firstDigit) return false;

    // Valida segundo dígito verificador
    const secondDigit = calculateCheckDigit(cpfArray.slice(0, 10));
    if (cpfArray[10] !== secondDigit) return false;

    return true;
  };

  /**
   * Formata o CPF com máscara XXX.XXX.XXX-XX
   */
  const formatCPF = (value: string): string => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, "");

    // Limita a 11 dígitos
    const limited = cleaned.slice(0, 11);

    // Aplica a máscara
    if (limited.length === 0) return "";
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  /**
   * Remove a máscara do CPF
   */
  const unformatCPF = (value: string): string => {
    return value.replace(/\D/g, "");
  };

  return { formatCPF, unformatCPF, isValidCPF };
}

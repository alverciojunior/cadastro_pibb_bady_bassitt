/**
 * Hook para aplicar máscara de data no formato DD/MM/YYYY
 * Inclui validação de data válida
 */
export function useDateMask() {
  /**
   * Valida se a data é válida
   */
  const isValidDate = (day: number, month: number, year: number): boolean => {
    // Valida mês
    if (month < 1 || month > 12) return false;

    // Valida dia
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Verifica ano bissexto
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
      daysInMonth[1] = 29;
    }

    if (day < 1 || day > daysInMonth[month - 1]) return false;

    // Valida ano (entre 1900 e ano atual + 1)
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) return false;

    return true;
  };

  /**
   * Formata a data com máscara DD/MM/YYYY
   */
  const formatDate = (value: string): string => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, "");

    // Limita a 8 dígitos
    const limited = cleaned.slice(0, 8);

    // Aplica a máscara
    if (limited.length === 0) return "";
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  };

  /**
   * Converte formato DD/MM/YYYY para YYYY-MM-DD (para input type="date")
   */
  const dateToInput = (dateString: string): string => {
    if (!dateString || dateString.length !== 10) return "";

    const parts = dateString.split("/");
    if (parts.length !== 3) return "";

    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    return `${year}-${month}-${day}`;
  };

  /**
   * Converte formato YYYY-MM-DD para DD/MM/YYYY
   */
  const inputToDate = (inputString: string): string => {
    if (!inputString || inputString.length !== 10) return "";

    const parts = inputString.split("-");
    if (parts.length !== 3) return "";

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    return `${day}/${month}/${year}`;
  };

  /**
   * Remove a máscara da data
   */
  const unformatDate = (value: string): string => {
    return value.replace(/\D/g, "");
  };

  /**
   * Valida data formatada DD/MM/YYYY
   */
  const isValidFormattedDate = (dateString: string): boolean => {
    if (!dateString || dateString.length !== 10) return false;

    const parts = dateString.split("/");
    if (parts.length !== 3) return false;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    return isValidDate(day, month, year);
  };

  return {
    formatDate,
    dateToInput,
    inputToDate,
    unformatDate,
    isValidDate,
    isValidFormattedDate,
  };
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Mapa de cabeçalhos em português para campos técnicos
const headerMap: Record<string, string> = {
  "Nome Completo": "fullName",
  "Data de Nascimento": "birthDate",
  "Gênero": "gender",
  "Estado Civil": "maritalStatus",
  "CPF": "cpf",
  "Telefone": "phone",
  "WhatsApp": "whatsapp",
  "Email": "email",
  "Rua": "street",
  "Número": "number",
  "Complemento": "complement",
  "Bairro": "neighborhood",
  "Cidade": "city",
  "Estado": "state",
  "CEP": "zipCode",
  "Congregação": "congregation",
  "Ministério": "ministry",
  "Batizado": "isBaptized",
  "Data do Batismo": "baptismDate",
  "Dizimista": "isTither",
  "Frequência": "attendanceFrequency",
  "Tipo de Membro": "memberType",
};

function parseCSV(text: string) {
  const lines = text.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // Parser robusto para CSV com aspas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));

    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index];
      const fieldName = headerMap[header] || header;

      // Converter valores booleanos
      if (value === "Sim") row[fieldName] = true;
      else if (value === "Não") row[fieldName] = false;
      else if (value) row[fieldName] = value;
    });

    data.push(row);
  }

  return data;
}

export default function Importacao() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateData = trpc.import.validateImportData.useQuery(
    { data: csvData },
    { enabled: false }
  );

  const importMembers = trpc.import.importMembers.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      setCsvData(data);
      toast.success(`${data.length} linhas lidas do arquivo`);
    } catch (error) {
      toast.error("Erro ao ler arquivo");
      console.error(error);
    }
  };

  const handleValidate = async () => {
    if (csvData.length === 0) {
      toast.error("Nenhum dado para validar");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await validateData.refetch();
      if (result.data) {
        setValidationResult(result.data);
      }
    } catch (error) {
      toast.error("Erro ao validar dados");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (csvData.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await importMembers.mutateAsync({
        data: csvData,
        skipDuplicates: true,
      });

      setImportResult(result);
      toast.success(
        `Importação concluída: ${result.imported} importados, ${result.skipped} ignorados`
      );
    } catch (error) {
      toast.error("Erro ao importar dados");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCsvData([]);
    setValidationResult(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="h-8 w-8" />
          Importar Membros
        </h1>
        <p className="text-muted-foreground mt-2">
          Importe membros em massa a partir de um arquivo CSV
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Arquivo CSV</Label>
            <input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50"
            />
          </div>

          {selectedFile && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-semibold">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O arquivo deve conter as colunas: Nome Completo, Email, Telefone, CPF, etc. Consulte o modelo de importação para mais detalhes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {csvData.length > 0 && !importResult && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Prévia dos Dados ({csvData.length} linhas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Congregação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.fullName || "—"}</TableCell>
                        <TableCell>{row.email || "—"}</TableCell>
                        <TableCell>{row.phone || "—"}</TableCell>
                        <TableCell>{row.cpf || "—"}</TableCell>
                        <TableCell>{row.congregation || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {csvData.length > 5 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ... e mais {csvData.length - 5} linhas
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={handleValidate}
              disabled={isProcessing}
              variant="outline"
            >
              Validar Dados
            </Button>
            <Button
              onClick={handleImport}
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importando..." : "Importar Membros"}
            </Button>
            <Button
              onClick={handleReset}
              disabled={isProcessing}
              variant="ghost"
            >
              Limpar
            </Button>
          </div>
        </>
      )}

      {validationResult && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.invalid === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Validação Concluída
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Validação com Erros
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">Linhas válidas</p>
                <p className="text-2xl font-bold text-green-600">{validationResult.valid}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">Linhas com erro</p>
                <p className="text-2xl font-bold text-red-600">{validationResult.invalid}</p>
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Erros encontrados:</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {validationResult.errors.slice(0, 10).map((error: any, idx: number) => (
                    <div key={idx} className="bg-red-50 p-2 rounded-md text-sm">
                      <p className="font-semibold text-red-700">Linha {error.row}</p>
                      <p className="text-red-600">{error.error}</p>
                    </div>
                  ))}
                </div>
                {validationResult.errors.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    ... e mais {validationResult.errors.length - 10} erros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.errors.length === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Importação Concluída com Sucesso
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Importação Concluída com Erros
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">Importados</p>
                <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">Ignorados</p>
                <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Erros durante importação:</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {importResult.errors.slice(0, 10).map((error: any, idx: number) => (
                    <div key={idx} className="bg-red-50 p-2 rounded-md text-sm">
                      <p className="font-semibold text-red-700">Linha {error.row}</p>
                      <p className="text-red-600">{error.error}</p>
                    </div>
                  ))}
                </div>
                {importResult.errors.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    ... e mais {importResult.errors.length - 10} erros
                  </p>
                )}
              </div>
            )}

            <Button onClick={handleReset} className="w-full">
              Importar Outro Arquivo
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Formato do Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold mb-1">Colunas obrigatórias:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Nome Completo</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Colunas opcionais:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Email</li>
              <li>Telefone</li>
              <li>WhatsApp</li>
              <li>CPF</li>
              <li>Data de Nascimento (formato: DD/MM/YYYY)</li>
              <li>Gênero (masculino/feminino/outro)</li>
              <li>Congregação</li>
              <li>Ministério</li>
              <li>Batizado (Sim/Não)</li>
              <li>Dizimista (sim/nao/ocasional)</li>
              <li>Frequência (sempre/quase_sempre/as_vezes/raramente/nunca)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

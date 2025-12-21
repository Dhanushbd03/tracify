"use client";

import { Upload, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type CsvUploadButtonProps = {
  onUpload: (data: any[], accountId: string) => void;
  accounts: Array<{ id: string; name: string }>;
};

const CsvUploadButton = ({ onUpload, accounts }: CsvUploadButtonProps) => {
  const file_input_ref = useRef<HTMLInputElement>(null);
  const [is_dialog_open, setIsDialogOpen] = useState(false);
  const [selected_account_id, setSelectedAccountId] = useState<string>("");
  const [csv_data, setCsvData] = useState<any[]>([]);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [upload_errors, setUploadErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [is_uploading, setIsUploading] = useState(false);
  const [selected_file_name, setSelectedFileName] = useState<string>("");

  const parse_csv = (csv_text: string): any[] => {
    const lines = csv_text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return [];

    const parse_line = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let in_quotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next_char = line[i + 1];

        if (char === '"') {
          if (in_quotes && next_char === '"') {
            current += '"';
            i++;
          } else {
            in_quotes = !in_quotes;
          }
        } else if (char === "," && !in_quotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parse_line(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ""));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parse_line(lines[i]).map((v) => v.replace(/^"|"$/g, ""));
      if (values.length === 0 || values.every((v) => !v)) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  };

  const handle_file_change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvData([]);
      setSelectedFileName("");
      return;
    }

    if (!file.name.endsWith(".csv")) {
      setUploadError("Please select a CSV file");
      return;
    }

    setSelectedFileName(file.name);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parse_csv(text);
        if (parsed.length === 0) {
          setUploadError("CSV file appears to be empty or invalid");
          setCsvData([]);
        } else {
          setCsvData(parsed);
          setUploadError(null);
        }
      } catch (error) {
        setUploadError("Error parsing CSV file. Please check the format.");
        setCsvData([]);
      }
    };
    reader.onerror = () => {
      setUploadError("Error reading file");
      setCsvData([]);
    };
    reader.readAsText(file);
  };

  const handle_submit = async () => {
    if (!selected_account_id) {
      setUploadError("Please select an account");
      setUploadErrors([]);
      return;
    }

    if (!csv_data || csv_data.length === 0) {
      setUploadError("Please upload a CSV file");
      setUploadErrors([]);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadErrors([]);

    try {
      await onUpload(csv_data, selected_account_id);
      setIsDialogOpen(false);
      setSelectedAccountId("");
      setCsvData([]);
      setUploadError(null);
      setUploadErrors([]);
    } catch (error: any) {
      const error_message = error?.error_message || error?.message || "Failed to import transactions";
      setUploadError(error_message);
      
      if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        setUploadErrors(error.errors);
      } else if (error_message.includes("Row")) {
        const error_lines = error_message.split("\n").filter((line: string) => line.trim().startsWith("Row"));
        const parsed_errors = error_lines.map((line: string) => {
          const match = line.match(/Row (\d+): (.+)/);
          if (match) {
            return { row: parseInt(match[1]), error: match[2] };
          }
          return null;
        }).filter((e: { row: number; error: string } | null): e is { row: number; error: string } => e !== null);
        setUploadErrors(parsed_errors);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={is_dialog_open}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSelectedAccountId("");
          setCsvData([]);
          setUploadError(null);
          setUploadErrors([]);
          setSelectedFileName("");
          if (file_input_ref.current) {
            file_input_ref.current.value = "";
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="size-4 mr-2" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Select an account and upload a CSV file to import transactions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {upload_error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{upload_error.split("\n")[0]}</span>
              </div>
              {upload_errors.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-destructive/20 rounded-md p-3 bg-destructive/5">
                  <p className="text-xs font-medium text-destructive mb-2">Row Errors:</p>
                  <ul className="space-y-1 text-xs">
                    {upload_errors.map((err, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        <span className="font-medium">Row {err.row}:</span> {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="import_account">Account *</Label>
            <select
              id="import_account"
              value={selected_account_id}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setUploadError(null);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              required
            >
              <option value="">Select an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="csv_file">CSV File *</Label>
            <div className="flex flex-col gap-2">
              <input
                ref={file_input_ref}
                type="file"
                id="csv_file"
                accept=".csv"
                onChange={handle_file_change}
                className="hidden"
              />
              <div
                onClick={() => file_input_ref.current?.click()}
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV files only (date, debit, credit, description)
                  </p>
                </div>
              </div>
              {selected_file_name && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selected_file_name}
                  {csv_data.length > 0 && ` (${csv_data.length} rows)`}
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={is_uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handle_submit}
            disabled={is_uploading || !selected_account_id || csv_data.length === 0}
          >
            {is_uploading ? "Importing..." : "Import Transactions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvUploadButton;

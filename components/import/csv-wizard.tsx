"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CsvDropzone } from "./csv-dropzone";
import { Button } from "@/components/ui/button"; // Assuming path
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose, // Add DialogClose import
} from "@/components/ui/dialog"; // Assuming path
import type { ParseResult } from "papaparse"; // Removed ParseError type, use generic Error
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Info } from "lucide-react"; // Added icons
import { parse as parseDate, isValid as isDateValid } from "date-fns"; // Import date-fns functions
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
// TODO: Add Stepper component if available or implement basic step logic
// TODO: Import types from lib/csv.ts (e.g., ClientCsvRow)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ClientCsvRow, InvoiceCsvRow, InvoiceItemCsvRow } from "@/lib/csv"; // Re-add disable comment

type ImportType = "clients" | "invoices"; // Define import type options
type ImportStep = "upload" | "mapColumns" | "preview" | "import" | "summary";

// Define a union type for the possible row data structures after parsing
// We use 'unknown' initially until we determine the file type (client/invoice)
// and perform mapping.
type ParsedRowData = Record<string, string | undefined>; // Header: value

// Define target columns based on spec (extend for invoices later)
const TARGET_COLUMNS: Record<
  ImportType,
  { required: string[]; optional: string[] }
> = {
  clients: {
    required: ["name", "email"],
    optional: ["phone", "address", "contact_person"],
  },
  invoices: {
    required: [
      "invoice_number", // unique per user
      "client_email", // Must exist or be in same import
      "issue_date", // ISO or MM/DD/YYYY
      "due_date", // ISO or MM/DD/YYYY
      "subtotal", // numeric
      "total", // numeric (computed if missing)
    ],
    optional: [
      "tax", // default 0
      "discount", // default 0
      "status", // enum: draft | sent | paid | overdue
      "notes",
      "payment_terms",
      // Invoice Items (optional, require separate handling/mapping)
      // "item_description",
      // "item_quantity",
      // "item_price",
      // "item_amount",
    ],
  },
};

// Type for the transformed data, keys are DB columns
type TransformedRowData = Record<
  string,
  string | number | boolean | null | undefined
>;

// Type for validation errors: { rowIndex: { dbColumnName: errorMessage } }
type ValidationError = Record<number, Record<string, string>>;

const PREVIEW_ROW_COUNT = 10; // Number of rows to show in preview
const BATCH_SIZE = 500; // Number of rows per API request

interface CsvWizardProps {
  // Props to control dialog open state if triggered externally
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Type for API response
interface ImportApiResponse {
  message: string;
  successCount?: number;
  errorRows?: { rowIndex: number; error: string }[];
  error?: string;
  details?: unknown; // Use unknown instead of any
}

// Helper to check if a value is a valid number (allows decimals)
function isValidNumeric(value: string | number | undefined | null): boolean {
  if (value === null || value === undefined || value === "") return false;
  const num = Number(String(value).replace(/[^\d.-]/g, ""));
  return !isNaN(num);
}

// Helper to parse date string (accepts common formats)
function parseAndValidateDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const formatsToTry = ["yyyy-MM-dd", "MM/dd/yyyy"];
  for (const format of formatsToTry) {
    try {
      const parsed = parseDate(value, format, new Date());
      if (isDateValid(parsed)) {
        return parsed;
      }
    } catch {
      /* Ignore parsing errors for specific formats */
    }
  }
  return null;
}

export function CsvWizard({ open, onOpenChange }: CsvWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [importType, setImportType] = useState<ImportType>("clients"); // State for selected import type
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // Disabled unused state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [parsedData, setParsedData] = useState<ParsedRowData[]>([]); // Disable unused state for now
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<
    Record<string, string | null>
  >({}); // csvHeader -> dbColumn | null
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<TransformedRowData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError>({});
  // Add state for processing/validation before showing preview
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]); // Remove eslint-disable comment
  // TODO: Add state for detailed row-level import errors from API

  const targetColumns = TARGET_COLUMNS[importType];
  const allTargetDbColumns = useMemo(
    () => [...targetColumns.required, ...targetColumns.optional],
    [targetColumns]
  );

  // Memoize the headers for the preview table (only mapped columns)
  const previewTableHeaders = useMemo(() => {
    return Object.entries(columnMappings)
      .filter(([, dbCol]) => dbCol !== null) // Only include mapped columns
      .map(([, dbCol]) => dbCol as string);
  }, [columnMappings]);

  const handleFileAccepted = async (file: File) => {
    setUploadedFile(file);
    setParsedData([]);
    setHeaders([]);
    setParseError(null);
    setIsParsing(true);

    try {
      // Dynamically import papaparse
      const Papa = (await import("papaparse")).default;

      Papa.parse<ParsedRowData>(file, {
        header: true, // Use the first row as headers
        skipEmptyLines: true,
        worker: true, // Use a web worker for performance
        complete: (results: ParseResult<ParsedRowData>) => {
          console.log("Parsing complete:", results);
          if (results.errors.length > 0) {
            console.error("Parsing errors:", results.errors);
            // Show the first error
            setParseError(
              `Error parsing row ${results.errors[0].row}: ${results.errors[0].message}`
            );
            setIsParsing(false);
            return;
          }
          if (!results.data || results.data.length === 0) {
            setParseError(
              "CSV file appears to be empty or could not be parsed correctly."
            );
            setIsParsing(false);
            return;
          }

          setParsedData(results.data);
          // Extract headers from the first row (or meta fields if available)
          const detectedHeaders =
            results.meta.fields || Object.keys(results.data[0] || {});
          setHeaders(detectedHeaders);

          // --- Auto-mapping/Reset ---
          const initialMappings: Record<string, string | null> = {};
          const availableDbCols = [...allTargetDbColumns];
          detectedHeaders.forEach((header) => {
            // Simple heuristic: find case-insensitive match
            const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/gi, ""); // Normalize header
            const match = availableDbCols.find(
              (dbCol) => dbCol.toLowerCase().replace(/_/g, "") === lowerHeader
            );
            if (match) {
              initialMappings[header] = match;
              // Remove matched column to avoid mapping twice
              availableDbCols.splice(availableDbCols.indexOf(match), 1);
            } else {
              initialMappings[header] = null; // Default to unmapped
            }
          });
          setColumnMappings(initialMappings);
          // --- End Auto-mapping ---

          setCurrentStep("mapColumns");
          setIsParsing(false);
        },
        error: (error: Error) => {
          console.error("Parsing error:", error);
          setParseError(`Failed to parse CSV: ${error.message}`);
          setIsParsing(false);
        },
      });
    } catch (error) {
      console.error("Failed to load or run papaparse:", error);
      setParseError("An unexpected error occurred during file parsing.");
      setIsParsing(false);
    }
  };

  const handleMappingChange = (csvHeader: string, dbColumn: string | null) => {
    setColumnMappings((prev) => ({ ...prev, [csvHeader]: dbColumn }));
  };

  const resetWizard = useCallback(() => {
    setCurrentStep("upload");
    setImportType("clients");
    setUploadedFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMappings({});
    setPreviewData([]);
    setValidationErrors({});
    setIsParsing(false);
    setParseError(null);
    setIsProcessingPreview(false);
    setIsImporting(false);
    setProcessedCount(0);
    setTotalToImport(0);
    setSuccessCount(0);
    setImportErrors([]);
  }, []);

  // Check if all required columns for the selected import type are mapped
  const isMappingValid = useMemo(() => {
    const mappedDbColumns = Object.values(columnMappings).filter(Boolean); // Get only non-null mapped columns
    return targetColumns.required.every((reqCol) =>
      mappedDbColumns.includes(reqCol)
    );
  }, [columnMappings, targetColumns.required]);

  const validatePreviewData = useCallback(() => {
    setIsProcessingPreview(true);
    setValidationErrors({}); // Clear previous errors
    const errors: ValidationError = {};
    const dataToPreview = parsedData.slice(0, PREVIEW_ROW_COUNT);
    const transformed: TransformedRowData[] = [];

    // Reverse mapping for easier lookup: dbColumn -> csvHeader
    const dbToCsvMapping: Record<string, string> = {};
    Object.entries(columnMappings).forEach(([csvHeader, dbCol]) => {
      if (dbCol) dbToCsvMapping[dbCol] = csvHeader;
    });

    dataToPreview.forEach((rawRow, rowIndex) => {
      const transformedRow: TransformedRowData = {};
      const errorsForRow: Record<string, string> = {}; // Accumulate errors for this row

      previewTableHeaders.forEach((dbCol) => {
        const csvHeader = dbToCsvMapping[dbCol];
        const value = rawRow[csvHeader];
        transformedRow[dbCol] = value; // Initially store raw value
        let currentError = ""; // Error message for this specific cell

        // --- Basic Validation ---
        // 1. Check Required Fields
        if (
          targetColumns.required.includes(dbCol) &&
          (value === undefined || value === "")
        ) {
          currentError = "Required field is missing";
        }

        if (importType === "clients") {
          // 2a. Check Client Email Format
          if (
            dbCol === "email" &&
            value &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) {
            currentError =
              (currentError ? currentError + "; " : "") +
              "Invalid email format";
          }
        } else if (importType === "invoices") {
          // 2b. Check Invoice Dates
          if ((dbCol === "issue_date" || dbCol === "due_date") && value) {
            const parsed = parseAndValidateDate(value);
            if (!parsed) {
              currentError =
                (currentError ? currentError + "; " : "") +
                `Invalid date (use YYYY-MM-DD or MM/DD/YYYY)`;
            } else {
              // Store validated date as ISO string for potential use later (e.g., display consistency)
              transformedRow[dbCol] = parsed.toISOString().split("T")[0];
            }
          }
          // 2c. Check Invoice Numeric Fields
          const numericFields = ["subtotal", "tax", "discount", "total"];
          if (
            numericFields.includes(dbCol) &&
            value &&
            !isValidNumeric(value)
          ) {
            currentError =
              (currentError ? currentError + "; " : "") +
              "Invalid number format";
          }
        }

        if (currentError) {
          errorsForRow[dbCol] = currentError;
        }
      });

      if (Object.keys(errorsForRow).length > 0) {
        errors[rowIndex] = errorsForRow;
      }
      transformed.push(transformedRow);
    });

    setPreviewData(transformed);
    setValidationErrors(errors);
    setIsProcessingPreview(false);
    // Only move to preview step if validation logic ran
    setCurrentStep("preview");
  }, [
    parsedData,
    columnMappings,
    targetColumns,
    previewTableHeaders,
    importType,
  ]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setProcessedCount(0);
    setTotalToImport(0);
    setSuccessCount(0);
    setImportErrors([]);
    setCurrentStep("import");

    // 1. Transform ALL data based on mapping
    const transformedData: TransformedRowData[] = [];
    const clientValidationErrors: ValidationError = {}; // Keep track of client-side validation fails

    // Reverse mapping for easier lookup
    const dbToCsvMapping: Record<string, string> = {};
    Object.entries(columnMappings).forEach(([csvHeader, dbCol]) => {
      if (dbCol) dbToCsvMapping[dbCol] = csvHeader;
    });

    parsedData.forEach((rawRow, rowIndex) => {
      const transformedRow: TransformedRowData = {};
      let rowIsValid = true;
      const errorsForRow: Record<string, string> = {}; // Accumulate errors for this row

      allTargetDbColumns.forEach((dbCol) => {
        const csvHeader = dbToCsvMapping[dbCol];
        const value = csvHeader ? rawRow[csvHeader] : undefined;
        transformedRow[dbCol] = value; // Store raw value initially
        let validationMsg = "";

        // --- Full Dataset Client-Side Validation ---
        // 1. Check Required Fields
        if (
          targetColumns.required.includes(dbCol) &&
          (value === undefined || value === "")
        ) {
          validationMsg = "Required field is missing";
          rowIsValid = false;
        }

        if (importType === "clients") {
          // 2a. Check Client Email Format
          if (
            dbCol === "email" &&
            value &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) {
            validationMsg =
              (validationMsg ? validationMsg + "; " : "") +
              "Invalid email format";
            rowIsValid = false;
          }
        } else if (importType === "invoices") {
          // 2b. Check Invoice Dates
          if ((dbCol === "issue_date" || dbCol === "due_date") && value) {
            const parsed = parseAndValidateDate(value);
            if (!parsed) {
              validationMsg =
                (validationMsg ? validationMsg + "; " : "") + `Invalid date`;
              rowIsValid = false;
            } else {
              // Use validated & formatted date for the object going to the API
              // Store as full ISO string for server processing
              transformedRow[dbCol] = parsed.toISOString();
            }
          }
          // 2c. Check Invoice Numeric Fields (subtotal, tax, discount, total)
          const numericFields = ["subtotal", "tax", "discount", "total"];
          if (
            numericFields.includes(dbCol) &&
            value &&
            !isValidNumeric(value)
          ) {
            validationMsg =
              (validationMsg ? validationMsg + "; " : "") +
              "Invalid number format";
            rowIsValid = false;
          }
        }

        if (validationMsg) {
          errorsForRow[dbCol] = validationMsg;
        }
      });

      if (rowIsValid) {
        transformedData.push(transformedRow);
      } else {
        clientValidationErrors[rowIndex] = errorsForRow; // Store errors for skipped row
        console.warn(
          `Row ${rowIndex + 1} skipped due to client-side validation errors:`,
          errorsForRow
        );
      }
    });

    setTotalToImport(transformedData.length);
    if (transformedData.length === 0) {
      setImportErrors(["No valid data found to import after validation."]);
      setIsImporting(false);
      setCurrentStep("summary"); // Go to summary to show error
      return;
    }

    // 2. Batch and Send to API
    let currentSuccessCount = 0;
    const accumulatedApiErrors: string[] = [];

    for (let i = 0; i < transformedData.length; i += BATCH_SIZE) {
      const batch = transformedData.slice(i, i + BATCH_SIZE);
      setProcessedCount((prev) => prev + batch.length); // Update progress optimistically

      try {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: importType, rows: batch }),
        });

        const result: ImportApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              `Batch ${i / BATCH_SIZE + 1} failed with status ${
                response.status
              }`
          );
        }

        currentSuccessCount += result.successCount ?? 0; // Add successful count from batch
        // TODO: Handle detailed result.errorRows if the API provides them

        // --- Refresh data on successful import ---
        if (
          result.errorRows?.length === 0 &&
          result.successCount &&
          result.successCount > 0
        ) {
          router.refresh();
        }
        // --- End Refresh ---
      } catch (error) {
        console.error("Import API Error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unknown error occurred during import.";
        accumulatedApiErrors.push(
          `Error processing batch starting at row ${i + 1}: ${errorMessage}`
        );
        // Optional: Stop import on first error, or continue processing other batches
        // break;
      }
      setSuccessCount(currentSuccessCount); // Update total success count
    }

    setImportErrors(accumulatedApiErrors);
    setIsImporting(false);
    setCurrentStep("summary"); // Move to summary step
  }, [
    parsedData,
    columnMappings,
    importType,
    allTargetDbColumns,
    targetColumns,
    router,
  ]);

  const handleNext = useCallback(() => {
    if (currentStep === "mapColumns" && isMappingValid) {
      validatePreviewData();
    } else if (currentStep === "preview") {
      handleImport(); // Trigger the import process
    } else {
      console.log("Unhandled next step or invalid state");
    }
  }, [currentStep, isMappingValid, validatePreviewData, handleImport]);

  const handleBack = useCallback(() => {
    if (currentStep === "mapColumns" || currentStep === "preview") {
      setCurrentStep(currentStep === "preview" ? "mapColumns" : "upload");
      // Clear preview data when going back from preview
      if (currentStep === "preview") {
        setPreviewData([]);
        setValidationErrors({});
      }
    } else {
      // Handle other back steps if needed
    }
  }, [currentStep]);

  const renderStepContent = () => {
    if (isParsing || isProcessingPreview) {
      return (
        <div className="flex justify-center items-center h-full">
          <p>
            {isProcessingPreview ? "Validating preview..." : "Parsing file..."}
          </p>
        </div>
      );
    }
    if (parseError) {
      // Use Alert component for errors
      return (
        <div className="text-destructive p-4 border border-destructive/50 rounded-md">
          <p>Error: {parseError}</p>
          <Button
            variant="link"
            onClick={resetWizard}
            className="p-0 h-auto text-destructive underline"
          >
            Try again
          </Button>
        </div>
      );
    }

    switch (currentStep) {
      case "upload":
        const handleImportTypeChange = (value: ImportType) => {
          setImportType(value);
        };
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-2 block">
                1. What are you importing?
              </Label>
              <RadioGroup
                defaultValue={importType}
                onValueChange={handleImportTypeChange}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Label
                  htmlFor="r-clients"
                  className="flex items-center space-x-2 border rounded-md p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <RadioGroupItem value="clients" id="r-clients" />
                  <span>Clients Only</span>
                </Label>
                <Label
                  htmlFor="r-invoices"
                  className="flex items-center space-x-2 border rounded-md p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <RadioGroupItem value="invoices" id="r-invoices" />
                  <span>Invoices (+ Clients if needed)</span>
                </Label>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-base font-medium mb-2 block">
                2. Upload your file
              </Label>
              <CsvDropzone onFileAccepted={handleFileAccepted} />
            </div>
          </div>
        );
      case "mapColumns":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Map Columns</h3>
              <p className="text-sm text-muted-foreground">
                Map the columns from your CSV file (left) to the corresponding
                database fields (right). Required fields (
                <span className="text-destructive font-semibold">*</span>) must
                be mapped.
              </p>
            </div>
            <div className="border rounded-md max-h-[45vh] overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 px-4 py-2 border-b bg-muted/50 sticky top-0">
                <Label className="font-semibold">CSV Header</Label>
                <div /> {/* Spacer for arrow or icon */}
                <Label className="font-semibold">Database Field</Label>
              </div>
              <div className="divide-y">
                {headers.map((header) => (
                  <div
                    key={header}
                    className="grid grid-cols-[1fr_auto_1fr] gap-x-4 px-4 py-3 items-center"
                  >
                    <Label
                      htmlFor={`map-${header}`}
                      className="font-normal truncate"
                      title={header}
                    >
                      {header}
                    </Label>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={columnMappings[header] || "__IGNORE__"}
                      onValueChange={(value: string) =>
                        handleMappingChange(
                          header,
                          value === "__IGNORE__" ? null : value
                        )
                      }
                    >
                      <SelectTrigger id={`map-${header}`} className="w-full">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__IGNORE__">
                          -- Ignore this column --
                        </SelectItem>
                        {allTargetDbColumns.map((dbCol) => (
                          <SelectItem key={dbCol} value={dbCol}>
                            {dbCol}
                            {targetColumns.required.includes(dbCol) ? " *" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            {!isMappingValid && (
              <p className="text-destructive text-sm font-medium">
                Please map all required fields (*) to continue.
              </p>
            )}
          </div>
        );
      case "preview":
        const totalErrors = Object.keys(validationErrors).length;
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Preview Data</h3>
              <p className="text-sm text-muted-foreground">
                Review the first {PREVIEW_ROW_COUNT} rows of your data with the
                applied mappings. Fix any errors in your original file or adjust
                mappings before importing.
              </p>
            </div>
            {totalErrors > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Validation Errors Found</AlertTitle>
                <AlertDescription>
                  Found {totalErrors} row(s) with errors in the preview. Please
                  review them below.
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[50vh] w-full border rounded-md">
              <Table className="relative">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    {previewTableHeaders.map((header) => (
                      <TableHead key={header}>
                        {header}
                        {targetColumns.required.includes(header) ? " *" : ""}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className={
                        validationErrors[rowIndex] ? "bg-destructive/10" : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {rowIndex + 1}
                      </TableCell>
                      {previewTableHeaders.map((header) => {
                        const cellError = validationErrors[rowIndex]?.[header];
                        return (
                          <TableCell
                            key={header}
                            className={
                              cellError
                                ? "outline outline-1 outline-destructive/50"
                                : ""
                            }
                            title={
                              cellError ? cellError : String(row[header] ?? "")
                            }
                          >
                            <div className="flex items-center gap-1">
                              {cellError ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="destructive"
                                      className="cursor-default"
                                    >
                                      !
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{cellError}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="w-[18px]"></span>
                              )}
                              <span className="truncate block max-w-[200px]">
                                {String(row[header] ?? "")}
                              </span>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        );
      case "import":
        const progressPercentage =
          totalToImport > 0 ? (processedCount / totalToImport) * 100 : 0;
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <h3 className="text-lg font-medium">Importing Data...</h3>
            <Progress value={progressPercentage} className="w-3/4" />
            <p className="text-sm text-muted-foreground">
              Processing row {Math.min(processedCount, totalToImport)} of{" "}
              {totalToImport}... ({successCount} successful so far)
            </p>
            {/* TODO: Could show specific API errors here as they happen */}
          </div>
        );
      case "summary":
        const hasErrors = importErrors.length > 0;
        const skippedClientValidation = parsedData.length - totalToImport; // Calculate skipped rows

        return (
          <div className="space-y-4 flex flex-col items-center text-center">
            {hasErrors ? (
              <XCircle className="h-16 w-16 text-destructive mb-4" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            )}

            <h3 className="text-xl font-semibold">
              Import {hasErrors ? "Completed with Errors" : "Complete"}
            </h3>

            <p className="text-muted-foreground">
              Successfully imported {successCount} out of {totalToImport} valid
              rows processed.
              {skippedClientValidation > 0 &&
                ` (${skippedClientValidation} rows skipped due to missing required fields).`}
            </p>

            {hasErrors && (
              <Alert variant="destructive" className="w-full text-left">
                <AlertTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" /> Errors Encountered
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  {/* TODO: Display detailed row-level errors here if available */}
                </AlertDescription>
              </Alert>
            )}

            {!hasErrors && successCount === 0 && totalToImport === 0 && (
              <p className="text-orange-600">
                (No valid data was found in the file to import)
              </p>
            )}

            <p className="text-sm text-muted-foreground pt-4">
              You can now close this dialog.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) {
          resetWizard();
        }
        onOpenChange?.(isOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Import from CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Importing: {importType} | Step: {currentStep}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 min-h-[300px]">{renderStepContent()}</div>
        <DialogFooter>
          {(currentStep === "mapColumns" || currentStep === "preview") &&
            !isImporting && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          {(currentStep === "upload" || isImporting) && (
            <Button variant="ghost" disabled>
              Back
            </Button>
          )}
          {currentStep === "mapColumns" && (
            <Button
              onClick={handleNext}
              disabled={!isMappingValid || isProcessingPreview}
            >
              {isProcessingPreview ? "Validating..." : "Preview Data"}
            </Button>
          )}
          {currentStep === "preview" && (
            <Button onClick={handleNext} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import Data"}
            </Button>
          )}
          {currentStep === "summary" && (
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

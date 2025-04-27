"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  Table as ReactTable, // Alias Table type import
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  tableInstance?: ReactTable<TData>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [minAmount, setMinAmount] = React.useState<string>("");
  const [maxAmount, setMaxAmount] = React.useState<string>("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    filterFns: {
      arrIncludesSome: (row, columnId, value) => {
        if (!Array.isArray(value) || value.length === 0) return true;
        const rowValue = row.getValue(columnId);
        return value.includes(rowValue);
      },
    },
  });

  // Get columns for filters - Use find to avoid errors if column doesn't exist
  const statusColumn = table.getAllColumns().find((col) => col.id === "status");
  const clientColumn = table
    .getAllColumns()
    .find((col) => col.id === "client_name");
  const amountColumn = table.getAllColumns().find((col) => col.id === "total");
  const invoiceNumberColumn = table
    .getAllColumns()
    .find((col) => col.id === "invoice_number");
  const nameColumn = table.getAllColumns().find((col) => col.id === "name");
  const emailColumn = table.getAllColumns().find((col) => col.id === "email");

  // Get selected values only if the column exists
  const selectedClientValues = new Set(
    (clientColumn?.getFilterValue() as string[]) || []
  );
  const selectedStatusValues = new Set(
    (statusColumn?.getFilterValue() as string[]) || []
  );

  // Apply amount range filter
  const applyAmountFilter = () => {
    if (!amountColumn) return;
    const min = minAmount === "" ? -Infinity : parseFloat(minAmount);
    const max = maxAmount === "" ? Infinity : parseFloat(maxAmount);
    const isValidMin = !isNaN(min);
    const isValidMax = !isNaN(max);

    if (isValidMin && isValidMax) {
      if (min === -Infinity && max === Infinity) {
        amountColumn.setFilterValue(undefined);
      } else {
        amountColumn.setFilterValue([min, max]);
      }
    } else {
      amountColumn.setFilterValue(undefined);
    }
  };

  // Clear amount range filter
  const clearAmountFilter = () => {
    setMinAmount("");
    setMaxAmount("");
    if (amountColumn) {
      amountColumn.setFilterValue(undefined);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2 flex-wrap">
        {/* General Text Filter - Prefers Name, falls back to Email */}
        {(nameColumn || emailColumn) && (
          <Input
            placeholder={
              nameColumn ? "Filter by Name..." : "Filter by Email..."
            }
            value={
              (nameColumn?.getFilterValue() as string) ??
              (emailColumn?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) => {
              const value = event.target.value;
              if (nameColumn) nameColumn.setFilterValue(value);
              else if (emailColumn) emailColumn.setFilterValue(value);
            }}
            className="max-w-xs"
          />
        )}

        {/* Conditionally render Invoice # Filter Input */}
        {invoiceNumberColumn && (
          <Input
            placeholder="Filter by Invoice #..."
            value={(invoiceNumberColumn.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              invoiceNumberColumn.setFilterValue(event.target.value)
            }
            className="max-w-xs"
          />
        )}

        {/* Spacer to push other filters to the right */}
        <div className="flex-grow" />

        {/* Conditionally render Client Filter Dropdown (Original Implementation) */}
        {clientColumn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Client
                {selectedClientValues.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal lg:hidden"
                    >
                      {selectedClientValues.size}
                    </Badge>
                    <div className="hidden space-x-1 lg:flex">
                      {selectedClientValues.size > 2 ? (
                        <Badge
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {selectedClientValues.size} selected
                        </Badge>
                      ) : (
                        Array.from(selectedClientValues).map((val) => (
                          <Badge
                            key={val}
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                          >
                            {val}
                          </Badge>
                        ))
                      )}
                    </div>
                  </>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Client</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedClientValues.size === 0}
                onCheckedChange={(checked) => {
                  if (checked) clientColumn.setFilterValue([]);
                }}
              >
                All Clients
              </DropdownMenuCheckboxItem>
              {Array.from(clientColumn.getFacetedUniqueValues().keys())
                .sort()
                .map((client) => (
                  <DropdownMenuCheckboxItem
                    key={client}
                    checked={selectedClientValues.has(client)}
                    onCheckedChange={(checked) => {
                      const newSelectedValues = new Set(selectedClientValues);
                      if (checked) {
                        newSelectedValues.add(client);
                      } else {
                        newSelectedValues.delete(client);
                      }
                      clientColumn.setFilterValue(
                        Array.from(newSelectedValues)
                      );
                    }}
                  >
                    {client}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Conditionally render Status Filter Dropdown (Original Implementation) */}
        {statusColumn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Status
                {selectedStatusValues.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal lg:hidden"
                    >
                      {selectedStatusValues.size}
                    </Badge>
                    <div className="hidden space-x-1 lg:flex">
                      {selectedStatusValues.size > 2 ? (
                        <Badge
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {selectedStatusValues.size} selected
                        </Badge>
                      ) : (
                        Array.from(selectedStatusValues).map((val) => (
                          <Badge
                            key={val}
                            variant="secondary"
                            className="rounded-sm px-1 font-normal capitalize"
                          >
                            {val}
                          </Badge>
                        ))
                      )}
                    </div>
                  </>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedStatusValues.size === 0}
                onCheckedChange={(checked) => {
                  if (checked) statusColumn.setFilterValue([]);
                }}
              >
                All Statuses
              </DropdownMenuCheckboxItem>
              {Array.from(statusColumn.getFacetedUniqueValues().keys())
                .sort()
                .map((status) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={status}
                      className="capitalize"
                      checked={selectedStatusValues.has(status)}
                      onCheckedChange={(checked) => {
                        const newSelectedValues = new Set(selectedStatusValues);
                        if (checked) {
                          newSelectedValues.add(status);
                        } else {
                          newSelectedValues.delete(status);
                        }
                        statusColumn.setFilterValue(
                          Array.from(newSelectedValues)
                        );
                      }}
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Conditionally render Amount Range Filter (Using Popover) */}
        {amountColumn && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                Amount Range
                {minAmount || maxAmount ? (
                  <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {minAmount
                        ? `${formatCurrency(parseFloat(minAmount))}`
                        : "Min"}{" "}
                      -{" "}
                      {maxAmount
                        ? `${formatCurrency(parseFloat(maxAmount))}`
                        : "Max"}
                    </Badge>
                  </>
                ) : null}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-2" align="end">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min Amount"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-28"
                  step="0.01"
                />
                <Input
                  type="number"
                  placeholder="Max Amount"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-28"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={clearAmountFilter}>
                  Clear
                </Button>
                <Button size="sm" onClick={applyAmountFilter}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Column Visibility Dropdown Placeholder */}
        {/* TODO: Implement DataTableViewOptions component if needed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id.replace(/_/g, " ")} {/* Basic formatting */}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {/* Show selected row count if needed */}
          {/* {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected. */}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

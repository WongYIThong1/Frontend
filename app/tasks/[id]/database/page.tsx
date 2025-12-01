"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, RefreshCw, Terminal, ChevronRight, ChevronDown, Table, Download, CheckSquare, Square, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type DatabaseTable = {
  name: string
  columns: {
    name: string
    type: string
    nullable: boolean
  }[]
}

type DatabaseInfo = {
  name: string
  tables: DatabaseTable[]
}

type DatabaseStructure = {
  databases: DatabaseInfo[]
}

export default function DatabaseViewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const domain = searchParams.get("domain") || ""
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [databaseStructure, setDatabaseStructure] = useState<DatabaseStructure | null>(null)
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set()) // Format: "column_name"
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [isDumping, setIsDumping] = useState(false)
  const [dumpResults, setDumpResults] = useState<Array<Record<string, string>>>([]) // Each row is a record with column values
  const [savedColumns, setSavedColumns] = useState<string[]>([]) // Store columns from dump results
  const consoleEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [dumpResults])

  useEffect(() => {
    const loadDatabaseStructure = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // TODO: Replace with actual API call to fetch database structure
        // For now, using mock data
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Mock database structure
        const mockStructure: DatabaseStructure = {
          databases: [
            {
              name: "target_db",
              tables: [
                {
                  name: "users",
                  columns: [
                    { name: "id", type: "INT", nullable: false },
                    { name: "email", type: "VARCHAR(255)", nullable: false },
                    { name: "password", type: "VARCHAR(255)", nullable: false },
                    { name: "created_at", type: "TIMESTAMP", nullable: true },
                  ],
                },
                {
                  name: "orders",
                  columns: [
                    { name: "id", type: "INT", nullable: false },
                    { name: "user_id", type: "INT", nullable: false },
                    { name: "total", type: "DECIMAL(10,2)", nullable: false },
                    { name: "status", type: "VARCHAR(50)", nullable: false },
                    { name: "created_at", type: "TIMESTAMP", nullable: true },
                  ],
                },
                {
                  name: "products",
                  columns: [
                    { name: "id", type: "INT", nullable: false },
                    { name: "name", type: "VARCHAR(255)", nullable: false },
                    { name: "price", type: "DECIMAL(10,2)", nullable: false },
                    { name: "description", type: "TEXT", nullable: true },
                  ],
                },
              ],
            },
            {
              name: "information_schema",
              tables: [
                {
                  name: "tables",
                  columns: [
                    { name: "table_name", type: "VARCHAR(255)", nullable: false },
                    { name: "table_schema", type: "VARCHAR(255)", nullable: false },
                  ],
                },
              ],
            },
          ],
        }

        setDatabaseStructure(mockStructure)
      } catch (err) {
        console.error("Load database structure error:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to load database structure"
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    if (domain) {
      void loadDatabaseStructure()
    } else {
      setError("Domain parameter is required")
      setIsLoading(false)
    }
  }, [domain])


  const handleRefresh = async () => {
    // Keep dumpResults and savedColumns - don't clear them
    setSelectedDatabase(null)
    setSelectedTable(null)
    setSelectedColumns(new Set())
    setExpandedTables(new Set())
    setDatabaseStructure(null)
    setIsLoading(true)
    setError(null)

    // Reload database structure
    try {
      // TODO: Replace with actual API call to fetch database structure
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock database structure
      const mockStructure: DatabaseStructure = {
        databases: [
          {
            name: "target_db",
            tables: [
              {
                name: "users",
                columns: [
                  { name: "id", type: "INT", nullable: false },
                  { name: "email", type: "VARCHAR(255)", nullable: false },
                  { name: "password", type: "VARCHAR(255)", nullable: false },
                  { name: "created_at", type: "TIMESTAMP", nullable: true },
                ],
              },
              {
                name: "orders",
                columns: [
                  { name: "id", type: "INT", nullable: false },
                  { name: "user_id", type: "INT", nullable: false },
                  { name: "total", type: "DECIMAL(10,2)", nullable: false },
                  { name: "status", type: "VARCHAR(50)", nullable: false },
                  { name: "created_at", type: "TIMESTAMP", nullable: true },
                ],
              },
              {
                name: "products",
                columns: [
                  { name: "id", type: "INT", nullable: false },
                  { name: "name", type: "VARCHAR(255)", nullable: false },
                  { name: "price", type: "DECIMAL(10,2)", nullable: false },
                  { name: "description", type: "TEXT", nullable: true },
                ],
              },
            ],
          },
          {
            name: "information_schema",
            tables: [
              {
                name: "tables",
                columns: [
                  { name: "table_name", type: "VARCHAR(255)", nullable: false },
                  { name: "table_schema", type: "VARCHAR(255)", nullable: false },
                ],
              },
            ],
          },
        ],
      }

      setDatabaseStructure(mockStructure)
    } catch (err) {
      console.error("Refresh database structure error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh database structure"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleColumnSelection = (columnName: string) => {
    const newSelected = new Set(selectedColumns)
    if (newSelected.has(columnName)) {
      newSelected.delete(columnName)
    } else {
      newSelected.add(columnName)
    }
    setSelectedColumns(newSelected)
  }

  const toggleTableSelection = (tableName: string) => {
    if (!selectedDatabase || !databaseStructure) return
    const db = databaseStructure.databases.find((d) => d.name === selectedDatabase)
    const table = db?.tables.find((t) => t.name === tableName)
    if (!table) return

    const allSelected = table.columns.every((col) => selectedColumns.has(col.name))

    const newSelected = new Set(selectedColumns)
    table.columns.forEach((col) => {
      if (allSelected) {
        newSelected.delete(col.name)
      } else {
        newSelected.add(col.name)
      }
    })
    setSelectedColumns(newSelected)
  }

  const handleDump = async () => {
    if (!selectedDatabase || !selectedTable || selectedColumns.size === 0) {
      return
    }

      try {
      setIsDumping(true)
      setDumpResults([])
      setSavedColumns([])

      // TODO: Replace with actual API call
      // Simulate real-time data streaming
      const columnsArray = Array.from(selectedColumns)
      
      // Generate mock data rows
      const numRows = Math.floor(Math.random() * 10) + 1
      const newRows: Array<Record<string, string>> = []
      
      for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
        const row: Record<string, string> = {}
        columnsArray.forEach((column) => {
          if (column === "email") {
            row[column] = `user${rowIdx + 1}@example.com`
          } else if (column === "password") {
            row[column] = `password${rowIdx + 1}`
          } else if (column === "id") {
            row[column] = String(rowIdx + 1)
          } else if (column === "created_at") {
            row[column] = `2024-01-${String(rowIdx + 1).padStart(2, "0")} 12:00:00`
          } else {
            row[column] = `value_${column}_${rowIdx + 1}`
          }
        })
        newRows.push(row)
        
        // Simulate streaming - add rows one by one
        await new Promise((resolve) => setTimeout(resolve, 300))
        setDumpResults((prev) => {
          const updated = [...prev, row]
          // Save columns from first row
          if (updated.length === 1) {
            setSavedColumns(columnsArray)
          }
          return updated
        })
      }
    } catch (err) {
      console.error("Dump error:", err)
      toast({
        title: "Error",
        description: "Failed to dump data",
        variant: "destructive",
      })
    } finally {
      setIsDumping(false)
    }
  }

  const handleSaveToResults = async () => {
    if (dumpResults.length === 0) {
      toast({
        title: "No data",
        description: "No dump results to save",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/tasks/dump-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: params.id,
          domain,
          database: selectedDatabase,
          table: selectedTable,
          columns: savedColumns.length > 0 ? savedColumns : Array.from(selectedColumns),
          results: dumpResults,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save results")
      }

      toast({
        title: "Success",
        description: `Saved ${dumpResults.length} rows to results`,
      })
    } catch (err) {
      console.error("Save to results error:", err)
      toast({
        title: "Error",
        description: "Failed to save results",
        variant: "destructive",
      })
    }
  }


  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6 max-h-screen overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/tasks/${params.id}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Database Dumper</h1>
                <p className="text-sm text-muted-foreground">
                  {domain ? `Target: ${domain}` : "No domain specified"}
                  {selectedDatabase && ` | Database: ${selectedDatabase}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedDatabase && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDatabase(null)
                    setSelectedColumns(new Set())
                    setExpandedTables(new Set())
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {selectedDatabase && selectedColumns.size > 0 && (
                <Button
                  onClick={handleDump}
                  disabled={isDumping || selectedColumns.size === 0}
                  className="gap-2"
                >
                  <Download className={cn("h-4 w-4", isDumping && "animate-spin")} />
                  {isDumping ? "Dumping..." : `Dump (${selectedColumns.size})`}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {error && !databaseStructure && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="py-6 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Dump Results Table */}
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Dump Results</CardTitle>
                    {dumpResults.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({dumpResults.length} rows)
                      </span>
                    )}
                  </div>
                  {dumpResults.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToResults}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save to Results
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] overflow-y-auto">
                  {dumpResults.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {isDumping ? (
                        <div className="text-center space-y-2">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                          <p>Dumping data...</p>
                        </div>
                      ) : (
                        <p>No dump results yet. Select columns and click Dump to start.</p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-secondary/80 border-b border-border/60">
                          <tr>
                            {(() => {
                              // Use savedColumns if available, otherwise use selectedColumns
                              // If neither is available but we have dumpResults, extract from first row
                              let columnsToShow: string[] = []
                              if (savedColumns.length > 0) {
                                columnsToShow = savedColumns
                              } else if (selectedColumns.size > 0) {
                                columnsToShow = Array.from(selectedColumns)
                              } else if (dumpResults.length > 0) {
                                columnsToShow = Object.keys(dumpResults[0])
                              }
                              
                              return columnsToShow.map((column) => (
                                <th
                                  key={column}
                                  className="text-left py-2 px-3 font-medium text-foreground font-mono"
                                >
                                  {column}
                                </th>
                              ))
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {dumpResults.length === 0 ? (
                            <tr>
                              <td
                                colSpan={
                                  savedColumns.length > 0
                                    ? savedColumns.length
                                    : selectedColumns.size > 0
                                    ? selectedColumns.size
                                    : dumpResults.length > 0
                                    ? Object.keys(dumpResults[0]).length
                                    : 1
                                }
                                className="py-8 text-center text-muted-foreground"
                              >
                                {isDumping ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span>Dumping data...</span>
                                  </div>
                                ) : (
                                  "No data dumped yet"
                                )}
                              </td>
                            </tr>
                          ) : (
                            dumpResults.map((row, rowIndex) => {
                              // Determine which columns to show
                              let columnsToShow: string[] = []
                              if (savedColumns.length > 0) {
                                columnsToShow = savedColumns
                              } else if (selectedColumns.size > 0) {
                                columnsToShow = Array.from(selectedColumns)
                              } else {
                                columnsToShow = Object.keys(row)
                              }
                              
                              return (
                                <tr
                                  key={rowIndex}
                                  className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                                >
                                  {columnsToShow.map((column) => (
                                    <td
                                      key={column}
                                      className="py-2 px-3 font-mono text-foreground"
                                    >
                                      {row[column] || "-"}
                                    </td>
                                  ))}
                                </tr>
                              )
                            })
                          )}
                          {isDumping && dumpResults.length > 0 && (
                            <tr>
                              <td
                                colSpan={
                                  savedColumns.length > 0
                                    ? savedColumns.length
                                    : selectedColumns.size > 0
                                    ? selectedColumns.size
                                    : dumpResults.length > 0
                                    ? Object.keys(dumpResults[0]).length
                                    : 1
                                }
                                className="py-2 text-center text-muted-foreground"
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span>Dumping more data...</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Database Structure */}
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">
                    {selectedDatabase ? `Tables in ${selectedDatabase}` : "Databases"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] overflow-y-auto space-y-2">
                  {isLoading && !databaseStructure ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-2">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading database structure...</p>
                      </div>
                    </div>
                  ) : databaseStructure ? (
                    !selectedDatabase ? (
                      // Database selection view
                      databaseStructure.databases.map((db, dbIndex) => (
                        <button
                          key={dbIndex}
                          onClick={() => {
                            setSelectedDatabase(db.name)
                            setSelectedTable(null)
                            setSelectedColumns(new Set())
                            setExpandedTables(new Set())
                          }}
                          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                        >
                          <Database className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1">
                            <span className="font-semibold text-foreground">{db.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({db.tables.length} {db.tables.length === 1 ? "table" : "tables"})
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))
                    ) : !selectedTable ? (
                      // Table selection view
                      (() => {
                        const db = databaseStructure.databases.find((d) => d.name === selectedDatabase)
                        if (!db) return null

                        return (
                          <>
                            {db.tables.map((table, tableIndex) => (
                              <button
                                key={tableIndex}
                                onClick={() => {
                                  setSelectedTable(table.name)
                                  setSelectedColumns(new Set())
                                }}
                                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                              >
                                <Table className="h-5 w-5 text-primary shrink-0" />
                                <div className="flex-1">
                                  <span className="font-semibold text-foreground">{table.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({table.columns.length} {table.columns.length === 1 ? "column" : "columns"})
                                  </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              </button>
                            ))}
                          </>
                        )
                      })()
                    ) : (
                      // Column selection view
                      (() => {
                        const db = databaseStructure.databases.find((d) => d.name === selectedDatabase)
                        const table = db?.tables.find((t) => t.name === selectedTable)
                        if (!table) return null

                        const allColumnsSelected = table.columns.every((col) => selectedColumns.has(col.name))
                        const someColumnsSelected = table.columns.some((col) => selectedColumns.has(col.name))

                        return (
                          <>
                            <div className="mb-3 pb-3 border-b border-border/60">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-semibold text-foreground">{table.name}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    Select columns to dump
                                  </p>
                                </div>
                                <button
                                  onClick={() => toggleTableSelection(selectedTable)}
                                  className="p-2 hover:bg-secondary/60 rounded transition-colors"
                                  title={allColumnsSelected ? "Deselect all columns" : "Select all columns"}
                                >
                                  {allColumnsSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : someColumnsSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary/50" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {table.columns.map((column, columnIndex) => {
                                const isSelected = selectedColumns.has(column.name)
                                return (
                                  <button
                                    key={columnIndex}
                                    onClick={() => toggleColumnSelection(column.name)}
                                    className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded-lg border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                                    ) : (
                                      <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="font-mono text-foreground">{column.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )
                      })()
                    )
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No database structure available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

